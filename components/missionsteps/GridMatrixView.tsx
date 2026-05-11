'use client'

import { useState, useEffect, useCallback } from 'react';
import { PlayerVote } from "@/types/dbtypes";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

const GRID_SIZE = 4;

export default function GridMatrixView({
    missionData, teamId, playerId, currentStepIndex, votes, onComplete
}: {
    missionData: any,
    teamId: string,
    playerId: string,
    currentStepIndex: number,
    votes: PlayerVote[],
    onComplete: () => Promise<void>
}) {
    const [ grid, setGrid ] = useState<boolean[][]>([]);

    const hasRegisteredSuccess = votes.some(v => v.player_id === playerId);
    const minPlayers = missionData?.requirements?.min_players || 0;

    // generate a solvable puzzle by starting with all "off" and simulating a number of random "taps"
    const generatePuzzle = useCallback(() => {
        const newGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));

        // perform 10-15 random moves to scramble
        for (let i = 0; i < 12; i++) {
            const r = Math.floor(Math.random() * GRID_SIZE);
            const c = Math.floor(Math.random() * GRID_SIZE);
            // simulate a toggle logic
            toggleNodes(newGrid, r, c);
        }

        // ensure we didn't accidentally solve it during generation
        if (newGrid.every(row => row.every(cell => !cell))) {
            return generatePuzzle();
        }

        setGrid(newGrid);
    }, []);

    const toggleNodes = (targetGrid: boolean[][], r: number, c: number) => {
        const coords = [
            [0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]
        ];

        coords.forEach(([dr, dc]) => {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                targetGrid[nr][nc] = !targetGrid[nr][nc];
            }
        });
    };

    const handleNodeClick = (r: number, c: number) => {
        if (hasRegisteredSuccess) return;

        const nextGrid = grid.map(row => [...row]);
        toggleNodes(nextGrid, r, c);
        setGrid(nextGrid);

        // check for win (all false)
        if (nextGrid.every(row => row.every(cell => !cell))) {
            void handleRegisterSuccess();
        }
    };

    const handleRegisterSuccess = async () => {
        const { error } = await supabase.from('player_vote').insert({
            team_id: teamId,
            player_id: playerId,
            challenge_id: missionData.id,
            step: currentStepIndex,
            option_id: 'MATRIX_COMPLETE'
        });
    };

    useEffect(() => {
        if (!hasRegisteredSuccess) generatePuzzle();
    }, [generatePuzzle, hasRegisteredSuccess]);

    useEffect(() => {
        if (votes.length >= minPlayers && minPlayers > 0) {
            void onComplete();
        }
    }, [votes, minPlayers, onComplete]);

    return (
        <div className="bg-slate-950 p-6 rounded-xl border border-purple-900 font-mono shadow-2xl">
            <div className="text-center mb-6">
                <h3 className="text-purple-400 text-xs uppercase tracking-widest font-black">Matrix Decryption</h3>
                <p className="text-[9px] text-slate-500 uppercase mt-1">Neutralize all active nodes</p>
            </div>

            <div className={`grid grid-cols-4 gap-3 mb-8 max-w-[280px] mx-auto transition-opacity
                    ${hasRegisteredSuccess ? 'opacity-40' : 'opacity-100'}`}>
                {grid.map((row, r) => (
                    row.map((isActive, c) => (
                        <button
                            key={`${r}-${c}`}
                            onClick={() => handleNodeClick(r, c)}
                            disabled={hasRegisteredSuccess}
                            className={`aspect-square rounded-md border-2 transition-all duration-200 
                                ${isActive
                                ? 'bg-purple-600 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.6)]'
                                : 'bg-slate-900 border-slate-800'}`}
                        />
                    ))
                ))}
            </div>

            <div className="space-y-3">
                {!hasRegisteredSuccess && (
                    <button
                        onClick={generatePuzzle}
                        className="w-full py-2 text-[10px] text-purple-500 border border-purple-900/50 rounded
                            hover:bg-purple-900/20 uppercase"
                    >
                        Re-init Matrix
                    </button>
                )}

                <button
                    disabled={true}
                    className={`w-full py-3 border font-bold text-[10px] uppercase tracking-widest transition-all
                        ${hasRegisteredSuccess
                        ? 'bg-purple-900/30 border-purple-500 text-purple-400 animate-pulse'
                        : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                >
                    {hasRegisteredSuccess ? `WAITING FOR TEAM (${votes.length}/${minPlayers})` :
                        `SYSTEM LOCKED`}
                </button>
            </div>
        </div>
    );
}
