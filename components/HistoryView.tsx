'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { HistoryEvent } from "@/types/dbtypes";
import ConnectionStatus from "@/components/ConnectionStatus";

const supabase= createClient()

export default function HistoryView({ playerId }: { playerId: string }) {
    const [ events, setEvents ] = useState<HistoryEvent[]>([]);
    const [ loading, setLoading ] = useState(true);
    const [ isConnected, setIsConnected ] = useState(false);

    useEffect(() => {
        let channel: any;

        const fetchEvents = async () => {
            if (!playerId) return;
            const { data, error } = await supabase
                .from('player_event')
                .select(`player_id, event_id, created_at, event:event_id (description, type, intel, heat, credits)`)
                .eq('player_id', playerId)
                .order('created_at', { ascending: false });
            if (error)
                console.error("Error fetching history:", error.message);
            if (data && !error)
                setEvents(data as any as HistoryEvent[]);
        };

        const setupRealtime = async () => {
            if (!playerId) return; // don't subscribe if we don't have an ID yet
            await supabase.auth.getSession();

            const channelName = `history-${Date.now()}`;
            channel = supabase.channel(channelName)
                .on(
                    'postgres_changes' as any,
                    { event: '*', schema: 'public', table: 'player_event', filter: `player_id=eq.${playerId}` },
                    (payload: any) => {
                        console.log('Change received!', payload);
                        fetchEvents();
                    }
                )
                .subscribe((status: string) => {
                    console.log(`Realtime status (${channelName}):`, status);
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

        void fetchEvents();
        void setupRealtime();
        setLoading(false);

        return () => {
            if (channel) {
                console.log("Cleaning up channel:", channel.topic);
                void supabase.removeChannel(channel);
            }
        };
    }, [playerId]);

    if (loading)
        return <div className="p-4 text-center animate-pulse">Retrieving mission logs...</div>
    if (events.length === 0)
        return <div className="p-8 text-center text-gray-500">No mission events recorded.</div>

    return (
        <div className="flex flex-col gap-4 w-full max-w-md mx-auto mt-4">
            <div className="w-full flex justify-end mb-2">
                <ConnectionStatus isActive={isConnected} />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-center">Mission Log</h2>
            {events.map((log: HistoryEvent) => (
                <div
                    key={`${log.player_id}-${log.event_id}`}
                    className="p-4 bg-gray-900 border-l-4 border-blue-500 rounded-r shadow-sm flex flex-col gap-1"
                >
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] uppercase tracking-widest text-gray-400 font-mono">
                            {new Date(log.created_at).toLocaleString()}
                        </span>
                    </div>

                    <p className="text-left text-sm text-gray-100 leading-relaxed italic">
                        {log.event.description}
                    </p>

                    <div className="flex gap-2">
                        {log.event.intel !== 0 && (
                            <span className="bg-blue-700 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                {log.event.intel > 0 ? `+${log.event.intel}` : log.event.intel} INTEL
                            </span>
                        )}
                        {log.event.heat !== 0 && (
                            <span className="bg-red-700 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                {log.event.heat > 0 ? `+${log.event.heat}` : log.event.heat} HEAT
                            </span>
                        )}
                        {log.event.credits !== 0 && (
                            <span className="bg-green-700 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                {log.event.credits > 0 ? `+${log.event.credits}` : log.event.credits} CREDITS
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}
