'use client'

import ConnectionStatus from "@/components/ConnectionStatus";
import DecisionView from "@/components/missionsteps/DecisionView";
import GridMatrixView from "@/components/missionsteps/GridMatrixView";
import KeypadView from "@/components/missionsteps/KeypadView";
import MastermindView from "@/components/missionsteps/MastermindView";
import PatternMemoryView from "@/components/missionsteps/PatternMemoryView";
import RotaryEnigmaView from "@/components/missionsteps/RotaryEnigmaView";
import SignalPathView from "@/components/missionsteps/SignalPathView";
import SliderPuzzleView from "@/components/missionsteps/SliderPuzzleView";
import Overlay, { OverlayProps } from "@/components/Overlay";
import { PlayerVote } from "@/types/dbtypes";
import { Mission, MissionStep } from "@/types/types";
import { createClient } from '@/utils/supabase/client'
import { RealtimeChannel } from "@supabase/realtime-js";
import { useEffect, useState, useCallback, useRef } from 'react'

const supabase = createClient()

// how often to reconcile with the database when realtime has nothing to say
const POLL_MS = 4000;

/** Votes only matter as a set, so compare by content rather than array identity. */
function sameVotes(a: PlayerVote[], b: PlayerVote[]): boolean {
    if (a.length !== b.length)
        return false;
    const key = (v: PlayerVote) => `${v.player_id}:${v.option_id}`;
    const left = a.map(key).sort();
    const right = b.map(key).sort();
    return left.every((k, i) => k === right[i]);
}

export default function MissionRunner({teamId, missionData, playerRole, initialStep, playerId, hasAssetValidator, onAbort, onTerminate}: {
    teamId: string,
    missionData: Mission,
    playerRole: string,
    initialStep: number,
    playerId: string,
    hasAssetValidator: boolean,
    onAbort: () => void,
    onTerminate: () => void
}) {
    const [ currentStepIndex, setCurrentStepIndex ] = useState(initialStep)
    const [ votes, setVotes ] = useState<PlayerVote[]>([]);
    const [ overlayProps, setOverlayProps ] = useState<OverlayProps | null>(null);
    const [ isConnected, setIsConnected ] = useState(false);

    // create a reference that always points to the latest state, and keep it in sync
    const stepRef = useRef(currentStepIndex);
    useEffect(() => {
        stepRef.current = currentStepIndex;
    }, [currentStepIndex]);

    const currentStep: MissionStep | undefined = missionData?.steps?.[currentStepIndex - 1];

    // refresh data
    const fetchVotesOnly = useCallback(async () => {
        const stepAtRequest = currentStepIndex;
        const {data} = await supabase
            .from('player_vote')
            .select('*')
            .eq('team_id', teamId)
            .eq('challenge_id', missionData.id)
            .eq('step', stepAtRequest);

        // a response that lands after the step moved on must be dropped: it holds
        // a full set of votes for the step we already left, and applying it would
        // read as "everyone voted" and advance us a second time
        if (stepAtRequest !== stepRef.current)
            return;

        // one vote per player. A retried insert after a lost response can leave two
        // rows for the same player, which would otherwise let a 3-player step
        // advance on 2 real voters, since every consumer just reads votes.length
        const rows = (data as PlayerVote[]) || [];
        const currentVotes = rows.filter(
            (row, i) => rows.findIndex(other => other.player_id === row.player_id) === i
        );

        // keep the previous array when the vote set is unchanged, so a poll tick
        // does not re-fire every effect that depends on `votes`
        setVotes(prev => sameVotes(prev, currentVotes) ? prev : currentVotes);
    }, [teamId, missionData.id, currentStepIndex]);

    // advance self
    const advanceMyStep = useCallback(async (targetStep?: number) => {
        const nextStep = targetStep ?? (stepRef.current + 1);
        if (!targetStep && nextStep <= stepRef.current)
            return;
        if (targetStep && targetStep <= stepRef.current)
            return;
        console.log(`🚀 DB WRITE: Advancing to step ${nextStep}`);
        const hasNextStep = missionData.steps.some(s => s.order === nextStep);
        const { error} = await supabase
            .from('player_challenge')
            .update(hasNextStep ? {current_step: nextStep} : {status: 'COMPLETED'})
            .eq('player_id', playerId)
            .eq('challenge_id', missionData.id);
        if (error) {
            console.log(error.message);
            return;
        }

        if (hasNextStep) {
            setCurrentStepIndex(nextStep);
            setVotes([]);
        } else {
            setOverlayProps({
                title: 'MISSION ACCOMPLISHED',
                message: 'Asset Secured. Transmission terminated.',
                type: 'SUCCESS',
                onClose: () => onTerminate()
            });
        }
    }, [missionData, playerId]);

    // manual Refresh on Step Change
    // This ensures that when the step moves forward, we immediately clear
    // the old votes and check for new ones for the current step.
    useEffect(() => {
        void fetchVotesOnly();
    }, [currentStepIndex, fetchVotesOnly]);

    // read the team's real progress from the database: catch up to whoever is
    // furthest ahead, and notice a failure even if we missed the realtime event
    const syncTeamProgress = useCallback(async () => {
        const { data } = await supabase
            .from('player_challenge')
            .select('current_step, status')
            .eq('team_id', teamId)
            .order('current_step', { ascending: false });
        if (!data || data.length === 0)
            return;

        if (data.some(row => row.status === 'FAILED')) {
            // `prev ?? ...` so a repeated poll cannot rebuild the overlay object
            setOverlayProps(prev => prev ?? {
                title: 'MISSION FAILED',
                message: 'An incorrect keypad code triggered the alarm!',
                type: 'ERROR',
                onClose: () => onTerminate()
            });
            return;
        }

        const furthestStep = data[0].current_step;
        if (furthestStep > stepRef.current) {
            console.log("🏃 Catching up to teammate at step:", furthestStep);
            await advanceMyStep(furthestStep);
        }
    }, [teamId, advanceMyStep, onTerminate]);

    // if teammate is a step ahead, let's catch up
    useEffect(() => {
        void syncTeamProgress();
    }, [currentStepIndex, syncTeamProgress]);

    // Polling floor. postgres_changes are never replayed, so an event that lands
    // while the socket is down is gone for good and this player would sit on
    // "waiting for teammates" until they reload. Realtime still drives the fast
    // path; this only picks up what the socket dropped.
    useEffect(() => {
        const tick = () => {
            if (document.hidden)
                return;
            void syncTeamProgress();
            void fetchVotesOnly();
        };

        const interval = setInterval(tick, POLL_MS);

        // a backgrounded phone is the likeliest way to miss an event, so reconcile
        // the moment the player returns instead of up to POLL_MS later
        const onVisibilityChange = () => {
            if (!document.hidden)
                tick();
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [syncTeamProgress, fetchVotesOnly]);

    // realtime stuff
    useEffect(() => {
        let isActive: boolean = true;
        let channel: RealtimeChannel | null = null;
        let retryTimer: ReturnType<typeof setTimeout> | null = null;
        // bumped per subscribe attempt, so a superseded channel's own status
        // callbacks (notably the CLOSED we cause by removing it) are ignored
        let generation = 0;

        // only one retry may be in flight, and never after teardown
        const scheduleRetry = () => {
            if (!isActive || retryTimer)
                return;
            console.log("Retrying subscription in 5s...");
            retryTimer = setTimeout(() => {
                retryTimer = null;
                void setupRealtime();
            }, 5000);
        };

        const setupRealtime = async () => {
            if (!isActive)
                return;
            const myGen = ++generation;

            // drop the previous channel first so retries don't stack up subscriptions
            if (channel) {
                const stale = channel;
                channel = null;
                await supabase.removeChannel(stale);
                if (!isActive || myGen !== generation)
                    return;
            }

            const channelName = `mission-runner-${teamId}-${Date.now()}`;
            channel = supabase.channel(channelName)

                // teammate challenge row changed; let's check for a failure status or a step advance
                .on('postgres_changes' as any,
                    { event: 'UPDATE', schema: 'public', table: 'player_challenge', filter: `team_id=eq.${teamId}` },
                    async (payload: any) => {
                        console.log("MISSION / UPDATE - REALTIME SIGNAL RECEIVED");
                        if (!isActive)
                            return;
                        if (payload.new.status === 'FAILED') {
                            setOverlayProps({
                                title: 'MISSION FAILED',
                                message: 'An incorrect keypad code triggered the alarm!',
                                type: 'ERROR',
                                onClose: () => onTerminate()
                            });
                        }
                        if (payload.new.current_step > stepRef.current)
                            await advanceMyStep(payload.new.current_step);
                    })

                // teammate challenge row deleted; mission was aborted by someone
                .on('postgres_changes' as any,
                    { event: 'DELETE', schema: 'public', table: 'player_challenge', filter: `player_id=eq.${playerId}` },
                    () => {
                        console.log("MISSION / DELETE - REALTIME SIGNAL RECEIVED");
                        if (!isActive) return;
                        setOverlayProps({
                            title: 'MISSION TERMINATED',
                            message: 'The mission has been terminated by an agent.',
                            type: 'INFO',
                            onClose: () => onTerminate()
                        });
                    })

                // teammate vote recorded; let's check if we have enough votes to proceed
                .on('postgres_changes' as any,
                    { event: 'INSERT', schema: 'public', table: 'player_vote', filter: `team_id=eq.${teamId}` },
                    async () => {
                        console.log("VOTES / INSERT - REALTIME SIGNAL RECEIVED");
                        if (!isActive)
                            return;
                        await fetchVotesOnly();
                    })

                // called when we subscribe to the channel
                .subscribe(status => {
                    console.log(`Realtime status (${channelName}):`, status);
                    if (!isActive || myGen !== generation)
                        return;
                    const isSubscribed = status === 'SUBSCRIBED';
                    setIsConnected(isSubscribed);
                    if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status))
                        scheduleRetry();
                });
        };

        void setupRealtime();
        return () => {
            // must flip before removeChannel: unsubscribing fires the status
            // callback with CLOSED, which would otherwise schedule a retry
            isActive = false;
            if (retryTimer)
                clearTimeout(retryTimer);
            if (channel)
                void supabase.removeChannel(channel);
        };
    }, [teamId, playerId, missionData.requirements.min_players, fetchVotesOnly]);

    if (!currentStep)
        return null;

    return (
        <div className="p-6 bg-black border border-blue-900 rounded-lg max-w-lg w-full">
            <h2 className="text-blue-400 font-mono">{missionData.title}</h2>
            <ConnectionStatus isActive={isConnected}/>

            <div className="mb-4 text-yellow-200 text-sm">
                <span className="block">{missionData.description}</span>
                <span className="text-xs">Step {currentStepIndex} of {missionData.steps.length}</span>
            </div>

            {currentStep.type === 'KEYPAD' && (
                <KeypadView
                    key={`keypad-${currentStepIndex}`}
                    currentStep={currentStep}
                    missionId={missionData.id}
                    playerId={playerId}
                    teamId={teamId}
                    playerRole={playerRole}
                    onSuccess={advanceMyStep}
                    onFailure={(props) => setOverlayProps(props)}
                    setOverlayProps={setOverlayProps}
                />
            )}

            {currentStep.type === 'DECISION' && (
                <DecisionView
                    key={`decision-${currentStepIndex}`}
                    missionData={missionData}
                    currentStep={currentStep}
                    currentStepIndex={currentStepIndex}
                    teamId={teamId}
                    playerId={playerId}
                    votes={votes}
                    hasAssetValidator={hasAssetValidator}
                    onComplete={advanceMyStep}
                />
            )}

            {currentStep.type === 'SIGNAL' && (
                <SignalPathView
                    key={`signal-${currentStepIndex}`}
                    onComplete={advanceMyStep}
                    puzzle={currentStep.config.puzzle}
                    votes={votes}
                    teamId={teamId}
                    missionData={missionData}
                    playerId={playerId}
                    currentStepIndex={currentStepIndex}
                />
            )}

            {currentStep.type === 'MEMORY' && (
                <PatternMemoryView
                    missionData={missionData}
                    teamId={teamId}
                    playerId={playerId}
                    currentStepIndex={currentStepIndex}
                    votes={votes}
                    onComplete={advanceMyStep}
                />
            )}

            {currentStep.type === 'MASTERMIND' && (
                <MastermindView
                    missionData={missionData}
                    teamId={teamId}
                    playerId={playerId}
                    currentStepIndex={currentStepIndex}
                    votes={votes}
                    onComplete={advanceMyStep}
                />
            )}

            {currentStep.type === 'MATRIX' && (
                <GridMatrixView
                    missionData={missionData}
                    teamId={teamId}
                    playerId={playerId}
                    currentStepIndex={currentStepIndex}
                    votes={votes}
                    onComplete={advanceMyStep}
                />
            )}

            {currentStep.type === 'SLIDER' && (
                <SliderPuzzleView
                    missionData={missionData}
                    teamId={teamId}
                    playerId={playerId}
                    currentStepIndex={currentStepIndex}
                    votes={votes}
                    onComplete={advanceMyStep}
                />
            )}

            {currentStep.type === 'ROTARY' && (
                <RotaryEnigmaView
                    missionData={missionData}
                    teamId={teamId}
                    playerId={playerId}
                    currentStepIndex={currentStepIndex}
                    votes={votes}
                    onComplete={advanceMyStep}
                />
            )}

            <div className="mt-4 text-right">
                <button
                    onClick={() => {
                        setOverlayProps({
                            title: 'CRITICAL WARNING',
                            message: 'ABORT MISSION? Connection for all team members will be severed.',
                            type: 'ERROR',
                            onConfirm: () => onAbort(),
                            onClose: () => setOverlayProps(null)
                        });
                    }}
                    className="text-red-400 text-xs uppercase underline"
                >
                    Abort Mission
                </button>
            </div>

            {overlayProps && <Overlay {...overlayProps} />}
        </div>
    );
}
