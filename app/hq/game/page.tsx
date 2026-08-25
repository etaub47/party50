'use client'

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

export default function GameControlPage() {
    const [ status, setStatus ] = useState<string | null>(null);
    const [ isBusy, setIsBusy ] = useState(false);

    const refreshStatus = async () => {
        const { data } = await supabase
            .from('game_state')
            .select('status')
            .eq('id', 1)
            .single<{ status: string }>();
        setStatus(data?.status ?? null);
    };

    useEffect(() => {
        void refreshStatus();
    }, []);

    const runTransition = async (rpcName: string, label: string, confirmMessage: string) => {
        if (!confirm(confirmMessage))
            return;

        setIsBusy(true);
        const { data, error } = await supabase.rpc(rpcName);

        if (error) {
            alert(error.message);
        } else if (data === false) {
            alert(`${label} had no effect -- the game wasn't in the right state for it.`);
        } else {
            alert(`${label} complete.`);
        }

        await refreshStatus();
        setIsBusy(false);
    };

    return (
        <div className="p-8 max-w-2xl mx-auto font-mono text-slate-200">
            <header className="mb-12 border-b border-blue-900 pb-4">
                <h1 className="text-3xl font-bold text-blue-500 tracking-tighter uppercase italic">
                    Game Control
                </h1>
                <p className="text-xs text-slate-500 mt-2">
                    Current phase: <span className="text-slate-200 font-bold">{status ?? 'LOADING...'}</span>
                </p>
            </header>

            <div className="grid gap-6">
                <button
                    disabled={isBusy}
                    onClick={() => runTransition(
                        'start_game',
                        'Start Game',
                        'Start the game? Registration and missions open for every agent.'
                    )}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white px-6 py-4 rounded-xl font-bold uppercase text-sm tracking-widest disabled:opacity-50 transition-all shadow-lg active:scale-95"
                >
                    Start Game
                </button>

                <button
                    disabled={isBusy}
                    onClick={() => runTransition(
                        'end_game',
                        'End Game',
                        'End the game? This aborts every active mission and converts spare credits ' +
                        'to intel. Make sure there are no active global events first.'
                    )}
                    className="bg-red-700 hover:bg-red-600 text-white px-6 py-4 rounded-xl font-bold uppercase text-sm tracking-widest disabled:opacity-50 transition-all shadow-lg active:scale-95"
                >
                    End Game
                </button>

                <button
                    disabled={isBusy}
                    onClick={() => runTransition(
                        'undo_end_game',
                        'Undo End Game',
                        'Undo End Game? This returns to IN_GAME and reverses the credit-to-intel ' +
                        'conversion. Teams that were mid-mission when you ended the game will need ' +
                        'to rejoin -- their progress was already deleted and cannot be restored.'
                    )}
                    className="bg-amber-700 hover:bg-amber-600 text-white px-6 py-4 rounded-xl font-bold uppercase text-sm tracking-widest disabled:opacity-50 transition-all shadow-lg active:scale-95"
                >
                    Undo End Game
                </button>

                <button
                    disabled={isBusy}
                    onClick={() => runTransition(
                        'reset_game',
                        'Reset',
                        'Reset the game? This PERMANENTLY DELETES every player, mission progress, ' +
                        'lawyer advice, global event, and transfer/legal/conversion history, then ' +
                        'returns to PRE_GAME. Items stay. This cannot be undone.'
                    )}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-4 rounded-xl font-bold uppercase text-sm tracking-widest disabled:opacity-50 transition-all shadow-lg active:scale-95"
                >
                    Reset (Wipes Everything)
                </button>
            </div>

            <footer className="mt-12 text-center">
                <p className="text-[10px] text-slate-700 uppercase tracking-widest">
                    Transitions are admin-only and idempotent -- a repeat tap is a no-op.
                </p>
            </footer>
        </div>
    );
}
