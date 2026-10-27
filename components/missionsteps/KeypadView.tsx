'use client'

import { MissionStep } from "@/types/types";
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { OverlayProps } from "@/components/Overlay";
import { submitKeypadCode } from "@/app/actions/submitKeypadCode";

const supabase = createClient();

export default function KeypadView({ currentStep, playerId, teamId, onSuccess, onFailure, setOverlayProps
}: {
    currentStep: MissionStep;
    playerId: string;
    teamId: string;
    onSuccess: () => Promise<void>;
    onFailure: (props: OverlayProps) => void;
    setOverlayProps: (props: OverlayProps | null) => void;
}) {
    const [ code, setCode ] = useState('');
    const [ isSubmitting, setIsSubmitting ] = useState(false);
    const [ playerHint, setPlayerHint ] = useState<string | null>(null);

    useEffect(() => {
        let isActive = true;

        const initializeKeypad = async () => {

            // fetch team lineup to determine this player's specific hint; our own
            // row may not be visible yet while the team is starting, so retry a
            // few times rather than reading hints[-1]
            if (currentStep.config.hints) {
                for (let tries = 0; tries < 3 && isActive; tries++) {
                    const { data: teammates } = await supabase
                        .from('player_challenge')
                        .select('player_id')
                        .eq('team_id', teamId)
                        .order('created_at', { ascending: true });
                    const myIndex = teammates?.findIndex(t => t.player_id === playerId) ?? -1;
                    if (myIndex >= 0) {
                        if (isActive)
                            setPlayerHint(currentStep.config.hints[myIndex] || "No intel available.");
                        return;
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                if (isActive)
                    setPlayerHint("No intel available.");
            }
        };

        void initializeKeypad();
        return () => {
            isActive = false;
        };
    }, [teamId, playerId, currentStep]);

    // user has submitted a code on the keypad
    const handleSubmitCode = async () => {

        // avoid double submit
        if (isSubmitting)
            return;
        setIsSubmitting(true);

        // the solution never reaches the browser; the server checks the code, counts
        // the attempt against this player's stored role, and fails the team if
        // that was the last one (teammates pick that up from the FAILED status)
        const outcome = await submitKeypadCode(teamId, code)
            .catch((): { result: 'ERROR', error: string } => ({ result: 'ERROR', error: 'Connection lost.' }));

        if (outcome.result === 'CORRECT') {
            await onSuccess();
        } else if (outcome.result === 'WRONG') {
            setCode('');
            onFailure({
                title: 'ACCESS DENIED',
                message: `Attempts remaining: ${outcome.attemptsRemaining}`,
                type: 'INFO',
                onClose: () => setOverlayProps(null)
            });
        } else if (outcome.result === 'ERROR') {
            onFailure({
                title: 'TRANSMISSION ERROR',
                message: `${outcome.error} Try again.`,
                type: 'ERROR',
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
