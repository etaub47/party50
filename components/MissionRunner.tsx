'use client'

import { Mission, Option } from "@/app/actions/getMission";
import { processStepConsequences } from "@/app/actions/processConsequences";
import ConnectionStatus from "@/components/ConnectionStatus";
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
    const [currentStepIndex, setCurrentStepIndex] = useState(initialStep)
    const [code, setCode] = useState('');
    const [playerHint, setPlayerHint] = useState<string | null>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [votes, setVotes] = useState<PlayerVote[]>([]);
    const [overlayProps, setOverlayProps] = useState<OverlayProps | null>(null);
    const [localAttempts, setLocalAttempts] = useState(0);
    const [isConnected, setIsConnected] = useState(false);

    const currentStep = missionData?.steps?.[currentStepIndex - 1];
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
        setHasVoted(currentVotes.some(v => v.player_id === playerId));
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
            setHasVoted(false);
            setVotes([]);
            setCode('');
        } else {
            setOverlayProps({
                title: 'MISSION ACCOMPLISHED',
                message: 'Asset Secured. Transmission terminated.',
                type: 'SUCCESS',
                onClose: () => window.location.reload()
            });
        }
    }, [currentStepIndex, missionData, playerId]);

    // do we have enough votes to advance?
    const evaluateWinCondition = useCallback(async (currentVotes: PlayerVote[]) => {
        const totalRequired = missionData.requirements.min_players;
        if (currentVotes.length < totalRequired) return;

        const votingType = currentStep!.config.voting;
        let selectedOption: Option | undefined;

        if (votingType === 'majority') {
            const counts: Record<string, number> = {};
            currentVotes.forEach(v => counts[v.option_id] = (counts[v.option_id] || 0) + 1);
            const winnerId = Object.entries(counts).find(([_, count]) =>
                count > totalRequired / 2)?.[0];
            selectedOption = currentStep!.config.options!.find(o => o.id === winnerId);
        } else {
            const myVote = currentVotes.find(v => v.player_id === playerId);
            selectedOption = currentStep!.config.options!.find(o => o.id === myVote?.option_id);
        }

        if (selectedOption) {
            console.log("DEBUG: Selected Option Found:", selectedOption);
            await processStepConsequences({
                playerId: playerId,
                challengeId: missionData.id,
                stepIndex: currentStepIndex,
                eventId: selectedOption.event_id,
                itemId: selectedOption.item_id
            });
            await advanceMyStep();
        }
    }, [currentStep, missionData, currentStepIndex, playerId, advanceMyStep]);

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
    }, []); //[teamId, currentStepIndex, advanceMyStep]);

    // realtime stuff
    useEffect(() => {
        const channelName = `mission-runner-${teamId}-${playerId}-${Date.now()}`;
        let isActive: boolean = true;
        let channel: RealtimeChannel;

        const setupRealtime = () => {
            channel = supabase.channel(channelName)

                // teammate challenge row changed; let's check for a failure status or a step advance
                .on('postgres_changes' as any,
                    {event: 'UPDATE', schema: 'public', table: 'player_challenge', filter: `team_id=eq.${teamId}`},
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
                    {
                        event: 'DELETE',
                        schema: 'public',
                        table: 'player_challenge',
                        filter: `player_id=eq.${playerId}`
                    },
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
                    {event: 'INSERT', schema: 'public', table: 'player_vote', filter: `team_id=eq.${teamId}`},
                    async () => {
                        console.log("VOTES / INSERT - REALTIME SIGNAL RECEIVED");
                        if (!isActive) return;
                        const latest = await fetchVotesOnly();
                        if (latest.length >= missionData.requirements.min_players)
                            void evaluateWinCondition(latest);
                    })

                // called when we subscribe to the channel
                .subscribe(status => {
                    console.log("MISSION / SUBSCRIBE - STATUS: " + status);
                    if (!isActive) return;
                    const isSubscribed = status === 'SUBSCRIBED';
                    setIsConnected(isSubscribed);
                    if (!isSubscribed && !isRetryingRef.current) {
                        isRetryingRef.current = true;
                        console.log("Mission Link unstable. Attempting reconnection in 5s...");
                        setTimeout(() => {
                            if (isActive) {
                                isRetryingRef.current = false;
                                setupRealtime();
                            }
                        }, 5000);
                    }
                });
        };

        void setupRealtime();
        return () => {
            isActive = false;
            if (channel) {
                void channel.unsubscribe();
                void supabase.removeChannel(channel);
            }
        };
    }, [teamId, playerId, missionData.requirements.min_players, fetchVotesOnly, evaluateWinCondition]);

    // set the number of attempts locally (hacker only)
    useEffect(() => {
        if (currentStep?.type === 'KEYPAD') {
            const getAttempts = async () => {
                const {data} = await supabase.from('player_attempt')
                    .select('attempts_used')
                    .eq('player_id', playerId).eq('challenge_id', missionData.id)
                    .maybeSingle();
                if (data)
                    setLocalAttempts(data.attempts_used);
            };
            void getAttempts();
        }
    }, [currentStepIndex, missionData.id, playerId, currentStep?.type]);

    // each player on the team will receive a different hint
    useEffect(() => {
        const assignHint = async () => {
            if (currentStep?.type !== 'KEYPAD' || !currentStep.config.hints) return;
            const {data: teammates} = await supabase.from('player_challenge')
                .select('player_id')
                .eq('team_id', teamId)
                .order('created_at', {ascending: true});
            if (teammates) {
                const myIndex = teammates.findIndex(t => t.player_id === playerId);
                setPlayerHint(currentStep.config.hints[myIndex] || "No intel available.");
            }
        };
        void assignHint();
    }, [currentStepIndex, teamId, playerId, currentStep]);

    // handles the current player voting
    const handleVote = async (optionId: string) => {
        setHasVoted(true);
        const {error} = await supabase.from('player_vote').insert({
            team_id: teamId, player_id: playerId, challenge_id: missionData.id,
            step: currentStepIndex, option_id: optionId
        });
        if (error) {
            console.error(error);
            setHasVoted(false);
        }
    };

    // called when the player submits a keypad code
    const handleSubmitCode = async () => {
        if (code === currentStep!.config.solution) {
            await advanceMyStep();
            return;
        }
        const maxAllowed = playerRole === 'Hacker' ? 3 : 1;
        const nextCount = localAttempts + 1;
        await supabase.from('player_attempt').upsert(
            {player_id: playerId, challenge_id: missionData.id, attempts_used: nextCount},
            {onConflict: 'player_id, challenge_id'});
        setLocalAttempts(nextCount);

        if (nextCount >= maxAllowed) {
            await supabase.from('player_challenge').update({status: 'FAILED'}).eq('team_id', teamId);
        } else {
            setCode('');
            setOverlayProps({
                title: 'ACCESS DENIED',
                message: `Attempts remaining: ${maxAllowed - nextCount}`,
                type: 'INFO',
                onClose: () => setOverlayProps(null)
            });
        }
    };

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
                <div className="space-y-6">
                    <div
                        className="p-4 bg-blue-900/30 border border-blue-500/50 rounded text-blue-200 text-sm italic">
                            <span
                                className="text-blue-500 font-bold block mb-1 uppercase text-xs">Intercepted Intel:</span>
                        "{playerHint || 'Decrypting hint...'}"
                    </div>
                    <div className="space-y-2">
                        <p className="text-white text-center">Enter the code:</p>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="bg-gray-900 text-green-500 border border-green-900 p-2 w-full text-center text-2xl"
                            maxLength={4}
                        />
                        <button
                            onClick={() => handleSubmitCode()}
                            className="w-full bg-blue-800 hover:bg-blue-700 text-white font-bold py-3 rounded uppercase tracking-widest text-sm"
                        >
                            Submit Code
                        </button>
                    </div>

                    <div
                        className="p-4 bg-blue-900/30 border border-blue-500/50 rounded text-blue-200 text-sm italic">
                        <span className="text-red-500 font-bold block mb-1 uppercase text-xs">Warning:</span>
                        Only the first code entered by <b>ANY</b> member of the team will be accepted. You
                        have <b>ONE</b> chance to enter the correct code, or you will fail the mission.
                        (Hackers get three attempts instead of one.)
                    </div>
                </div>
            )}

            {currentStep.type === 'DECISION' && (
                <div className="space-y-4">
                    <p className="text-white italic text-lg">{currentStep.config.instruction}</p>
                    {hasVoted ? (
                        <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded text-center">
                            <p className="text-blue-400 animate-pulse">Waiting for teammates
                                ({votes.length}/{missionData.requirements.min_players})...
                            </p>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            {currentStep.config.options?.map((opt: any) => (
                                <button
                                    key={opt.id}
                                    onClick={() => handleVote(opt.id)}
                                    className="flex-1 bg-blue-900 hover:bg-blue-700 text-white py-2 rounded"
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {missionData.requirements.min_players > 1 && currentStep.config.voting === 'majority' && (
                        <div
                            className="p-4 bg-blue-900/30 border border-blue-500/50 rounded text-blue-200 text-sm italic">
                            <span className="text-red-500 font-bold block mb-1 uppercase text-xs">Note:</span>
                            Each team member must choose separately, but the <b>MAJORITY</b> vote will determine the
                            outcome for your entire team.
                        </div>
                    )}

                    {missionData.requirements.min_players > 1 && currentStep.config.voting === 'individual' && (
                        <div
                            className="p-4 bg-blue-900/30 border border-blue-500/50 rounded text-blue-200 text-sm italic">
                            <span className="text-red-500 font-bold block mb-1 uppercase text-xs">Note:</span>
                            This decision is individual and will <b>NOT</b> impact the other members of your team.
                            Poor decisions may have consequences.
                        </div>
                    )}

                </div>
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
