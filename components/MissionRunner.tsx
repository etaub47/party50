'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Mission } from "@/app/actions/getMission";
import Overlay from "@/components/Overlay";
import ConnectionStatus from "@/components/ConnectionStatus";
import { PlayerAttempt } from "@/types/dbtypes";

const supabase = createClient()

export default function MissionRunner({ teamId, missionData, playerRole, initialStep, playerId, onAbort }: {
    teamId: string,
    missionData: Mission,
    playerRole: string,
    initialStep: number,
    playerId: string,
    onAbort: () => void
}) {

    const [ currentStepIndex, setCurrentStepIndex ] = useState(initialStep)
    const [ code, setCode ] = useState('');
    const [ playerHint, setPlayerHint ] = useState<string | null>(null);
    const [ hasVoted, setHasVoted ] = useState(false);
    const [ votes, setVotes ] = useState<any[]>([]);
    const [ evictionMessage, setEvictionMessage ] = useState<string | null>(null);
    const [ localAttempts, setLocalAttempts ] = useState(0);
    const [ connectionStatus, setConnectionStatus ] =
        useState<{mission: boolean, votes: boolean}>({ mission: false, votes: false });

    if (!missionData || !missionData.steps) return null;
    const currentStep = missionData.steps[currentStepIndex - 1]
    const isFullyConnected = connectionStatus.mission && connectionStatus.votes;

    // fetch persistent attempts on mount/step change
    useEffect(() => {
        const getAttempts = async () => {
            const { data } = await supabase
                .from('player_attempt')
                .select('attempts_used')
                .eq('player_id', playerId)
                .eq('challenge_id', missionData.id)
                .maybeSingle();
            if (data)
                setLocalAttempts((data as PlayerAttempt).attempts_used);
        };
        if (currentStep.type === 'KEYPAD')
            void getAttempts();
    }, [currentStepIndex, missionData.id, playerId]);

    // listen for step updates from teammates in realtime
    useEffect(() => {
        let channel: any;
        const setupRealtime = async () => {
            if (channel)
                await supabase.removeChannel(channel);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session)
                return;

            const channelName = `mission-${teamId}-${Date.now()}`;
            channel = supabase
                .channel(channelName)
                .on(
                    'postgres_changes' as any,
                    { event: 'UPDATE', schema: 'public', table: 'player_challenge', filter: `team_id=eq.${teamId}` },
                    (payload: any) => {
                        if (payload.new.status == 'FAILED')
                            // TODO: we may also want to inform the player of the (bad) consequences
                            setEvictionMessage("Mission failed.")
                        else if (payload.new.status == 'COMPLETED')
                            // TODO: we may also want to inform the player of the (good) consequences
                            setEvictionMessage("Mission accomplished.")
                        else if (payload.new.current_step !== undefined)
                            setCurrentStepIndex(payload.new.current_step)
                    }
                )
                .on(
                    'postgres_changes' as any,
                    { event: 'DELETE', schema: 'public', table: 'player_challenge', filter: `player_id=eq.${playerId}` },
                    () => setEvictionMessage("The mission has been terminated by an agent.")
                )
                .subscribe((status: string) => {
                    console.log(`Realtime status (${channelName}):`, status);
                    const isActive = status === 'SUBSCRIBED';
                    setConnectionStatus(prev => ({ ...prev, mission: isActive }));
                    const isFailure = status === 'CHANNEL_ERROR' || status === 'TIMED_OUT';
                    if (isFailure) {
                        console.log("Retrying subscription in 2s...");
                        setTimeout(() => {
                            void setupRealtime();
                        }, 2000);
                    }
                });
        };

        void setupRealtime();

        return () => {
            if (channel) {
                console.log("Cleaning up channel:", channel.topic);
                void supabase.removeChannel(channel);
            }
        }
    }, [teamId])

    // listen for new votes from teammates in realtime
    useEffect(() => {
        let channel: any;
        const setupRealtime = async () => {
            if (channel)
                await supabase.removeChannel(channel);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session)
                return;

            const channelName = `votes-${teamId}-${Date.now()}`;
            channel = supabase
                .channel(channelName)
                .on(
                    'postgres_changes' as any,
                    { event: 'INSERT', schema: 'public', table: 'player_vote', filter: `team_id=eq.${teamId}` },
                    () => fetchVotes() // re-check win conditions when a vote is cast
                )
                .subscribe((status: string) => {
                    console.log(`Realtime status (${channelName}):`, status);
                    const isActive = status === 'SUBSCRIBED';
                    setConnectionStatus(prev => ({ ...prev, votes: isActive }));
                    const isFailure = status === 'CHANNEL_ERROR' || status === 'TIMED_OUT';
                    if (isFailure) {
                        console.log("Retrying subscription in 2s...");
                        setTimeout(() => {
                            void setupRealtime();
                        }, 2000);
                    }
                });
        };

        void fetchVotes();
        void setupRealtime();

        return () => {
            if (channel) {
                console.log("Cleaning up channel:", channel.topic);
                void supabase.removeChannel(channel);
            }
        }
    }, [currentStepIndex, teamId]);

    // each player on the team will receive a different hint
    useEffect(() => {
        const assignHint = async () => {
            if (currentStep.type !== 'KEYPAD' || !currentStep.config.hints) return;

            // fetch all teammates for this mission
            const { data: teammates } = await supabase
                .from('player_challenge')
                .select('player_id')
                .eq('team_id', teamId)
                .order('created_at', { ascending: true });

            // find this specific player's position in the team (0, 1, or 2)
            // assign the corresponding hint from the JSON
            if (teammates) {
                const myIndex = teammates.findIndex(t =>
                    t.player_id === playerId);
                const hint = currentStep.config.hints[myIndex] || "No intel available for your role.";
                setPlayerHint(hint);
            }
        };
        void assignHint();
    }, [currentStepIndex, teamId]); // Re-run if the step changes

    // check to make sure we have all the votes in
    const evaluateWinCondition = (currentVotes: any[]) => {
        const totalPlayers = 3; // Or dynamic from missionData.requirements
        const votingType = currentStep.config.voting;
        if (votingType === 'majority') {
            // Find if any option has > 50%
            const counts: Record<string, number> = {};
            currentVotes.forEach(v => counts[v.option_id] = (counts[v.option_id] || 0) + 1);
            const winner = Object.entries(counts).find(([_, count]) => count > totalPlayers / 2);
            if (winner) void advanceStep();
        } else if (votingType === 'individual') {
            // Everyone must vote (unanimity of participation)
            if (currentVotes.length >= totalPlayers) void advanceStep();
        }
    };

    // look up the latest votes
    const fetchVotes = async () => {
        const { data } = await supabase
            .from('player_vote')
            .select('id, challenge_id, team_id, player_id, step, option_id')
            .eq('team_id', teamId)
            .eq('step', currentStepIndex); // only count votes for the current step

        console.log(data);
        if (data) {
            setVotes(data);
            setHasVoted(data.some(v => v.player_id === playerId));
            evaluateWinCondition(data);
        }
    };

    // handles the current player voting
    const handleVote = async (optionId: string) => {
        setHasVoted(true);
        const { error } = await supabase
            .from('player_vote')
            .insert({
                team_id: teamId,
                player_id: playerId,
                challenge_id: missionData.id,
                step: currentStepIndex,
                option_id: optionId
            });
        if (error) {
            console.log(error);
            setHasVoted(false);
        } else {
            // manually trigger a fetch so the voter sees (1/3) immediately
            // without waiting for the Realtime round-trip
            await fetchVotes();
        }
    };

    // update DB so everyone advances in sync
    const advanceStep = async () => {
        setCode(''); // Clear the input field for the next possible step
        const nextStep = currentStepIndex + 1
        const hasNextStep = missionData.steps.some((s: any) => s.order === nextStep);
        if (hasNextStep) {
            await supabase
                .from('player_challenge')
                .update({ current_step: nextStep })
                .eq('team_id', teamId);
        } else {
            await supabase
                .from('player_challenge')
                .update({ status: 'COMPLETED' })
                .eq('team_id', teamId);
        }
    }

    // called when the player submits a keypad code
    const handleSubmitCode = async () => {

        // advance the mission step if the solution is correct
        if (code === currentStep.config.solution) {
            void advanceStep();
            return;
        }

        // handle failure
        const isHacker = playerRole === 'Hacker';
        const maxAllowed = isHacker ? 3 : 1;
        const nextAttemptCount = localAttempts + 1;

        // upsert the persistent attempt record and the local state variable
        await supabase
            .from('player_attempt')
            .upsert({
                player_id: playerId,
                challenge_id: missionData.id,
                attempts_used: nextAttemptCount
            }, { onConflict: 'player_id, challenge_id' });

        setLocalAttempts(nextAttemptCount);

        // determine if it's a total failure and burn the mission for the whole team
        if (nextAttemptCount >= maxAllowed) {
            await supabase
                .from('player_challenge')
                .update({ status: 'FAILED' })
                .eq('team_id', teamId);
        } else {
            // TODO: improve the UI here, maybe using the Overlay component
            alert(`ACCESS DENIED. Attempts remaining: ${maxAllowed - nextAttemptCount}`);
            setCode('');
        }
    };

    return (
        <div className="p-6 bg-black border border-blue-900 rounded-lg max-w-lg w-full">
            <h2 className="text-blue-400 font-mono">{missionData.title}</h2>
            <ConnectionStatus isActive={isFullyConnected} />
            <div className="mb-4 text-yellow-200 text-sm">
                <span className="block">{missionData.description}</span>
                <span className="text-xs">Step {currentStepIndex} of {missionData.steps.length}</span>
            </div>

            {currentStep.type === 'KEYPAD' && (
                <div className="space-y-6">

                    <div className="p-4 bg-blue-900/30 border border-blue-500/50 rounded text-blue-200 text-sm italic">
                        <span className="text-blue-500 font-bold block mb-1 uppercase text-xs">Intercepted Intel:</span>
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

                    <div className="p-4 bg-blue-900/30 border border-blue-500/50 rounded text-blue-200 text-sm italic">
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
                            <p className="text-blue-400 animate-pulse">
                                Vote Recorded. Waiting for teammates ({votes.length}/3)...
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
                        <div className="p-4 bg-blue-900/30 border border-blue-500/50 rounded text-blue-200 text-sm italic">
                            <span className="text-red-500 font-bold block mb-1 uppercase text-xs">Note:</span>
                            Each team member must choose separately, but the <b>MAJORITY</b> vote will determine the
                            outcome for your entire team.
                        </div>
                    )}

                    {missionData.requirements.min_players > 1 && currentStep.config.voting === 'individual' && (
                        <div className="p-4 bg-blue-900/30 border border-blue-500/50 rounded text-blue-200 text-sm italic">
                            <span className="text-red-500 font-bold block mb-1 uppercase text-xs">Note:</span>
                            This decision is individual and will <b>NOT</b> impact the other members of your team.
                            Poor decisions may have consequences.
                        </div>
                    )}

                </div>
            )}

            <div className="mt-2 border-red-400/50 pt-2 text-right">
                <button
                    onClick={onAbort}
                    className="text-red-400 hover:text-red-400 text-xs uppercase tracking-tighter"
                >
                    Abort Mission
                </button>
            </div>

            {evictionMessage && (
                <Overlay
                    title="CONNECTION TERMINATED"
                    message={evictionMessage}
                    type="INFO"
                    onClose={() => window.location.reload()}
                />
            )}
        </div>
    )
}
