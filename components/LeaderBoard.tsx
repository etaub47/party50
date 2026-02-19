'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

// initialize OUTSIDE the component to prevent multiple client instances
const supabase= createClient()

export default function Leaderboard({ hasDossier }: { hasDossier: boolean }) {
    const [players, setPlayers] = useState<any[]>([])

    useEffect(() => {
        let channel: any;

        const fetchPlayers = async () => {
            const { data } = await supabase.from('player').select('*')
                .order('intel', { ascending: false }).order('heat', { ascending: true });
            if (data) setPlayers(data);
        };

        const setupRealtime = async () => {
            await supabase.auth.getSession();
            await fetchPlayers();

            // create a unique name for this specific mount instance
            const channelName = `leaderboard-${Date.now()}`;

            channel = supabase
                .channel(channelName) // unique name avoids 'phx_close' collisions
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

        const ignored = setupRealtime();

        return () => {
            if (channel) {
                console.log("Cleaning up channel:", channel.topic);
                const ignored = supabase.removeChannel(channel);
            }
        };
    }, []);

    return (
        <div className="mt-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Active Agents</h2>
            <ul className="space-y-2">
                { players.map(p => (
                    <li key={p.id} className="p-3 bg-slate-800 rounded-lg flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="font-bold text-white">{p.name}</span>
                            { hasDossier && (
                                <div>
                                    <div className="text-xs text-yellow-200 mt-1 flex flex-col gap-2">
                                        <span>Specialization: {p.role}</span>
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1 flex gap-2">
                                        <span className="text-blue-300">Intel: {p.intel} / {p.max_intel}</span>
                                        <span className="text-red-300">Heat: {p.heat}</span>
                                        <span className="text-green-300">Credits: {p.credits} / {p.max_credits}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
}
