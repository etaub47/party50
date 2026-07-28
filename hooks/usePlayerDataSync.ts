import { useState, useEffect, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/realtime-js';
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
        if (!playerId)
            return;

        let isActive = true;
        let channel: RealtimeChannel | null = null;
        let retryTimer: ReturnType<typeof setTimeout> | null = null;
        // bumped per subscribe attempt, so a superseded channel's own status
        // callbacks (notably the CLOSED we cause by removing it) are ignored
        let generation = 0;

        // only one retry may be in flight, and never after teardown
        const scheduleRetry = () => {
            if (!isActive || retryTimer)
                return;
            console.log("Retrying subscription in 5s...");
            retryTimer = setTimeout(() => {
                retryTimer = null;
                void setupRealtime();
            }, 5000);
        };

        const setupRealtime = async () => {
            if (!isActive)
                return;
            const myGen = ++generation;

            // on a retry this also pulls anything that changed while we were dark
            void fetchData();

            // drop the previous channel first so retries don't stack up subscriptions
            if (channel) {
                const stale = channel;
                channel = null;
                await supabase.removeChannel(stale);
                if (!isActive || myGen !== generation)
                    return;
            }

            const channelName = `player-sync-${playerId}-${Date.now()}`;
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
                    if (!isActive || myGen !== generation)
                        return;
                    const isSubscribed = status === 'SUBSCRIBED';
                    setIsConnected(isSubscribed);
                    if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status))
                        scheduleRetry();
                });
        };

        void setupRealtime();
        return () => {
            // must flip before removeChannel: unsubscribing fires the status
            // callback with CLOSED, which would otherwise schedule a retry
            isActive = false;
            if (retryTimer)
                clearTimeout(retryTimer);
            if (channel)
                void supabase.removeChannel(channel);
        };
    }, [playerId, fetchData]);

    return { playerStats, items, events, isConnected, isInitialLoading, refresh: fetchData };
}
