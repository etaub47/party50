'use client'

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface ScoreRow {
    id: string;
    name: string;
    role: string;
    total_intel: number;
    total_heat: number;
}

export default function FinalScoresPage() {
    const [ rows, setRows ] = useState<ScoreRow[]>([]);
    const [ loading, setLoading ] = useState(true);

    useEffect(() => {
        const fetchScores = async () => {
            const { data } = await supabase
                .from('player_stats')
                .select('id, name, role, total_intel, total_heat')
                .order('total_intel', { ascending: false })
                .order('total_heat', { ascending: true });
            if (data) setRows(data as ScoreRow[]);
            setLoading(false);
        };

        void fetchScores();

        // useful mid-game too, so keep it live rather than a one-shot fetch
        const channel = supabase.channel(`hq-scores-${Date.now()}`)
            .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'player' }, () => fetchScores())
            .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'player_item' }, () => fetchScores())
            .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'player_event' }, () => fetchScores())
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, []);

    // Tie-aware ranking: a row only shares its rank with the row above it when
    // both the primary (intel) and tiebreak (heat) values are identical --
    // otherwise rank is just its position in the already-sorted list.
    const ranks: number[] = [];
    rows.forEach((row, i) => {
        if (i > 0 && row.total_intel === rows[i - 1].total_intel && row.total_heat === rows[i - 1].total_heat) {
            ranks.push(ranks[i - 1]);
        } else {
            ranks.push(i + 1);
        }
    });

    const medalStyle = (rank: number) => {
        if (rank === 1) return 'border-yellow-500 bg-yellow-500/10';
        if (rank === 2) return 'border-slate-400 bg-slate-400/10';
        if (rank === 3) return 'border-amber-700 bg-amber-700/10';
        return 'border-slate-800';
    };

    if (loading) return <div className="p-8 font-mono text-blue-500 animate-pulse">TALLYING RESULTS...</div>;

    return (
        <div className="p-8 max-w-3xl mx-auto">
            <header className="mb-10 text-center">
                <h1 className="text-4xl font-mono font-bold text-blue-400 tracking-tighter uppercase">
                    Final Scores
                </h1>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest mt-2">
                    Ranked by Intel -- ties broken by lowest Heat
                </p>
            </header>

            <div className="flex flex-col gap-3">
                {rows.map((row, i) => (
                    <div
                        key={row.id}
                        className={`flex items-center justify-between p-5 rounded-xl border-2 bg-slate-900 ${medalStyle(ranks[i])}`}
                    >
                        <div className="flex items-center gap-5">
                            <span className="text-3xl font-mono font-bold text-slate-500 w-10 text-center">
                                {ranks[i]}
                            </span>
                            <div>
                                <p className="text-xl font-bold text-slate-100">{row.name}</p>
                                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{row.role}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-8 text-right">
                            <div>
                                <p className="text-[9px] text-slate-500 font-mono uppercase">Heat</p>
                                <p className="text-sm font-bold text-red-500">{row.total_heat}</p>
                            </div>
                            <div>
                                <p className="text-[9px] text-slate-500 font-mono uppercase">Intel</p>
                                <p className="text-3xl font-bold text-blue-400">{row.total_intel}</p>
                            </div>
                        </div>
                    </div>
                ))}
                {rows.length === 0 && (
                    <p className="text-center text-slate-600 italic">No agents registered.</p>
                )}
            </div>
        </div>
    );
}
