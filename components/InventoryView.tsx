'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { InventoryItem } from "@/types/dbtypes";
import ConnectionStatus from "@/components/ConnectionStatus";

const supabase= createClient()

export default function InventoryView({ initialItems, playerId }: {
    initialItems: any[], playerId: string }) {

    const [ isConnected, setIsConnected ] = useState(false);

    const [items, setItems] = useState<InventoryItem[]>(() => {
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
                .select(`player_id, item_id, item:item_id (name, type, intel, heat, credits)`)
                .eq('player_id', playerId);

            if (error)
                console.error("Error fetching inventory:", error.message);

            if (data && !error) {
                const playerItems: InventoryItem[] = data as any as InventoryItem[];

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
                console.log("Cleaning up channel:", channel.topic);
                void supabase.removeChannel(channel);
            }
        };
    }, [playerId]);

    return (
        <div className="mt-4 w-full max-w-md">
            <div className="w-full flex justify-end mb-2">
                <ConnectionStatus isActive={isConnected} />
            </div>
            <h2 className="text-2xl font-bold mb-4">Inventory</h2>
            <ul className="space-y-2">
                {items.map(i => (
                    <li key={`${i.player_id}-${i.item_id}`}
                        className="p-2 bg-yellow-100 border-1 border-black-800 rounded-lg flex grid grid-cols-4 gap-4 justify-items-start">
                        <span className="text-black col-span-2">{i.item!.name}</span>
                        {i.item!.type === 'Intel' && (
                            <span className="bg-black/75 rounded-lg font-sans">
                                <button onClick={() => window.location.reload()} className="text-white">
                                    &nbsp;SHRED&nbsp;
                                </button>
                            </span>
                        )}
                        <span className="justify-self-end">
                            {((i.item!.credits > 0) || (i.item!.credits < 0)) && (
                                <span className="bg-green-700 rounded-lg text-white ml-1 font-mono">
                                    &nbsp;{i.item!.credits > 0 ? `+${i.item!.credits}` : i.item!.credits}&nbsp;
                                </span>
                            )}
                            {i.item!.intel !== 0 && (
                                <span className="bg-blue-700 rounded-lg text-white ml-1 font-mono">
                                    &nbsp;{i.item!.intel > 0 ? `+${i.item!.intel}` : i.item!.intel}&nbsp;
                                </span>
                            )}
                            {i.item!.heat !== 0 && (
                                <span className="bg-red-700 rounded-lg text-white ml-1 font-mono">
                                    &nbsp;{i.item!.heat > 0 ? `+${i.item!.heat}` : i.item!.heat}&nbsp;
                                </span>
                            )}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}
