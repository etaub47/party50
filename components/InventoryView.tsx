'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

// initialize OUTSIDE the component to prevent multiple client instances
const supabase= createClient()

export default function InventoryView({ initialItems, playerId }: { initialItems: any[], playerId: string }) {
    const [items, setItems] = useState<any[]>(initialItems)

    useEffect(() => {
        let channel: any;

        const fetchItems = async () => {
            const { data, error } = await supabase
                .from('player_item')
                .select(`id, item:item_id (name, type, intel, heat)`)
                .eq('player_id', playerId);

            if (error) {
                console.error("Error fetching inventory:", error.message);
                return;
            }

            // since we can't easily order by a joined column in the query without complex syntax, we sort with JS
            const sortedData = data?.sort((a, b) =>
                (a.item?.name || '').localeCompare(b.item?.name || '')
            ) || [];

            setItems(sortedData);
        };

        const setupRealtime = async () => {
            if (!playerId) return; // don't subscribe if we don't have an ID yet
            await supabase.auth.getSession();

            // create a unique name for this specific mount instance
            const channelName = `inventory-${Date.now()}`;

            channel = supabase
                .channel(channelName) // unique name avoids 'phx_close' collisions
                .on(
                    'postgres_changes' as any,
                    { event: '*', schema: 'public', table: 'player_item', filter: `player_id=eq.${playerId}` },
                    (payload: any) => {
                        console.log('Change received!', payload);
                        fetchItems();
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
    }, [playerId]);

    return (
        <div className="mt-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Inventory</h2>
            <ul className="space-y-2">
                {items.map(i => (
                    <li key={i.id} className="p-3 bg-gray-800 rounded-lg flex justify-between">
                        <span>{i.name} <span className="text-xs text-blue-400">({i.type})</span></span>
                        {/* <span className="font-mono text-yellow-500">{i.intel}/{i.heat}</span> */}
                    </li>
                ))}
            </ul>
        </div>
    )
}
