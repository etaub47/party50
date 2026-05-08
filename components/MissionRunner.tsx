'use client'

import { Mission, MissionStep } from "@/app/actions/getMission";
import ConnectionStatus from "@/components/ConnectionStatus";
import DecisionView from "@/components/missionsteps/DecisionView";
import KeypadView from "@/components/missionsteps/KeypadView";
import PatternMemoryView from "@/components/missionsteps/PatternMemoryView";
import SignalPathView from "@/components/missionsteps/SignalPathView";
import Overlay, { OverlayProps } from "@/components/Overlay";
import { PlayerVote } from "@/types/dbtypes";
import { createClient } from '@/utils/supabase/client'
import { RealtimeChannel } from "@supabase/realtime-js";
import { memo, useEffect, useState, useCallback, useRef, JSX } from 'react'

const supabase = createClient()

const MissionRunner: ({teamId, missionData, playerRole, initialStep, playerId, onAbort}: {
    teamId: string;
    missionData: Mission;
    playerRole: string;
    initialStep: number;
    playerId: string;
    onAbort: () => void
}) => (null | JSX.Element) = ({ teamId, missionData, playerRole, initialStep, playerId, onAbort }) => {
    const [ currentStepIndex, setCurrentStepIndex ] = useState(initialStep)
    const [ votes, setVotes ] = useState<PlayerVote[]>([]);
    const [ overlayProps, setOverlayProps ] = useState<OverlayProps | null>(null);
    const [ isConnected, setIsConnected ] = useState(false);

    const currentStep: MissionStep | undefined = missionData?.steps?.[currentStepIndex - 1];
    const isRetryingRef = useRef(false);

    // refresh data
    const fetchVotesOnly = useCallback(async () => {
        const {data} = await supabase
            .from('player_vote')
            .select('*')
            .eq('team_id', teamId)
            .eq('challenge_id', missionData.id)
            .eq('step', currentStepIndex);

        const currentVotes = (data as PlayerVote[]) || [];
        setVotes(currentVotes);
        return currentVotes;
    }, [teamId, missionData.id, currentStepIndex, playerId]);

    // advance self
    const advanceMyStep = useCallback(async (targetStep?: number) => {
        const nextStep = targetStep ?? (currentStepIndex + 1);
        if (nextStep <= currentStepIndex && !targetStep)
            return;
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
                onClose: () => window.location.reload()
            });
        }
    }, [currentStepIndex, missionData, playerId]);

    // manual Refresh on Step Change
    // This ensures that when the step moves forward, we immediately clear
    // the old votes and check for new ones for the current step.
    useEffect(() => {
        void fetchVotesOnly();
    }, [currentStepIndex, fetchVotesOnly]);

    // if teammate is a step ahead, let's catch up
    useEffect(() => {
        const checkTeammates = async () => {
            const { data } = await supabase
                .from('player_challenge')
                .select('current_step')
                .eq('team_id', teamId)
                .gt('current_step', currentStepIndex)
                .order('current_step', { ascending: false })
                .limit(1);
            if (data && data.length > 0)
                await advanceMyStep(data[0].current_step);
        };
        void checkTeammates();
    }, []);

    // realtime stuff
    useEffect(() => {
        const channelName = `mission-runner-${teamId}-${playerId}-${Date.now()}`;
        let isActive: boolean = true;
        let channel: RealtimeChannel;

        const setupRealtime = () => {
            channel = supabase.channel(channelName)

                // teammate challenge row changed; let's check for a failure status or a step advance
                .on('postgres_changes' as any,
                    { event: 'UPDATE', schema: 'public', table: 'player_challenge', filter: `team_id=eq.${teamId}` },
                    async (payload: any) => {
                        console.log("MISSION / UPDATE - REALTIME SIGNAL RECEIVED");
                        if (!isActive) return;
                        if (payload.new.status === 'FAILED') {
                            setOverlayProps({
                                title: 'MISSION FAILED',
                                message: 'An incorrect keypad code triggered the alarm!',
                                type: 'ERROR',
                                onClose: () => window.location.reload()
                            });
                        }
                        if (payload.new.current_step > currentStepIndex)
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
                            onClose: () => window.location.reload()
                        });
                    })

                // teammate vote recorded; let's check if we have enough votes to proceed
                .on('postgres_changes' as any,
                    { event: 'INSERT', schema: 'public', table: 'player_vote', filter: `team_id=eq.${teamId}` },
                    async () => {
                        console.log("VOTES / INSERT - REALTIME SIGNAL RECEIVED");
                        if (!isActive)
                            return;
                        const latest = await fetchVotesOnly();
                        setVotes(latest);
                    })

                // called when we subscribe to the channel
                .subscribe(status => {
                    console.log("MISSION / SUBSCRIBE - STATUS: " + status);
                    const isSubscribed = status === 'SUBSCRIBED';
                    setIsConnected(isSubscribed);
                    if (!isSubscribed && !isRetryingRef.current) {
                        isRetryingRef.current = true;
                        console.log("Mission Link unstable. Attempting reconnection in 5s...");
                        setTimeout(() => {
                            void setupRealtime();
                        }, 5000);
                    }
                });
        };

        void setupRealtime();
        return () => {
            if (channel) {
                void supabase.removeChannel(channel);
            }
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

            <div className="mt-4 text-right">
                <button
                    onClick={onAbort}
                    className="text-red-400 text-xs uppercase underline"
                >
                    Abort Mission
                </button>
            </div>

            {overlayProps && <Overlay {...overlayProps} />}
        </div>
    );
}

export default memo(MissionRunner);
