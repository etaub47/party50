'use client'

import { useState, useEffect, useCallback } from 'react';
import { PlayerVote } from "@/types/dbtypes";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

// 3x3 board: tiles 1..8 plus the blank (0). Solved = [1..8, 0].
const SIZE = 3;
const CELLS = SIZE * SIZE;

// Scramble acceptance rules. Manhattan distance is a lower bound on the moves
// needed, so MIN_MANHATTAN guarantees the start is at least that many moves
// from solved. Checked against all 181,440 solvable states: accepted starts
// need 12-31 optimal moves (average ~22.7). MAX_TILES_IN_PLACE stops a start
// that already shows several glowing "correct" tiles.
const MIN_MANHATTAN = 12;
const MAX_TILES_IN_PLACE = 2;

function getNeighbors(idx: number) {
    const neighbors = [];
    const r = Math.floor(idx / SIZE);
    const c = idx % SIZE;
    if (r > 0) neighbors.push(idx - SIZE);
    if (r < SIZE - 1) neighbors.push(idx + SIZE);
    if (c > 0) neighbors.push(idx - 1);
    if (c < SIZE - 1) neighbors.push(idx + 1);
    return neighbors;
}

// On an odd-width board a layout is solvable iff its tile inversion count is even.
function isSolvable(grid: number[]) {
    const tiles = grid.filter(v => v !== 0);
    let inversions = 0;
    for (let i = 0; i < tiles.length; i++)
        for (let j = i + 1; j < tiles.length; j++)
            if (tiles[i] > tiles[j]) inversions++;
    return inversions % 2 === 0;
}

function manhattanDistance(grid: number[]) {
    let total = 0;
    grid.forEach((val, idx) => {
        if (val === 0) return;
        const goal = val - 1;
        total += Math.abs(Math.floor(idx / SIZE) - Math.floor(goal / SIZE))
            + Math.abs((idx % SIZE) - (goal % SIZE));
    });
    return total;
}

function tilesInPlace(grid: number[]) {
    return grid.filter((val, idx) => val !== 0 && val === idx + 1).length;
}

function isSolvedGrid(grid: number[]) {
    return grid.slice(0, CELLS - 1).every((val, i) => val === i + 1);
}

// Uniformly random solvable layout, re-rolled until it meets the scramble rules
// (~60% of layouts pass, so this takes a couple of tries on average).
function generateScrambledGrid(): number[] {
    while (true) {
        const grid = Array.from({ length: CELLS }, (_, i) => (i + 1) % CELLS);
        for (let i = grid.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [grid[i], grid[j]] = [grid[j], grid[i]];
        }
        if (isSolvable(grid)
            && manhattanDistance(grid) >= MIN_MANHATTAN
            && tilesInPlace(grid) <= MAX_TILES_IN_PLACE)
            return grid;
    }
}

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
    const requiredPlayers = missionData?.requirements?.required_players || 0;

    const generatePuzzle = useCallback(() => {
        setGrid(generateScrambledGrid());
        setIsSolved(false);
    }, []);

    const handleTileClick = (idx: number) => {
        if (hasRegisteredSuccess) return;
        const emptyIdx = grid.indexOf(0);
        const neighbors = getNeighbors(emptyIdx);

        if (neighbors.includes(idx)) {
            const nextGrid = [...grid];
            [nextGrid[emptyIdx], nextGrid[idx]] = [nextGrid[idx], nextGrid[emptyIdx]];
            setGrid(nextGrid);
            if (isSolvedGrid(nextGrid)) {
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
        if (votes.length >= requiredPlayers && requiredPlayers > 0)
            void onComplete();
    }, [votes, requiredPlayers, onComplete]);

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

            <div className="grid grid-cols-3 gap-2 mb-8 max-w-[320px] mx-auto aspect-square p-2 bg-black/40 rounded-lg">
                {grid.map((value, idx) => {
                    if (value === 0) return <div key={idx} className="w-full aspect-square" />;

                    const isCorrect = value === idx + 1;

                    // the Hue is tied to the value, ensuring the gradient exists in both scrambled and solved states.
                    const hueShift = (value / CELLS) * 60;
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
                    {hasRegisteredSuccess && `WAITING FOR TEAM (${votes.length}/${missionData.requirements.required_players})`}
                </button>
            </div>
        </div>
    );
}
