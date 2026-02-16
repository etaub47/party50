'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

// 1. Initialize OUTSIDE the component to prevent multiple client instances
const supabase = createClient()

export default function Leaderboard() {
    const [players, setPlayers] = useState<any[]>([])

    useEffect(() => {
        let channel: any;

        const fetchPlayers = async () => {
            const { data } = await supabase.from('player').select('*').order('intel', { ascending: false });
            if (data) setPlayers(data);
        };

        const setupRealtime = async () => {
            await supabase.auth.getSession();
            await fetchPlayers();

            // 1. Create a unique name for this specific mount instance
            const channelName = `leaderboard-${Date.now()}`;

            channel = supabase
                .channel(channelName) // Unique name avoids 'phx_close' collisions
                .on(
                    'postgres_changes' as any,
                    { event: '*', schema: 'public', table: 'player' },
                    (payload: any) => {
                        console.log('Change received!', payload);
                        fetchPlayers();
                    }
                )
                .subscribe((status: string) => {
                    console.log(`Realtime status (${channelName}):`, status);
                });
        };

        setupRealtime();

        return () => {
            if (channel) {
                console.log("Cleaning up channel:", channel.topic);
                supabase.removeChannel(channel);
            }
        };
    }, []); // No need to depend on 'supabase' anymore since it's a constant outside

    return (
        <div className="mt-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Active Agents</h2>
            <ul className="space-y-2">
                {players.map(p => (
                    <li key={p.id} className="p-3 bg-gray-800 rounded-lg flex justify-between">
                        <span>{p.name} <span className="text-xs text-blue-400">({p.role})</span></span>
                        <span className="font-mono text-yellow-500">{p.intel} cr</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}
