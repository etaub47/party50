import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export function useAuth() {
    const [playerData, setPlayerData] = useState<any | null>(null);
    const [items, setItems] = useState<any[]>([]);
    const [isRegistered, setIsRegistered] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [activeMission, setActiveMission] = useState<{ challengeId: string, teamId: string } | null>(null);
    const supabase = createClient();

    const refreshAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        let user = session?.user;

        if (!user) {
            const { data } = await supabase.auth.signInAnonymously();
            user = data.user ?? undefined;
        }

        if (user) {
            const { data: stats } = await supabase
                .from('player_stats')
                .select('*')
                .eq('id', user.id)
                .single();

            const { data: inventory } = await supabase
                .from('player_item')
                .select('player_id, item_id, item:item_id (name, type, intel, heat)')
                .eq('player_id', user.id);

            if (stats) {
                setPlayerData(stats);
                setItems(inventory || []);
                setIsRegistered(true);
            }

            // check to see if we have an active mission
            const { data: mission, error } = await supabase
                .from('player_challenge')
                .select('challenge_id, team_id')
                .eq('player_id', user.id)
                .or('status.eq.WAITING, status.eq.IN_PROGRESS')
                .maybeSingle();
            if (error)
                console.log(error.message)
            if (mission) {
                setActiveMission({
                    challengeId: mission.challenge_id,
                    teamId: mission.team_id
                });
            }
        }
        setIsLoading(false);
    };

    useEffect(() => {
        refreshAuth();
    }, []);

    return { playerData, setPlayerData, items, setItems, isRegistered, setIsRegistered, isLoading, setIsLoading,
        activeMission, setActiveMission };
}
