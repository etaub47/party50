'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { PlayerStats } from "@/types/dbtypes";
import ConnectionStatus from "@/components/ConnectionStatus";

const supabase= createClient()

export default function ProfileView({ initialPlayerData }: { initialPlayerData: any }) {
    const [ player, setPlayer ] = useState<PlayerStats>(initialPlayerData)
    const [ isConnected, setIsConnected ] = useState(false);

    useEffect(() => {
        let channel: any;

        const fetchPlayer = async () => {
            const { data } = await supabase
                .from('player_stats')
                .select('*')
                .eq('id', player.id)
                .single();
            if (data) {
                setPlayer(data as PlayerStats);
            }
        };

        const setupRealtime = async () => {
            if (channel)
                await supabase.removeChannel(channel);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session || !player.id)
                return;

            const channelName = `profile-${Date.now()}`;
            channel = supabase
                .channel(channelName) // unique name avoids 'phx_close' collisions
                .on(
                    'postgres_changes' as any,
                    { event: '*', schema: 'public', table: 'player', filter: `id=eq.${player.id}` },
                    () => fetchPlayer()
                )
                .on(
                    'postgres_changes' as any,
                    { event: '*', schema: 'public', table: 'player_item', filter: `player_id=eq.${player.id}` },
                    () => fetchPlayer()
                )
                .on(
                    'postgres_changes' as any,
                    { event: '*', schema: 'public', table: 'player_event', filter: `player_id=eq.${player.id}` },
                    () => fetchPlayer()
                )
                .subscribe((status: string) => {
                    console.log(`Realtime status (${channelName}):`, status);
                    setIsConnected(status === 'SUBSCRIBED');
                    const isFailure = status === 'CHANNEL_ERROR' || status === 'TIMED_OUT';
                    if (isFailure) {
                        console.log("Retrying subscription in 2s...");
                        setTimeout(() => {
                            void setupRealtime();
                        }, 2000);
                    }
                });
        };

        void setupRealtime();

        return () => {
            if (channel) {
                console.log("Cleaning up channel:", channel.topic);
                void supabase.removeChannel(channel);
            }
        };
    }, [player.id]);

    return (
        <div className="mt-8 w-full max-w-xl flex flex-col gap-2 items-center">
            <div className="w-full flex justify-end mb-2">
                <ConnectionStatus isActive={isConnected} />
            </div>
            <h2 className="text-2xl font-bold">{player.name}</h2>
            <span className="text-blue-400">{player.role}</span>

            <div className="w-full">
                <div className="relative w-full bg-gray-700 h-10 rounded-lg overflow-hidden mt-4 border border-gray-600">
                    <div
                        className="h-full bg-blue-500 transition-all duration-500 ease-out"
                        style={{ width: `${Math.max((player.total_intel / player.max_intel) * 100, 2)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                        Intel: {player.total_intel} / {player.max_intel}
                    </span>
                </div>
                <div className="relative w-full bg-gray-700 h-10 rounded-lg overflow-hidden mt-5 border border-gray-600">
                    <div
                        className={`h-full bg-red-500 transition-all duration-500 ease-out ${player.total_heat >= 80 ? 'animate-pulse' : ''}`}
                        style={{ width: `${Math.max(Math.min(player.total_heat, 100), 2)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                        Heat: {player.total_heat}
                    </span>
                </div>
                <div className="relative w-full bg-gray-700 h-10 rounded-lg overflow-hidden mt-5 border border-gray-600">
                    <div
                        className="h-full bg-green-600 transition-all duration-500 ease-out"
                        style={{ width: `${Math.max((player.current_credits / player.max_credits) * 100, 2)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                        Credits: {player.current_credits} / {player.max_credits}
                    </span>
                </div>
            </div>

        </div>
    )
}
