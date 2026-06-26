'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PlayerVote } from "@/types/dbtypes";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

// Multipliers are now based on degrees per second for precise browser normalization
const RING_CONFIGS = [
    { id: 0, speed: 180, direction: 1, name: 'Outer Core Ring', color: '#3b82f6', size: 'w-64 h-64' },
    { id: 1, speed: 240, direction: -1, name: 'Vector Relay Ring', color: '#a855f7', size: 'w-52 h-52' },
    { id: 2, speed: 300, direction: 1, name: 'Mainframe Intercept', color: '#06b6d4', size: 'w-40 h-40' },
    { id: 3, speed: 360, direction: -1, name: 'Sub-Sector Gate', color: '#f59e0b', size: 'w-28 h-28' },
    { id: 4, speed: 420, direction: 1, name: 'Kernel Node Ring', color: '#ec4899', size: 'w-16 h-16' },
];

const HIT_TOLERANCE = 14;

export default function RotaryEnigmaView({
    missionData, teamId, playerId, currentStepIndex, votes, onComplete
}: {
    missionData: any,
    teamId: string,
    playerId: string,
    currentStepIndex: number,
    votes: PlayerVote[],
    onComplete: () => Promise<void>
}) {
    const [currentRing, setCurrentRing] = useState<number>(0);
    const [angles, setAngles] = useState<number[]>([0, 0, 0, 0, 0]);
    const [isSolved, setIsSolved] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const animationFrameRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number | null>(null);
    const currentAnglesRef = useRef<number[]>([0, 0, 0, 0, 0]);

    const hasRegisteredSuccess = votes.some(v => v.player_id === playerId);
    const minPlayers = missionData?.requirements?.min_players || 0;

    useEffect(() => {
        if (votes.length >= minPlayers && minPlayers > 0) {
            void onComplete();
        }
    }, [votes, minPlayers, onComplete]);

    // Delta-Time Clock Loop for Cross-Browser Consistency (Safari Fix)
    useEffect(() => {
        if (isSolved || hasRegisteredSuccess) {
            if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current!);
            return;
        }

        const updateAngles = (timestamp: number) => {
            if (!lastTimeRef.current) lastTimeRef.current = timestamp;
            // Calculate fractions of seconds elapsed since the last screen refresh frame
            const deltaTime = (timestamp - lastTimeRef.current) / 1000;
            lastTimeRef.current = timestamp;

            const nextAngles = [...currentAnglesRef.current];

            RING_CONFIGS.forEach((ring, idx) => {
                if (idx >= currentRing) {
                    let nextAngle = nextAngles[idx] + (ring.speed * deltaTime * ring.direction);
                    if (nextAngle >= 360) nextAngle -= 360;
                    if (nextAngle < 0) nextAngle += 360;
                    nextAngles[idx] = nextAngle;
                }
            });

            currentAnglesRef.current = nextAngles;
            setAngles(nextAngles);
            animationFrameRef.current = requestAnimationFrame(updateAngles);
        };

        animationFrameRef.current = requestAnimationFrame(updateAngles);

        return () => {
            if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current!);
        };
    }, [currentRing, isSolved, hasRegisteredSuccess]);

    // Instant Action Contact Evaluation Handler (Instant Tap Fix)
    const handleLockDial = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault(); // Stop secondary click ghosts on mobile layouts
        if (hasRegisteredSuccess || isSolved) return;

        const currentAngle = currentAnglesRef.current[currentRing];
        const distanceToTarget = Math.min(currentAngle, 360 - currentAngle);

        if (distanceToTarget <= HIT_TOLERANCE) {
            if (currentRing === 4) {
                setIsSolved(true);
            } else {
                setCurrentRing(prev => prev + 1);
            }
        } else {
            setCurrentRing(0); // Penalty Reset
        }
    };

    const handleRegisterSuccess = async () => {
        if (isSubmitting || hasRegisteredSuccess) return;

        setIsSubmitting(true);
        const { error } = await supabase.from('player_vote').insert({
            team_id: teamId,
            player_id: playerId,
            challenge_id: missionData.id,
            step: currentStepIndex,
            option_id: 'ROTARY_BYPASS_COMPLETE'
        });

        if (error) {
            console.error(error.message);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 font-mono shadow-2xl text-center max-w-sm mx-auto">
            <div className="mb-6">
                <h3 className="text-purple-400 text-xs uppercase tracking-widest font-black">
                    Rotary Dial Bypass
                </h3>
                <p className="text-[9px] text-slate-400 uppercase mt-1">
                    Align Nodes to 12 o'clock target
                </p>
            </div>

            <div className="relative flex items-center justify-center bg-black/50 border border-slate-900 rounded-full w-72 h-72 mx-auto mb-6 overflow-hidden">
                <div className="absolute top-0 bottom-1/2 w-0.5 bg-red-500 z-30 shadow-[0_0_8px_#ef4444]" />
                <div className="absolute top-[4px] text-[7px] text-red-400 font-bold tracking-tighter uppercase z-30 bg-black px-1 border border-red-500/30 rounded">
                    LOCK SECTOR
                </div>

                {RING_CONFIGS.map((ring, idx) => {
                    const isLocked = idx < currentRing;
                    const isActive = idx === currentRing;

                    return (
                        <div
                            key={ring.id}
                            style={{
                                transform: `rotate(${angles[idx]}deg)`,
                                borderColor: (isSolved || isLocked) ? '#10b981' : isActive ? ring.color : '#1e293b',
                                transition: (isSolved || isLocked) ? 'transform 0.1s ease-out, border-color 0.3s' : 'none'
                            }}
                            className={`absolute border-2 border-dashed rounded-full flex items-center justify-center transition-all ${ring.size}
                                ${(isSolved || isLocked) ? 'shadow-[0_0_10px_rgba(16,185,129,0.2)]' : ''}
                                ${isActive && !isSolved ? 'opacity-100 ring-1 ring-white/10' : 'opacity-40'}
                            `}
                        >
                            <div
                                style={{ backgroundColor: (isSolved || isLocked) ? '#10b981' : ring.color }}
                                className="absolute -top-1.5 w-3 h-3 rounded-full border border-black shadow-[0_0_8px_currentColor]"
                            />
                        </div>
                    );
                })}

                <div className="absolute w-6 h-6 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[8px]">
                    <span className={isSolved ? "text-emerald-400 animate-ping" : "text-slate-600"}>
                        {isSolved ? "✓" : currentRing + 1}
                    </span>
                </div>
            </div>

            {/* Visual Progress Segments (Fixes 5th Dot Visibility Issue) */}
            <div className="flex justify-center gap-1 mb-6">
                {RING_CONFIGS.map((r, idx) => {
                    const isSegmentLit = idx < currentRing || isSolved; // ✅ 5th Bar Fix Included Here
                    return (
                        <div
                            key={r.id}
                            className={`h-1.5 flex-1 rounded max-w-[40px] transition-all duration-300
                                ${isSegmentLit ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' :
                                idx === currentRing ? 'bg-blue-500 animate-pulse' : 'bg-slate-800'}`}
                        />
                    );
                })}
            </div>

            <div className="space-y-3">
                {!isSolved && !hasRegisteredSuccess && (
                    <button
                        onMouseDown={handleLockDial}   // ✅ Instant Capture on Desktop Click Down
                        onTouchStart={handleLockDial}  // ✅ Instant Capture on Mobile Glass Tap Down
                        className="w-full py-4 bg-purple-900/30 hover:bg-purple-800/50 border border-purple-500/50 hover:border-purple-400 text-purple-300 active:scale-95 transition-all text-xs font-black tracking-widest rounded-lg uppercase user-select-none select-none touch-none"
                    >
                        🔒 LOCK DIAL
                    </button>
                )}

                <button
                    onClick={handleRegisterSuccess}
                    disabled={!isSolved || hasRegisteredSuccess || isSubmitting}
                    className={`w-full py-3 border rounded font-bold text-[10px] uppercase tracking-widest transition-all
                    ${(isSolved && !hasRegisteredSuccess) ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' :
                        hasRegisteredSuccess ? 'bg-blue-900/30 border-blue-500/50 text-blue-400 animate-pulse' :
                            'bg-slate-900 border-slate-700 text-slate-500'}`}
                >
                    {!isSolved && !hasRegisteredSuccess && "SEQUENCE STABILITY REQUIRED"}
                    {isSolved && isSubmitting && !hasRegisteredSuccess && "TRANSMITTING BYPASS..."}
                    {isSolved && !hasRegisteredSuccess && !isSubmitting && "CONFIRM BYPASS"}
                    {hasRegisteredSuccess && `WAITING FOR TEAM (${votes.length}/${missionData.requirements.min_players})`}
                </button>
            </div>
        </div>
    );
}
