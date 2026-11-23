'use client'

import { useState, useEffect, useCallback, useRef } from 'react';
import { Mission } from "@/types/types";
import { PlayerVote } from "@/types/dbtypes";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

// 4 columns x 3 rows = 6 pairs.
const PAIR_COUNT = 6;

// How long a mismatched pair stays face up before flipping back (ms).
const MISMATCH_REVEAL_MS = 900;

// Card faces. Stick to Unicode 6.0 emoji that default to colour (emoji)
// presentation and need no variation selector, so they render on every
// phone a player could bring. A mission can supply its own six via
// config.icons; anything other than six distinct entries falls back here.
const DEFAULT_ICONS = ['🔑', '💼', '📡', '💾', '🔒', '📷'];

type Card = { icon: string, matched: boolean };

function shuffledDeck(icons: string[]): Card[] {
    const deck = [...icons, ...icons].map(icon => ({ icon, matched: false }));
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

export default function MatchCardsView({
    missionData, teamId, playerId, currentStepIndex, votes, onComplete
}: {
    missionData: Mission,
    teamId: string,
    playerId: string,
    currentStepIndex: number,
    votes: PlayerVote[],
    onComplete: () => Promise<void>
}) {
    const config = missionData.steps[currentStepIndex - 1]?.config || {};
    const configIcons = config.icons;
    const icons = (configIcons && configIcons.length === PAIR_COUNT && new Set(configIcons).size === PAIR_COUNT)
        ? configIcons
        : DEFAULT_ICONS;

    // dealt once per mount; MissionRunner keys this view by step, so each
    // MATCH step (and each player) gets its own fresh shuffle
    const [ cards, setCards ] = useState<Card[]>(() => shuffledDeck(icons));
    // mirrors `cards` for the same reason flippedRef mirrors `flipped` (below)
    const cardsRef = useRef<Card[]>(cards);
    const [ flipped, setFlipped ] = useState<number[]>([]);
    const [ isSolved, setIsSolved ] = useState(false);
    const [ isSubmitting, setIsSubmitting ] = useState(false);

    // Input lock while a mismatched pair is showing. A ref, not state, so two
    // taps landing in the same frame can't both slip past it.
    const isLockedRef = useRef(false);
    // mirrors `flipped` so back-to-back taps see the latest value, not a render-stale one
    const flippedRef = useRef<number[]>([]);
    const flipBackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hasRegisteredSuccess = votes.some(v => v.player_id === playerId);
    const requiredPlayers = missionData?.requirements?.required_players || 0;

    const setFlippedBoth = useCallback((next: number[]) => {
        flippedRef.current = next;
        setFlipped(next);
    }, []);

    useEffect(() => () => {
        if (flipBackTimerRef.current) clearTimeout(flipBackTimerRef.current);
    }, []);

    // watch for team completion; if the total votes equal the required players, move on!
    useEffect(() => {
        if (votes.length >= requiredPlayers && requiredPlayers > 0)
            void onComplete();
    }, [votes, requiredPlayers, onComplete]);

    const handleCardClick = (idx: number) => {
        if (hasRegisteredSuccess || isSolved || isLockedRef.current) return;
        const deck = cardsRef.current;
        const card = deck[idx];
        // ignore matched cards and a second tap on the card already showing
        const current = flippedRef.current;
        if (!card || card.matched || current.includes(idx)) return;

        if (current.length === 0) {
            setFlippedBoth([idx]);
            return;
        }

        const first = current[0];
        if (deck[first].icon === card.icon) {
            const nextCards = deck.map((c, i) => (i === first || i === idx) ? { ...c, matched: true } : c);
            cardsRef.current = nextCards;
            setCards(nextCards);
            setFlippedBoth([]);
            if (nextCards.every(c => c.matched)) setIsSolved(true);
        } else {
            setFlippedBoth([first, idx]);
            isLockedRef.current = true;
            flipBackTimerRef.current = setTimeout(() => {
                setFlippedBoth([]);
                isLockedRef.current = false;
                flipBackTimerRef.current = null;
            }, MISMATCH_REVEAL_MS);
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
            option_id: 'MATCH_COMPLETE'
        });
        if (error) {
            console.log(error.message);
            setIsSubmitting(false);
        }
    };

    const matchedCount = cards.filter(c => c.matched).length / 2;

    return (
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 font-mono shadow-2xl">
            <div className="text-center mb-6">
                <h3 className="text-amber-400 text-xs uppercase tracking-widest font-black">
                    Signature Pairing
                </h3>
                <p className="text-[9px] text-slate-300 uppercase mt-1">
                    Flip two cards at a time to match every pair
                </p>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4 max-w-[320px] mx-auto p-2 bg-black/40 rounded-lg">
                {cards.map((card, idx) => {
                    const isFaceUp = card.matched || flipped.includes(idx);
                    return (
                        <button
                            key={idx}
                            onClick={() => handleCardClick(idx)}
                            disabled={hasRegisteredSuccess || card.matched}
                            aria-label={isFaceUp ? card.icon : 'Hidden card'}
                            className={`aspect-[3/4] rounded-lg border-2 flex items-center justify-center select-none touch-manipulation transition-all duration-200
                                ${card.matched
                                    ? 'bg-emerald-950/60 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                                    : isFaceUp
                                        ? 'bg-slate-800 border-amber-400'
                                        : 'bg-amber-950/40 border-amber-900/60 active:scale-95'}
                                ${hasRegisteredSuccess ? 'opacity-50' : ''}
                            `}
                        >
                            {isFaceUp
                                ? <span className="text-3xl leading-none">{card.icon}</span>
                                : <span className="text-amber-700/70 text-lg font-black">?</span>}
                        </button>
                    );
                })}
            </div>

            <p className="text-center text-[10px] text-slate-400 uppercase tracking-widest mb-6">
                Pairs: {matchedCount} / {PAIR_COUNT}
            </p>

            <div className="space-y-3">
                <button
                    onClick={handleRegisterSuccess}
                    disabled={!isSolved || hasRegisteredSuccess || isSubmitting}
                    className={`w-full py-3 border rounded font-bold text-[10px] uppercase tracking-widest transition-all
                    ${(isSolved && !hasRegisteredSuccess) ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' :
                        hasRegisteredSuccess ? 'bg-blue-900/30 border-blue-500/50 text-blue-400 animate-pulse' :
                            'bg-slate-900 border-slate-700 text-slate-500'}`}
                >
                    {!isSolved && !hasRegisteredSuccess && "PAIRING INCOMPLETE"}
                    {isSolved && isSubmitting && !hasRegisteredSuccess && "UPLOADING BYPASS..."}
                    {isSolved && !hasRegisteredSuccess && !isSubmitting && "CONFIRM BYPASS"}
                    {hasRegisteredSuccess && `WAITING FOR TEAM (${votes.length}/${missionData.requirements.required_players})`}
                </button>
            </div>
        </div>
    );
}
