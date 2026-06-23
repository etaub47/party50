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
        supabase.from('player_challenge').select('challenge_id, status').eq('player_id', user.id)
    ]);

    const hasAccess = !!(inventoryRes.data && inventoryRes.data.length > 0);
    const foundCount = hiddenItemsRes.data?.length || 0;
    const challenges = (challengesRes.data || []) as { challenge_id: string; status: string }[];

    const missionStatuses = missions.map((m) => {
        const record = challenges.find(c => c.challenge_id === m.id);
        return {
            id: m.id,
            title: m.title,
            description: m.description,
            status: record ? (record.status as 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED') : 'NOT_STARTED'
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
