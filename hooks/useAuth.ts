import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface ActiveMission {
    challengeId: string,
    teamId: string,
    status: string,
    currentStep: number
}

export function useAuth() {
    const [ playerData, setPlayerData ] = useState<any | null>(null);
    const [ items, setItems ] = useState<any[]>([]);
    const [ isRegistered, setIsRegistered ] = useState(false);
    const [ isLoading, setIsLoading ] = useState(true);
    const [ activeMission, setActiveMission ] = useState<ActiveMission | null>(null);
    const supabase = createClient();

    const refreshAuth = useCallback(async () => {
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
                .select('player_id, item_id, created_at, item:item_id (id, name, type, cost, intel, heat, credits)')
                .eq('player_id', user.id)
                .order('created_at', { ascending: false });

            if (stats) {
                setPlayerData(stats);
                setItems(inventory || []);
                setIsRegistered(true);
            }

            // check to see if we have an active mission
            const { data: mission, error } = await supabase
                .from('player_challenge')
                .select('challenge_id, team_id, status, current_step')
                .eq('player_id', user.id)
                .or('status.eq.WAITING, status.eq.IN_PROGRESS')
                .maybeSingle();
            if (error)
                console.log(error.message)
            if (mission) {
                setActiveMission({
                    challengeId: mission.challenge_id,
                    teamId: mission.team_id,
                    status: mission.status,
                    currentStep: mission.current_step
                });
            }
        }
        setIsLoading(false);
    }, [supabase]);

    useEffect(() => {
        void refreshAuth();
    }, []);

    return useMemo(() => ({
        playerData, setPlayerData, items, setItems, isRegistered, setIsRegistered,
        isLoading, setIsLoading, activeMission, setActiveMission
    }), [playerData, items, isRegistered, isLoading, activeMission, setPlayerData,
        setItems, setIsRegistered, setIsLoading, setActiveMission]);
}
