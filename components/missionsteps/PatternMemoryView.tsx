'use client'

import { Mission } from "@/app/actions/getMission";
import { useState, useEffect, useCallback } from 'react';
import { PlayerVote } from "@/types/dbtypes";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

const COLORS = [
    'bg-red-500 shadow-[0_0_20px_#ef4444]',
    'bg-blue-500 shadow-[0_0_20px_#3b82f6]',
    'bg-yellow-500 shadow-[0_0_20px_#eab308]',
    'bg-emerald-500 shadow-[0_0_20px_#10b981]'
];

const DIM_COLORS = [
    'bg-red-900/40 border-red-900',
    'bg-blue-900/40 border-blue-900',
    'bg-yellow-900/40 border-yellow-900',
    'bg-emerald-900/40 border-emerald-900'
];

export default function PatternMemoryView({
    missionData, teamId, playerId, currentStepIndex, votes, onComplete
}: {
    missionData: Mission,
    teamId: string,
    playerId: string,
    currentStepIndex: number,
    votes: PlayerVote[],
    onComplete: () => Promise<void>
}) {
    const [sequence, setSequence] = useState<number[]>([]);
    const [userSequence, setUserSequence] = useState<number[]>([]);
    const [activeQuadrant, setActiveQuadrant] = useState<number | null>(null);
    const [isPlayback, setIsPlayback] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const targetLength = 9;
    const hasRegisteredSuccess = votes.some(v => v.player_id === playerId);
    const minPlayers = missionData.requirements.min_players;

    // Effect: Watch for Team Completion
    useEffect(() => {
        if (votes.length >= minPlayers && minPlayers > 0) {
            void onComplete();
        }
    }, [votes, minPlayers, onComplete]);

    // Start a new game
    const startNewGame = useCallback(() => {
        const firstMove = Math.floor(Math.random() * 4);
        setSequence([firstMove]);
        setUserSequence([]);
        void playPattern([firstMove]);
    }, []);

    useEffect(() => {
        if (!hasRegisteredSuccess) startNewGame();
    }, [startNewGame, hasRegisteredSuccess]);

    // Playback the pattern to the user
    const playPattern = async (pattern: number[]) => {
        setIsPlayback(true);
        for (let i = 0; i < pattern.length; i++) {
            await new Promise(r => setTimeout(r, 300));
            setActiveQuadrant(pattern[i]);
            await new Promise(r => setTimeout(r, 500));
            setActiveQuadrant(null);
        }
        setIsPlayback(false);
    };

    const handleQuadrantClick = async (idx: number) => {
        if (isPlayback || hasRegisteredSuccess || isSubmitting) return;

        // visual feedback
        setActiveQuadrant(idx);
        setTimeout(() => setActiveQuadrant(null), 200);

        const nextUserSeq = [...userSequence, idx];

        // Check if correct
        if (idx !== sequence[userSequence.length]) {
            // failure: reset game
            startNewGame();
            return;
        }

        if (nextUserSeq.length === sequence.length) {
            if (nextUserSeq.length === targetLength) {
                // success: final step reached
                await handleRegisterSuccess();
            } else {
                // round complete: Add one more to sequence
                const nextMove = Math.floor(Math.random() * 4);
                const nextSeq = [...sequence, nextMove];
                setSequence(nextSeq);
                setUserSequence([]);
                setTimeout(() => playPattern(nextSeq), 800);
            }
        } else {
            setUserSequence(nextUserSeq);
        }
    };

    const handleRegisterSuccess = async () => {
        setIsSubmitting(true);
        const { error } = await supabase.from('player_vote').insert({
            team_id: teamId,
            player_id: playerId,
            challenge_id: missionData.id,
            step: currentStepIndex,
            option_id: 'PATTERN_COMPLETE'
        });
        if (error) setIsSubmitting(false);
    };

    return (
        <div className="bg-slate-950 p-6 rounded-xl border border-blue-900 font-mono text-center">
            <div className="mb-4">
                <h3 className="text-blue-400 text-xs uppercase tracking-widest">Uplink Synchronization</h3>
                <p className="text-[10px] text-slate-500">Repeat sequence to verify identity</p>
            </div>

            {/* the "simon" grid */}
            <div className="grid grid-cols-2 gap-4 aspect-square max-w-[280px] mx-auto p-4 bg-black rounded-full border-8 border-slate-900 shadow-xl">
                {[0, 1, 2, 3].map((idx) => (
                    <button
                        key={idx}
                        onClick={() => handleQuadrantClick(idx)}
                        disabled={isPlayback || hasRegisteredSuccess}
                        className={`w-full aspect-square transition-all duration-150 border-4 border-black
                            ${idx === 0 ? 'rounded-tl-[100%] rounded-tr-sm rounded-bl-sm rounded-br-sm' : ''}
                            ${idx === 1 ? 'rounded-tr-[100%] rounded-tl-sm rounded-bl-sm rounded-br-sm' : ''}
                            ${idx === 2 ? 'rounded-bl-[100%] rounded-tl-sm rounded-tr-sm rounded-br-sm' : ''}
                            ${idx === 3 ? 'rounded-br-[100%] rounded-tl-sm rounded-tr-sm rounded-bl-sm' : ''}
                            ${activeQuadrant === idx ? COLORS[idx] : DIM_COLORS[idx]}
                            ${isPlayback ? 'cursor-default' : 'active:scale-95 cursor-pointer'}
        `               }
                    />
                ))}
            </div>

            <div className="mt-6 space-y-2">
                <div className="text-xs text-blue-300">
                    Progress: {hasRegisteredSuccess ? targetLength : sequence.length} / {targetLength}
                </div>

                <button
                    disabled={true}
                    className={`w-full py-3 border font-bold text-xs uppercase tracking-widest transition-all
                        ${hasRegisteredSuccess
                        ? 'bg-blue-900/30 border-blue-500/50 text-blue-400 animate-pulse'
                        : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                >
                    {hasRegisteredSuccess ? `WAITING FOR TEAM (${votes.length}/${minPlayers})` :
                        "AWAITING VERIFICATION"}
                </button>
            </div>
        </div>
    );
}
