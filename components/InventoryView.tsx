'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

interface Item { id?: string, name: string, type?: string, intel?: number, heat?: number }
interface PlayerItem { player_id?: string, item_id?: string, item: Item | null }

// initialize OUTSIDE the component to prevent multiple client instances
const supabase= createClient()

export default function InventoryView({ initialItems, playerId }: {
    initialItems: any[], playerId: string }) {

    const [items, setItems] = useState<PlayerItem[]>(() => {
        return [...initialItems].sort((a, b) =>
            (a.item?.name || '').localeCompare(b.item?.name || '')
        );
    })

    useEffect(() => {
        let channel: any;

        const fetchItems = async () => {
            if (!playerId) return;

            const { data, error } = await supabase
                .from('player_item')
                .select(`player_id, item_id, item:item_id (name, type, intel, heat)`)
                .eq('player_id', playerId);

            if (error)
                console.error("Error fetching inventory:", error.message);

            if (data && !error) {
                const playerItems: PlayerItem[] = data as any as PlayerItem[];

                // since we can't easily order by a joined column in the query without complex syntax, we sort with JS
                const sortedData = playerItems?.sort((a, b) =>
                    (a.item?.name || '').localeCompare(b.item?.name || '')
                ) || [];

                setItems(sortedData);
            }
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

        void setupRealtime();

        return () => {
            if (channel) {
                console.log("Cleaning up channel:", channel.topic);
                void supabase.removeChannel(channel);
            }
        };
    }, [playerId]);

    return (
        <div className="mt-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Inventory</h2>
            <ul className="space-y-2">
                {items.map(i => (
                    <li key={`${i.player_id}-${i.item_id}`} className="p-2 bg-blue-800 rounded-lg flex justify-between">
                        <span className="text-white">{i.item?.name} <span className="text-xs text-white">{/* ({i.item?.type}) */}</span></span>
                        {/* <span className="font-mono text-yellow-500">{i.item?.intel}/{i.item?.heat}</span> */}
                    </li>
                ))}
            </ul>
        </div>
    )
}
