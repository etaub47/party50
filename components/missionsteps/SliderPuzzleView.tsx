'use client'

import { useState, useEffect, useCallback } from 'react';
import { PlayerVote } from "@/types/dbtypes";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export default function SliderPuzzleView({
    missionData, teamId, playerId, currentStepIndex, votes, onComplete
}: {
    missionData: any,
    teamId: string,
    playerId: string,
    currentStepIndex: number,
    votes: PlayerVote[],
    onComplete: () => Promise<void>
}) {
    const [ grid, setGrid ] = useState<number[]>([]);
    const [ isSubmitting, setIsSubmitting ] = useState(false);
    const [ isSolved, setIsSolved ] = useState(false);

    // pull base hue and label type from mission config or use defaults
    const config = missionData.steps[currentStepIndex - 1]?.config || {};
    const baseHue = config.baseHue || 200; // default blue-ish
    const labelType = config.label || 'LETTER'

    const hasRegisteredSuccess = votes.some(v => v.player_id === playerId);
    const minPlayers = missionData?.requirements?.min_players || 0;

    const generatePuzzle = useCallback(() => {
        let newGrid = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];
        let emptyIdx = 15;
        for (let i = 0; i < 120; i++) {
            const neighbors = getNeighbors(emptyIdx);
            const moveIdx = neighbors[Math.floor(Math.random() * neighbors.length)];
            [newGrid[emptyIdx], newGrid[moveIdx]] = [newGrid[moveIdx], newGrid[emptyIdx]];
            emptyIdx = moveIdx;
        }
        setGrid(newGrid);
    }, []);

    function getNeighbors(idx: number) {
        const neighbors = [];
        const r = Math.floor(idx / 4);
        const c = idx % 4;
        if (r > 0) neighbors.push(idx - 4);
        if (r < 3) neighbors.push(idx + 4);
        if (c > 0) neighbors.push(idx - 1);
        if (c < 3) neighbors.push(idx + 1);
        return neighbors;
    }

    const handleTileClick = (idx: number) => {
        if (hasRegisteredSuccess) return;
        const emptyIdx = grid.indexOf(0);
        const neighbors = getNeighbors(emptyIdx);

        if (neighbors.includes(idx)) {
            const nextGrid = [...grid];
            [nextGrid[emptyIdx], nextGrid[idx]] = [nextGrid[idx], nextGrid[emptyIdx]];
            setGrid(nextGrid);
            if (nextGrid.slice(0, 15).every((val, i) => val === i + 1)) {
                void setIsSolved(true);
            }
        }
    };

    const handleRegisterSuccess = async () => {
        if (isSubmitting || hasRegisteredSuccess)
            return;

        setIsSubmitting(true);
        const { error } = await supabase.from('player_vote').insert({
            team_id: teamId,
            player_id: playerId,
            challenge_id: missionData.id,
            step: currentStepIndex,
            option_id: 'DEFRAG_COMPLETE'
        });
        if (error) {
            console.log(error.message);
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (!hasRegisteredSuccess) generatePuzzle();
    }, [generatePuzzle, hasRegisteredSuccess]);

    // watch for team completion; if the total votes equal the required players, move on!
    useEffect(() => {
        if (votes.length >= minPlayers && minPlayers > 0)
            void onComplete();
    }, [votes, minPlayers, onComplete]);

    // helper to format the label
    const formatLabel = (val: number) => {
        if (labelType === 'LETTER')
            return String.fromCharCode(64 + val);
        return val;
    };

    return (
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 font-mono shadow-2xl">
            <div className="text-center mb-6">
                <h3 className="text-blue-400 text-xs uppercase tracking-widest font-black">
                    Access Code Realignment
                </h3>
                <p className="text-[9px] text-slate-300 uppercase mt-1">
                    Realign memory sectors to gain access
                </p>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-8 max-w-[320px] mx-auto aspect-square p-2 bg-black/40 rounded-lg">
                {grid.map((value, idx) => {
                    if (value === 0) return <div key={idx} className="w-full aspect-square" />;

                    const isCorrect = value === idx + 1;

                    // the Hue is tied to the value, ensuring the gradient exists in both scrambled and solved states.
                    const hueShift = (value / 16) * 60;
                    const hue = baseHue + hueShift;

                    // background is identical for both states to maintain gradient integrity
                    const tileBg = `hsl(${hue}, 60%, 25%)`;

                    // border is subdued when wrong, glowing neon when correct
                    const tileBorder = isCorrect
                        ? `hsl(${hue}, 100%, 50%)`  // vivid neon "match"
                        : `hsl(${hue}, 30%, 15%)`;  // dark "unlocked" border

                    // text is faint/grey when wrong, crisp white when correct
                    const tileText = isCorrect
                        ? `hsl(${hue}, 100%, 95%)`  // bright white-ish
                        : `hsl(${hue}, 20%, 50%)`;  // dimmed/muted

                    return (
                        <button
                            key={idx}
                            onClick={() => handleTileClick(idx)}
                            disabled={hasRegisteredSuccess}
                            style={{
                                backgroundColor: tileBg,
                                borderColor: tileBorder,
                                color: tileText,
                            }}
                            className={`w-full aspect-square rounded-lg border-2 text-2xl font-black transition-all duration-300
                                ${isCorrect ? 'shadow-[0_0_15px_rgba(255,255,255,0.1)] z-10' : 'shadow-none z-0'}
                                ${hasRegisteredSuccess ? 'opacity-50' : 'hover:brightness-125 active:scale-95'}
                            `}
                        >
                            {formatLabel(value)}
                        </button>
                    );
                })}
            </div>

            <div className="space-y-3">
                <button
                    onClick={handleRegisterSuccess}
                    disabled={!isSolved || hasRegisteredSuccess || isSubmitting}
                    className={`w-full py-3 border rounded font-bold text-[10px] uppercase tracking-widest transition-all
                    ${(isSolved && !hasRegisteredSuccess) ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' :
                        hasRegisteredSuccess ? 'bg-blue-900/30 border-blue-500/50 text-blue-400 animate-pulse' :
                            'bg-slate-900 border-slate-700 text-slate-500'}`}
                >
                    {!isSolved && !hasRegisteredSuccess && "ALIGNMENT REQUIRED"}
                    {isSolved && isSubmitting && !hasRegisteredSuccess && "UPLOADING BYPASS..."}
                    {isSolved && !hasRegisteredSuccess && !isSubmitting && "CONFIRM BYPASS"}
                    {hasRegisteredSuccess && `WAITING FOR TEAM (${votes.length}/${missionData.requirements.min_players})`}
                </button>
            </div>
        </div>
    );
}
