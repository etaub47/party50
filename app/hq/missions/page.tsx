'use client'

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getMissionManifest } from '@/app/actions/getMission';
import { Mission } from '@/types/types';

const supabase = createClient();

interface TeamRow {
    teamId: string;
    challengeId: string;
    status: string;
    currentStep: number;
    createdAt: string;
    players: { id: string, name: string }[];
}

interface PlayerChallengeRow {
    challenge_id: string;
    team_id: string;
    status: string;
    current_step: number;
    created_at: string;
    player: { id: string, name: string } | null;
}

export default function LiveMissionsPage() {
    const [ teams, setTeams ] = useState<TeamRow[]>([]);
    const [ manifests, setManifests ] = useState<Record<string, Mission | 'ERROR'>>({});
    const [ loading, setLoading ] = useState(true);
    // Mirrors `manifests` for synchronous reads inside fetchTeams (state updates
    // from the same tick aren't visible yet) without re-subscribing the realtime
    // channel on every manifest fetch.
    const manifestsRef = useRef<Record<string, Mission | 'ERROR'>>({});

    const fetchTeams = useCallback(async () => {
        const { data, error } = await supabase
            .from('player_challenge')
            .select('challenge_id, team_id, status, current_step, created_at, player:player_id(id, name)')
            .in('status', ['WAITING', 'IN_PROGRESS'])
            .order('created_at', { ascending: true })
            .returns<PlayerChallengeRow[]>();

        if (error) {
            console.error(error.message);
            setLoading(false);
            return;
        }

        const byTeam = new Map<string, TeamRow>();
        for (const row of data ?? []) {
            const existing = byTeam.get(row.team_id);
            if (existing) {
                if (row.player) existing.players.push(row.player);
            } else {
                byTeam.set(row.team_id, {
                    teamId: row.team_id,
                    challengeId: row.challenge_id,
                    status: row.status,
                    currentStep: row.current_step,
                    createdAt: row.created_at,
                    players: row.player ? [ row.player ] : []
                });
            }
        }

        const rows = Array.from(byTeam.values());

        // warm the manifest cache for every challenge in play, so title/min_players/
        // step count are available without an extra round trip per render.
        const uncached = [ ...new Set(rows.map(r => r.challengeId)) ]
            .filter(id => !manifestsRef.current[id]);
        if (uncached.length > 0) {
            const fetched = await Promise.all(uncached.map(async id => {
                const result = await getMissionManifest(id);
                return [ id, result.success ? result.data! : 'ERROR' as const ] as const;
            }));
            manifestsRef.current = { ...manifestsRef.current, ...Object.fromEntries(fetched) };
            setManifests(manifestsRef.current);
        }

        setTeams(rows);
        setLoading(false);
    }, []);

    useEffect(() => {
        void fetchTeams();
        const channel = supabase.channel(`hq-missions-${Date.now()}`)
            .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'player_challenge' }, () => fetchTeams())
            .subscribe();
        return () => { void supabase.removeChannel(channel); };
    }, [fetchTeams]);

    if (loading) return <div className="p-8 font-mono text-emerald-500 animate-pulse">LOADING FIELD STATUS...</div>;

    const inProgress = teams.filter(t => t.status === 'IN_PROGRESS');
    const waiting = teams.filter(t => t.status === 'WAITING');

    return (
        <div className="p-4 max-w-4xl mx-auto">
            <header className="mb-6">
                <h1 className="text-xl font-mono font-bold text-emerald-500 tracking-tighter">LIVE MISSIONS</h1>
                <p className="text-[10px] text-slate-500 font-mono uppercase">
                    {inProgress.length} in progress &middot; {waiting.length} waiting on players
                </p>
            </header>

            {teams.length === 0 && (
                <p className="text-slate-600 font-mono text-sm italic">No active or waiting missions.</p>
            )}

            <div className="flex flex-col gap-3">
                {[ ...inProgress, ...waiting ].map(team => (
                    <TeamCard key={team.teamId} team={team} manifest={manifests[team.challengeId]} />
                ))}
            </div>
        </div>
    );
}

function TeamCard({ team, manifest }: { team: TeamRow, manifest: Mission | 'ERROR' | undefined }) {
    const title = manifest && manifest !== 'ERROR' ? manifest.title : team.challengeId;
    const totalSteps = manifest && manifest !== 'ERROR' ? manifest.steps.length : null;
    const minPlayers = manifest && manifest !== 'ERROR' ? manifest.requirements.min_players : null;
    const isInProgress = team.status === 'IN_PROGRESS';

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="font-bold text-slate-100 leading-none">{title}</h3>
                    <p className="text-[9px] font-mono text-slate-500 uppercase mt-1">
                        {team.players.map(p => p.name).join(', ') || 'No agents joined'}
                    </p>
                </div>
                <span className={`text-[10px] font-mono px-2 py-1 rounded-md uppercase shrink-0 ${
                    isInProgress
                        ? 'bg-blue-950/60 border border-blue-700 text-blue-400'
                        : 'bg-amber-950/60 border border-amber-700 text-amber-400'
                }`}>
                    {team.status}
                </span>
            </div>
            <div className="text-xs font-mono text-slate-400 border-t border-slate-800/50 pt-3">
                {isInProgress
                    ? `Step ${team.currentStep}${totalSteps ? ` / ${totalSteps}` : ''}`
                    : `${team.players.length}${minPlayers ? ` / ${minPlayers}` : ''} agents present`}
            </div>
        </div>
    );
}
