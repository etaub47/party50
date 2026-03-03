'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Mission } from "@/app/actions/getMission";

const supabase = createClient()

export default function MissionRunner({ teamId, missionData, playerRole, initialStep, playerId }: {
    teamId: string,
    missionData: Mission,
    playerRole: string,
    initialStep: number,
    playerId: string
}) {
    const [currentStepIndex, setCurrentStepIndex] = useState(initialStep)
    const [status, setStatus] = useState('ACTIVE')
    const [code, setCode] = useState('');
    const [playerHint, setPlayerHint] = useState<string | null>(null);

    if (!missionData || !missionData.steps) return null;
    const currentStep = missionData.steps[currentStepIndex - 1]

    // listen for step updates from teammates
    useEffect(() => {
        let channel: any;

        const setupRealtime = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session)
                return;

            // create a unique name for this specific mount instance
            const channelName = `mission-${teamId}-${Date.now()}`;

            channel = supabase
                .channel(channelName)
                .on(
                    'postgres_changes' as any,
                    { event: 'UPDATE', schema: 'public', table: 'player_challenge', filter: `team_id=eq.${teamId}` },
                    (payload: any) => {
                        if (payload.new.current_step !== undefined) {
                            setCurrentStepIndex(payload.new.current_step)
                        }
                    }
                )
                .subscribe((status: string) => {
                    console.log(`Realtime status (${channelName}):`, status);
                    if (status === 'CHANNEL_ERROR') {
                        console.log("Retrying subscription in 1s...");
                        setTimeout(setupRealtime, 1000);
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

    // each player on the team will receive a different hint
    useEffect(() => {
        const assignHint = async () => {
            if (currentStep.type !== 'KEYPAD' || !currentStep.config.hints) return;

            // Fetch all teammates for this mission
            const { data: teammates } = await supabase
                .from('player_challenge')
                .select('player_id')
                .eq('team_id', teamId)
                .order('created_at', { ascending: true });

            if (teammates) {
                // Find this specific player's position in the team (0, 1, or 2)
                const myIndex = teammates.findIndex(t => t.player_id === playerId);

                // Assign the corresponding hint from the JSON
                const hint = currentStep.config.hints[myIndex] || "No intel available for your role.";
                setPlayerHint(hint);
            }
        };
        void assignHint();
    }, [currentStepIndex, teamId]); // Re-run if the step changes

    // update DB so everyone advances in sync
    const advanceStep = async () => {
        const nextStep = currentStepIndex + 1
        const hasNextStep = missionData.steps.some((s: any) => s.order === nextStep);
        if (hasNextStep) {
            const { error } = await supabase
                .from('player_challenge')
                .update({ current_step: nextStep })
                .eq('team_id', teamId);
            if (error)
                console.error("Advancement failed:", error.message);
        } else {
            setStatus('COMPLETED')
        }
    }

    if (status === 'COMPLETED')
        return <div className="text-green-400">Mission Accomplished</div>

    return (
        <div className="p-6 bg-black border border-blue-900 rounded-lg max-w-lg w-full">
            <h2 className="text-blue-400 font-mono mb-2">{missionData.title}</h2>
            <h3 className="text-white font-mono text-sm mb-4">Step {currentStepIndex}</h3>

            {currentStep.type === 'KEYPAD' && (
                <div className="space-y-6">

                    <div className="p-4 bg-blue-900/30 border border-blue-500/50 rounded text-blue-200 text-sm italic">
                        <span className="text-blue-500 font-bold block mb-1 uppercase text-xs">Intercepted Intel:</span>
                        "{playerHint || 'Decrypting hint...'}"
                    </div>

                    <div className="space-y-2">
                        <p className="text-white text-center">Enter the bypass code:</p>
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
                            onClick={() => {
                                if (code === currentStep.config.solution)
                                    void advanceStep();
                                else
                                    alert("ACCESS DENIED");
                            }}
                            className="w-full bg-blue-800 hover:bg-blue-700 text-white font-bold py-3 rounded uppercase tracking-widest text-sm"
                        >
                            Submit Code
                        </button>
                    </div>

                    <div className="p-4 bg-blue-900/30 border border-blue-500/50 rounded text-blue-200 text-sm italic">
                        <span className="text-red-500 font-bold block mb-1 uppercase text-xs">Warning:</span>
                        Only the first code entered by <b>ANY</b> member of the team will be accepted. You have
                        only <b>ONE</b> chance to enter the correct code, or you will fail the mission. Good luck!
                    </div>

                </div>
            )}

            {currentStep.type === 'DECISION' && (
                <div className="space-y-4">
                    <p className="text-white italic">"{currentStep.config.instruction}"</p>
                    <div className="flex gap-2">
                        {currentStep.config.options?.map((opt: any) => (
                            <button
                                key={opt.id}
                                onClick={advanceStep}
                                className="flex-1 bg-blue-900 hover:bg-blue-700 text-white py-2 rounded"
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
