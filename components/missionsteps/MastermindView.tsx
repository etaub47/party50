'use client'

import { Mission } from "@/app/actions/getMission";
import { useState, useEffect, useCallback } from 'react';
import { PlayerVote } from "@/types/dbtypes";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

type Guess = {
    digits: number[];
    greens: number;
    yellows: number;
};

export default function MastermindView({
    missionData, teamId, playerId, currentStepIndex, votes, onComplete
}: {
    missionData: Mission,
    teamId: string,
    playerId: string,
    currentStepIndex: number,
    votes: PlayerVote[],
    onComplete: () => Promise<void>
}) {
    const [ secret, setSecret ] = useState<number[]>([]);
    const [ currentGuess, setCurrentGuess ] = useState<number[]>([1, 1, 1, 1]);
    const [ history, setHistory ] = useState<Guess[]>([]);
    const [ isSubmitting, setIsSubmitting ] = useState(false);

    // 2x5 grid layout
    const maxGuesses = 10;
    const hasRegisteredSuccess = votes.some(v => v.player_id === playerId);
    const minPlayers = missionData?.requirements?.min_players || 0;

    const startNewGame = useCallback(() => {
        // generate secret code with digits 1-6
        const newSecret = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
        setSecret(newSecret);
        setHistory([]);
        setCurrentGuess([1, 1, 1, 1]);
    }, []);

    useEffect(() => {
        if (!hasRegisteredSuccess) startNewGame();
    }, [startNewGame, hasRegisteredSuccess]);

    useEffect(() => {
        if (votes.length >= minPlayers && minPlayers > 0) {
            void onComplete();
        }
    }, [votes, minPlayers, onComplete]);

    const handleRotateDigit = (idx: number) => {
        if (hasRegisteredSuccess) return;
        const next = [...currentGuess];
        // cycle 1-6
        next[idx] = next[idx] === 6 ? 1 : next[idx] + 1;
        setCurrentGuess(next);
    };

    const submitGuess = async () => {
        if (hasRegisteredSuccess || isSubmitting) return;

        let greens = 0;
        let yellows = 0;
        const secretCopy = [...secret];
        const guessCopy = [...currentGuess];

        // check for greens (correct number, correct position)
        for (let i = 0; i < 4; i++) {
            if (guessCopy[i] === secretCopy[i]) {
                greens++;
                secretCopy[i] = -1;
                guessCopy[i] = -2;
            }
        }

        // check for yellows (correct number, wrong position)
        for (let i = 0; i < 4; i++) {
            if (guessCopy[i] < 0) continue;
            const foundIdx = secretCopy.indexOf(guessCopy[i]);
            if (foundIdx !== -1) {
                yellows++;
                secretCopy[foundIdx] = -1;
            }
        }

        const newGuess: Guess = { digits: currentGuess, greens, yellows };
        const newHistory = [...history, newGuess];
        setHistory(newHistory);

        if (greens === 4) {
            await handleRegisterSuccess();
        } else if (newHistory.length >= maxGuesses) {
            // failed; auto-restart with new code
            startNewGame();
        }
    };

    const handleRegisterSuccess = async () => {
        setIsSubmitting(true);
        const { error } = await supabase.from('player_vote').insert({
            team_id: teamId,
            player_id: playerId,
            challenge_id: missionData.id,
            step: currentStepIndex,
            option_id: 'MASTERMIND_COMPLETE'
        });
        if (error) setIsSubmitting(false);
    };

    return (
        <div className="bg-slate-950 p-4 rounded-xl border border-blue-900 font-mono shadow-2xl">
            <div className="text-center mb-4">
                <h3 className="text-blue-400 text-xs uppercase tracking-widest font-black">Encryption Breaker</h3>
                <p className="text-[9px] text-slate-500 uppercase mt-1">Brute-force required for bypass</p>
            </div>

            {/* input section */}
            <div className="flex justify-center gap-2 mb-6 items-center">
                {currentGuess.map((digit, i) => (
                    <button
                        key={i}
                        onClick={() => handleRotateDigit(i)}
                        disabled={hasRegisteredSuccess}
                        className="w-12 h-12 rounded bg-slate-900 border-2 border-blue-500 text-xl font-bold text-white
                            shadow-[0_0_10px_rgba(59,130,246,0.3)] active:bg-blue-800 transition-colors"
                    >
                        {digit}
                    </button>
                ))}
                <button
                    onClick={submitGuess}
                    disabled={hasRegisteredSuccess || history.length >= maxGuesses}
                    className="ml-1 w-12 h-12 bg-blue-600 rounded text-white font-bold active:scale-95 disabled:opacity-30 disabled:bg-slate-800 transition-all"
                >
                    ↵
                </button>
            </div>

            {/* 2-column history grid (5 rows each) */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-6">
                {Array.from({ length: maxGuesses }).map((_, i) => {
                    const g = history[i];
                    return (
                        <div key={i} className={`flex items-center justify-between p-2 rounded border h-10 transition-colors 
                            ${g ? 'border-slate-700 bg-slate-900/80' : 'border-slate-800/30 bg-black/20'}`}>

                            {/* attempted digits */}
                            <div className="flex gap-1">
                                {g ? g.digits.map((d, j) => (
                                    <span key={j} className="text-[11px] text-blue-300 w-2.5 text-center font-bold">{d}</span>
                                )) : <span className="text-slate-800 text-[11px] tracking-tighter">----</span>}
                            </div>

                            {/* ambiguous feedback pegs */}
                            <div className="grid grid-cols-2 gap-1 mr-1">
                                {g && Array.from({ length: 4 }).map((_, j) => {
                                    let color = 'bg-slate-800';
                                    if (j < g.greens) color = 'bg-emerald-500 shadow-[0_0_4px_#10b981]';
                                    else if (j < g.greens + g.yellows) color = 'bg-yellow-500 shadow-[0_0_4px_#eab308]';
                                    return <div key={j} className={`w-2 h-2 rounded-full ${color}`} />;
                                })}
                            </div>

                            {/*
                            <div className="flex gap-0.5 ml-1">
                                {g && Array.from({ length: 4 }).map((_, j) => {
                                    let color = 'bg-slate-800';
                                    if (j < g.greens) color = 'bg-emerald-500 shadow-[0_0_4px_#10b981]';
                                    else if (j < g.greens + g.yellows) color = 'bg-yellow-500 shadow-[0_0_4px_#eab308]';
                                    return <div key={j} className={`w-2 h-2 rounded-full ${color}`} />;
                                })}
                            </div>
                            */}
                        </div>
                    );
                })}
            </div>

            {/* status footer */}
            <button
                disabled={true}
                className={`w-full py-3 border font-bold text-[10px] uppercase tracking-widest transition-all
                    ${hasRegisteredSuccess
                    ? 'bg-blue-900/30 border-emerald-500 text-emerald-400 animate-pulse'
                    : 'bg-slate-900 border-slate-700 text-slate-500'}`}
            >
                {hasRegisteredSuccess ? `WAITING FOR TEAM (${votes.length}/${minPlayers})` :
                    `${maxGuesses - history.length} INJECTION ATTEMPTS LEFT`}
            </button>
        </div>
    );
}
