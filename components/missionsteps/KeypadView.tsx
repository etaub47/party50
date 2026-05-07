'use client'

import { useState, useEffect } from 'react';
import { MissionStep } from "@/app/actions/getMission";
import { createClient } from '@/utils/supabase/client';
import { OverlayProps } from "@/components/Overlay";

const supabase = createClient();

export default function KeypadView({ currentStep, missionId, playerId, teamId, playerRole, onSuccess,
                                     onFailure, setOverlayProps
}: {
    currentStep: MissionStep;
    missionId: string;
    playerId: string;
    teamId: string;
    playerRole: string;
    onSuccess: () => Promise<void>;
    onFailure: (props: OverlayProps) => void;
    setOverlayProps: (props: OverlayProps | null) => void;
}) {
    const [ code, setCode ] = useState('');
    const [ localAttempts, setLocalAttempts ] = useState(0);
    const [ isSubmitting, setIsSubmitting ] = useState(false);
    const [ playerHint, setPlayerHint ] = useState<string | null>(null);

    useEffect(() => {
        const initializeKeypad = async () => {

            // fetch historical attempts
            const { data: attemptData } = await supabase
                .from('player_attempt')
                .select('attempts_used')
                .eq('player_id', playerId)
                .eq('challenge_id', missionId)
                .maybeSingle();
            if (attemptData)
                setLocalAttempts(attemptData.attempts_used);

            // fetch team lineup to determine this player's specific hint
            if (currentStep.config.hints) {
                const { data: teammates } = await supabase
                    .from('player_challenge')
                    .select('player_id')
                    .eq('team_id', teamId)
                    .order('created_at', { ascending: true });
                if (teammates) {
                    const myIndex = teammates.findIndex(t => t.player_id === playerId);
                    setPlayerHint(currentStep.config.hints[myIndex] || "No intel available.");
                }
            }
        };

        void initializeKeypad();
    }, [missionId, teamId, playerId, currentStep]);

    // user has submitted a code on the keypad
    const handleSubmitCode = async () => {

        // avoid double submit
        if (isSubmitting)
            return;
        setIsSubmitting(true);

        // success Check
        if (code === currentStep.config.solution) {
            await onSuccess();
            setIsSubmitting(false);
            return;
        }

        // failure Path
        const maxAllowed = playerRole === 'Hacker' ? 3 : 1;
        const nextCount = localAttempts + 1;
        await supabase.from('player_attempt').upsert(
            { player_id: playerId, challenge_id: missionId, attempts_used: nextCount },
            { onConflict: 'player_id, challenge_id' }
        );

        // failure differs if the player is a hacker
        setLocalAttempts(nextCount);
        if (nextCount >= maxAllowed) {
            await supabase.from('player_challenge').update({ status: 'FAILED' }).eq('team_id', teamId);
        } else {
            setCode('');
            onFailure({
                title: 'ACCESS DENIED',
                message: `Attempts remaining: ${maxAllowed - nextCount}`,
                type: 'INFO',
                onClose: () => setOverlayProps(null)
            });
        }
        setIsSubmitting(false);
    };

    return (
        <div className="space-y-6">
            <div className="p-4 bg-blue-900/30 border border-blue-500/50 rounded text-blue-200 text-sm italic">
                <span className="text-blue-500 font-bold block mb-1 uppercase text-xs">Intercepted Intel:</span>
                "{playerHint || 'Decrypting hint...'}"
            </div>

            <div className="space-y-2">
                <p className="text-white text-center font-mono text-xs uppercase tracking-widest text-slate-400">
                    Enter the authorization key:
                </p>
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="bg-gray-950 text-green-500 border border-green-900 p-2 w-full text-center text-3xl font-mono tracking-[1rem] focus:border-green-400 outline-none"
                    maxLength={4}
                    disabled={isSubmitting}
                />
                <button
                    onClick={handleSubmitCode}
                    disabled={isSubmitting || code.length < 4}
                    className="w-full bg-blue-800 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded uppercase tracking-widest text-sm transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                >
                    {isSubmitting ? 'Verifying...' : 'Submit Code'}
                </button>
            </div>

            <div className="p-4 bg-blue-900/30 border border-blue-500/50 rounded text-blue-200 text-sm italic">
                <span className="text-red-500 font-bold block mb-1 uppercase text-xs">Note:</span>
                Only the first code entered by <b>ANY</b> member of the team will be accepted. You
                have <b>ONE</b> chance to enter the correct code, or you will fail the mission.
                (Hackers get three attempts instead of one.)
            </div>
        </div>
    );
}
