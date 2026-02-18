'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

// initialize OUTSIDE the component to prevent multiple client instances
const supabase= createClient()

export default function ProfileView({ initialPlayerData }: { initialPlayerData: any }) {
    const [player, setPlayer] = useState<any>(initialPlayerData)

    useEffect(() => {
        let channel: any;

        const fetchPlayer = async () => {
            const { data } = await supabase
                .from('player')
                .select('name, role, intel, max_intel, heat, credits, max_credits')
                .eq('id', player.id)
                .single();
            if (data) setPlayer(data);
        };

        const setupRealtime = async () => {
            console.log(player.id)
            const { data: { session } } = await supabase.auth.getSession();
            if (!session || !player.id) return; // don't subscribe if we don't have an ID yet

            // create a unique name for this specific mount instance
            const channelName = `profile-${Date.now()}`;

            channel = supabase
                .channel(channelName) // unique name avoids 'phx_close' collisions
                .on(
                    'postgres_changes' as any,
                    { event: '*', schema: 'public', table: 'player', filter: `id=eq.${player.id}` },
                    (payload: any) => {
                        console.log('Change received!', payload);
                        fetchPlayer();
                    }
                )
                .subscribe((status: string) => {
                    console.log(`Realtime status (${channelName}):`, status);
                    if (status === 'CHANNEL_ERROR') {
                        console.log("Retrying subscription in 1s...");
                        setTimeout(setupRealtime, 1000);
                    }
                });
        };

        setupRealtime();

        return () => {
            if (channel) {
                console.log("Cleaning up channel:", channel.topic);
                supabase.removeChannel(channel);
            }
        };
    }, [player.id]);

    return (
        <div className="mt-8 w-full max-w-md flex flex-col gap-2 items-center">
            <h2 className="text-2xl font-bold mb-4">Agent Profile</h2>
            <span className="text-xl font-bold">{player.name}</span>
            <span className="text-blue-400">Specialization: {player.role}</span>

            <div className="grid grid-cols-2 gap-4 mt-4 w-full text-sm">
                <div className="bg-gray-800 p-3 rounded-lg">
                    <p className="text-gray-400">Intel</p>
                    <p className="font-mono text-yellow-500">{player.intel} / {player.max_intel}</p>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg">
                    <p className="text-gray-400">Heat</p>
                    <p className="font-mono text-red-500">{player.heat}</p>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg col-span-2">
                    <p className="text-gray-400">Credits</p>
                    <p className="font-mono text-green-500">{player.credits} / {player.max_credits} cr</p>
                </div>
            </div>
        </div>
    )
}
