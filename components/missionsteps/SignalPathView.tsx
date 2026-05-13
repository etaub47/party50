'use client'

import { PlayerVote } from "@/types/dbtypes";
import { Mission } from "@/types/types";
import { createClient } from "@/utils/supabase/client";
import { useState, useEffect, useCallback } from 'react';

type TileType = 'I' | 'L';
type Tile = { type: TileType, rotation: number };

const supabase = createClient()

export default function SignalPathView({
    onComplete, puzzle, votes, teamId, missionData, playerId, currentStepIndex
}: {
    onComplete: () => Promise<void>,
    puzzle: number | undefined,
    votes: PlayerVote[],
    teamId: string,
    missionData: Mission,
    playerId: string,
    currentStepIndex: number
}) {
    const [ grid, setGrid ] = useState<Tile[]>([]);
    const [ isSubmitting, setIsSubmitting ] = useState(false);
    const [ isSolved, setIsSolved ] = useState(false);

    const hasRegisteredSuccess = votes.some(v => v.player_id === playerId);
    const minPlayers = missionData?.requirements?.min_players || 0;
    const size = 5;

    const LEVEL_DATA: TileType[][] = [
        [
            'L', 'I', 'L', 'L', 'L',
            'L', 'I', 'I', 'I', 'L',
            'L', 'I', 'L', 'L', 'L',
            'I', 'I', 'I', 'L', 'I',
            'L', 'I', 'I', 'I', 'L'
        ],
        [
            'I', 'L', 'L', 'I', 'L',
            'L', 'L', 'L', 'I', 'L',
            'L', 'L', 'I', 'L', 'L',
            'L', 'I', 'I', 'L', 'I',
            'L', 'I', 'I', 'I', 'I'
        ],
        [
            'L', 'I', 'I', 'I', 'L',
            'I', 'L', 'L', 'I', 'L',
            'L', 'I', 'L', 'I', 'L',
            'I', 'I', 'L', 'L', 'I',
            'L', 'I', 'L', 'L', 'L'
        ],
        [
            'L', 'L', 'I', 'L', 'L',
            'L', 'L', 'I', 'L', 'I',
            'I', 'I', 'L', 'L', 'I',
            'I', 'I', 'I', 'I', 'L',
            'L', 'I', 'L', 'L', 'L'
        ],
        [
            'L', 'L', 'I', 'L', 'L',
            'I', 'L', 'L', 'I', 'I',
            'I', 'I', 'L', 'L', 'I',
            'L', 'I', 'I', 'L', 'L',
            'L', 'I', 'I', 'I', 'L'
        ]
    ];

    // initialize with a hardcoded solvable path, then randomize rotations
    useEffect(() => {
        const levelIdx = puzzle ?? 0;
        const layout: TileType[] = LEVEL_DATA[levelIdx] || LEVEL_DATA[0];
        const initialGrid = layout.map(type => ({
            type,
            rotation: Math.floor(Math.random() * 4)
        }));
        setGrid(initialGrid);
    }, [puzzle]);

    // watch for team completion
    // if the total votes for this step match the required players, move on!
    useEffect(() => {
        if (votes.length >= minPlayers && minPlayers > 0)
            void onComplete();
    }, [votes, missionData, onComplete]);

    // Returns which directions (N, E, S, W) a tile is open to based on its type and rotation
    const getConnections = (tile: Tile) => {
        const { type, rotation } = tile;
        const base = type === 'I' ? [0, 2] : [0, 1];
        return base.map(dir => (dir + rotation) % 4);
    };

    const checkPath = useCallback((currentGrid: Tile[]) => {
        if (currentGrid.length === 0) return false;

        const visited = new Set<number>();
        const queue = [0]; // Start at top-left

        // the entry point must be open to the North (direction 0) to connect to the "INCOMING" stub
        if (!getConnections(currentGrid[0]).includes(0)) return false;

        while (queue.length > 0) {
            const idx = queue.shift()!;
            if (visited.has(idx)) continue;
            visited.add(idx);

            const x = idx % size;
            const y = Math.floor(idx / size);
            const connections = getConnections(currentGrid[idx]);

            // if we are at the bottom-right, and it's open to the South (direction 2) to the "UPLINK"
            if (x === 4 && y === 4 && connections.includes(2)) return true;

            // check neighbors: 0=N, 1=E, 2=S, 3=W
            connections.forEach(dir => {
                let nx = x, ny = y;
                if (dir === 0) ny--;
                else if (dir === 1) nx++;
                else if (dir === 2) ny++;
                else if (dir === 3) nx--;

                const nIdx = ny * size + nx;
                if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                    const neighborConnections = getConnections(currentGrid[nIdx]);
                    const oppositeDir = (dir + 2) % 4;
                    // connection only exists if neighbor is open toward this tile
                    if (neighborConnections.includes(oppositeDir)) {
                        queue.push(nIdx);
                    }
                }
            });
        }
        return false;
    }, []);

    const rotate = (idx: number) => {
        if (isSolved) return;
        const newGrid = [...grid];
        newGrid[idx].rotation = (newGrid[idx].rotation + 1) % 4;
        setGrid(newGrid);
        if (checkPath(newGrid))
            setIsSolved(true);
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
            option_id: 'SIGNAL_COMPLETE'
        });

        if (error) {
            console.error(error.message);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-slate-950 p-4 rounded-xl border border-blue-900 font-mono relative">
            <div className="flex flex-col items-center">

                <div className="relative p-1">
                    <div className="grid grid-cols-5 gap-1 aspect-square w-[300px] bg-slate-900/50 p-1 rounded-lg border border-slate-800">
                        {grid.map((tile, i) => (
                            <button
                                key={i}
                                onClick={() => rotate(i)}
                                className={`relative w-full h-full border border-slate-800 rounded flex items-center justify-center transition-all ${isSolved ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-950 active:bg-blue-900'}`}
                            >
                                {/* entry stub */}
                                {i === 0 && (
                                    <div className="absolute top-[-25px] left-1/2 -translate-x-1/2 w-1 h-6 bg-blue-500 shadow-[0_0_8px_#3b82f6] z-10" />
                                )}

                                {/* the pipes */}
                                <div className="relative w-full h-full transition-transform duration-200" style={{ transform: `rotate(${tile.rotation * 90}deg)` }}>
                                    <div className={`absolute bg-blue-400 left-1/2 -translate-x-1/2 w-1 h-1/2 top-0 ${isSolved ? 'bg-emerald-400' : ''}`} />
                                    <div className={`absolute bg-blue-400 ${isSolved ? 'bg-emerald-400' : ''}`} style={{
                                        width: tile.type === 'I' ? '4px' : '50%', height: tile.type === 'I' ? '50%' : '4px',
                                        left: '50%', top: '50%', transform: tile.type === 'I' ? 'translateX(-50%)' : 'translateY(-50%)'
                                    }} />
                                </div>

                                {/* exit stub */}
                                {i === 24 && (
                                    <div className="absolute bottom-[-25px] left-1/2 -translate-x-1/2 w-1 h-6 bg-blue-500 shadow-[0_0_8px_#3b82f6] z-10" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleRegisterSuccess}
                    disabled={!isSolved || hasRegisteredSuccess || isSubmitting}
                    className={`mt-10 w-full py-3 border font-bold text-xs uppercase tracking-widest transition-all 
                        ${(isSolved && !hasRegisteredSuccess) ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' :
                        hasRegisteredSuccess ? 'bg-blue-900/30 border-blue-500/50 text-blue-400 animate-pulse' :
                            'bg-slate-900 border-slate-700 text-slate-500'}`}
                >
                    {!isSolved && !hasRegisteredSuccess && "SIGNAL INTERRUPTED"}
                    {isSolved && isSubmitting && !hasRegisteredSuccess && "UPLOADING BYPASS..."}
                    {isSolved && !hasRegisteredSuccess && !isSubmitting && "CONFIRM BYPASS"}
                    {hasRegisteredSuccess && `WAITING FOR TEAM (${votes.length}/${missionData.requirements.min_players})`}
                </button>
            </div>
        </div>
    );
}
