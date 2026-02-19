'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

// initialize OUTSIDE the component to prevent multiple client instances
const supabase= createClient()

export default function InventoryView({ initialItems, playerId, onScan }: {
    initialItems: any[], playerId: string, onScan: (id: string) => void }) {

    const [items, setItems] = useState<any[]>(() => {
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

        const ignored = setupRealtime();

        return () => {
            if (channel) {
                console.log("Cleaning up channel:", channel.topic);
                const ignored = supabase.removeChannel(channel);
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

            {/* temporary */}
            <div className="mt-10 p-4 border-2 border-dashed border-gray-600 rounded-lg">
                <h3 className="text-sm font-mono text-gray-400 mb-4 text-center">--- FIELD TEST: ITEM SCANS ---</h3>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => onScan('88372c8f-bb5e-4cb6-8580-58b628b0e527')}
                        className="bg-gray-100 hover:bg-gray-300 text-xs py-2 rounded"
                    >
                        Scan: Laser Cutting Tool
                    </button>
                    <button
                        onClick={() => onScan('707d9af2-6725-4e8c-8fa5-9b42162cec01')}
                        className="bg-gray-100 hover:bg-gray-300 text-xs py-2 rounded"
                    >
                        Scan: Agent Dossier
                    </button>
                </div>
            </div>

        </div>
    )
}
