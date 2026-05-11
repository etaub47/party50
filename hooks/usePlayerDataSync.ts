import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { PlayerStats, InventoryItem, HistoryEvent } from '@/types/dbtypes';

const supabase = createClient();

export function usePlayerDataSync(playerId: string | undefined) {
    const [ playerStats, setPlayerStats ] = useState<PlayerStats | null>(null);
    const [ items, setItems ] = useState<InventoryItem[]>([]);
    const [ events, setEvents ] = useState<HistoryEvent[]>([]);
    const [ isConnected, setIsConnected ] = useState(false);
    const [ isInitialLoading, setIsInitialLoading ] = useState(true);

    const fetchData = useCallback(async () => {
        if (!playerId)
            return;
        const [pResp, iResp, hResp] = await Promise.all([
            supabase.from('player_stats').select('*')
                .eq('id', playerId).single(),
            supabase.from('player_item').select(`player_id, item_id, created_at, item:item_id (*)`)
                .eq('player_id', playerId).order('created_at', { ascending: false }),
            supabase.from('player_event').select(`player_id, event_id, created_at, event:event_id (*)`)
                .eq('player_id', playerId).order('created_at', { ascending: false })
        ]);
        if (pResp.data)
            setPlayerStats(pResp.data as PlayerStats);
        if (iResp.data)
            setItems(iResp.data as any[]);
        if (hResp.data)
            setEvents(hResp.data as any[]);
        setIsInitialLoading(false);
    }, [playerId]);

    useEffect(() => {
        let channel: any;
        const setupRealtime = async () => {
            if (!playerId)
                return;
            void fetchData();

            const channelName = `player-sync-${Date.now()}`;
            channel = supabase.channel(channelName)
                .on('postgres_changes' as any,
                    { event: '*', schema: 'public', table: 'player', filter: `id=eq.${playerId}` },
                    fetchData)
                .on('postgres_changes' as any,
                    { event: '*', schema: 'public', table: 'player_item', filter: `player_id=eq.${playerId}` },
                    fetchData)
                .on('postgres_changes' as any,
                    { event: '*', schema: 'public', table: 'player_event', filter: `player_id=eq.${playerId}` },
                    fetchData)
                .subscribe((status) => {
                    console.log(`📡 Unified Sync (${channelName}):`, status);
                    setIsConnected(status === 'SUBSCRIBED');
                    const isFailure = status === 'CHANNEL_ERROR' || status === 'TIMED_OUT';
                    if (isFailure) {
                        console.log("Retrying subscription in 5s...");
                        setTimeout(() => {
                            void setupRealtime();
                        }, 5000);
                    }
                });
        };
        void setupRealtime();
        return () => {
            if (channel) {
                void supabase.removeChannel(channel);
            }
        };
    }, [playerId, fetchData]);

    return { playerStats, items, events, isConnected, isInitialLoading, refresh: fetchData };
}
