import { listMissions } from "@/app/actions/getMission";
import { createClient } from '@/utils/supabase/server';
import ReconReadoutClient from './ReconReadoutClient';

export const dynamic = 'force-dynamic';

export default async function ReconReadoutPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return (
            <div className="p-8 bg-black min-h-screen font-mono text-red-500">
                ERROR: AUTHENTICATION PROTOCOL FAILURE. PLEASE RE-LOG.
            </div>
        );
    }

    const missions = await listMissions();
    const [inventoryRes, hiddenItemsRes, challengesRes] = await Promise.all([
        supabase.from('player_item').select('item!inner(name)').eq('player_id', user.id).eq('item.name', 'Recon Readout'),
        supabase.from('player_item').select('item!inner(type)').eq('player_id', user.id).eq('item.type', 'Miscellaneous'),
        supabase.from('player_challenge').select('challenge_id, status, team_id').eq('player_id', user.id)
    ]);

    const hasAccess = !!(inventoryRes.data && inventoryRes.data.length > 0);
    const foundCount = hiddenItemsRes.data?.length || 0;
    const challenges = (challengesRes.data || []) as { challenge_id: string; status: string; team_id: string }[];

    // For resolved missions, pull the rest of the squad that ran them with us.
    const resolvedTeamIds = challenges
        .filter(c => c.status === 'COMPLETED' || c.status === 'FAILED')
        .map(c => c.team_id);

    const teammatesByTeam = new Map<string, string[]>();
    if (resolvedTeamIds.length > 0) {
        const { data: teammateRows } = await supabase
            .from('player_challenge')
            .select('team_id, player_id, player(name)')
            .in('team_id', resolvedTeamIds)
            .neq('player_id', user.id);

        for (const row of teammateRows || []) {
            // Supabase types the embed as an array; a player_id maps to one player.
            const player = Array.isArray(row.player) ? row.player[0] : row.player;
            const names = teammatesByTeam.get(row.team_id) || [];
            names.push(player?.name || 'UNKNOWN AGENT');
            teammatesByTeam.set(row.team_id, names);
        }
    }

    const missionStatuses = missions.map((m) => {
        const record = challenges.find(c => c.challenge_id === m.id);
        return {
            id: m.id,
            title: m.title,
            description: m.description,
            status: record ? (record.status as 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED') : 'NOT_STARTED',
            teammates: record ? (teammatesByTeam.get(record.team_id) || []) : []
        };
    });

    return (
        <ReconReadoutClient
            hasAccess={hasAccess}
            foundCount={foundCount}
            missionStatuses={missionStatuses}
        />
    );
}
