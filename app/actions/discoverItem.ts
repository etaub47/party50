'use server'

import { OverlayProps } from "@/components/Overlay";
import { InventoryItem } from "@/types/dbtypes";
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function handleItemDiscovery(playerId: string, playerRole: string, itemId: string): Promise<OverlayProps> {
    const supabase = await createClient();

    // get the item details (so we know what it is)
    const { data: itemData, error: itemError } = await supabase
        .from('item')
        .select('name')
        .eq('id', itemId)
        .single();
    if (itemError || !itemData)
        return { type: 'ERROR', title: 'INVALID SIGNATURE', message: "This scan point is unrecognized." };

    // find ONLY the very first person who ever grabbed this item
    const { data: firstFinderData, error: firstFinderError } = await supabase
        .from('player_item')
        .select(`player_id, created_at, player:player_id ( name )`)
        .eq('item_id', itemId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
    if (firstFinderError)
        return { type: 'ERROR', title: 'UNEXPECTED ERROR', message: "Error looking up claim." };
    const firstFinder: InventoryItem | null = firstFinderData ? firstFinderData as InventoryItem : null;

    // check if CURRENT player already has it
    const { data: myClaimData, error: myClaimError } = await supabase
        .from('player_item')
        .select('created_at')
        .eq('item_id', itemId)
        .eq('player_id', playerId)
        .maybeSingle();
    const myClaim: InventoryItem | null = myClaimData ? myClaimData as InventoryItem : null;
    if (myClaimError)
        return { type: 'ERROR', title: 'UNEXPECTED ERROR', message: "Error looking up claim." };
    if (myClaim)
        return { type: 'INFO', title: 'DATA ALREADY SYNCED', message: `You have already recovered the ${itemData.name}.` };

    const isScavenger = playerRole === 'Scavenger';
    if (firstFinder && !isScavenger) {
        const timeStr = new Date(firstFinder.created_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return {
            type: 'INFO',
            title: 'RESOURCE EXHAUSTED',
            message: `Agent ${firstFinder.player!.name} already stripped this location at ${timeStr}. The ${itemData.name} is gone.`
        };
    }

    // the award
    const { error: insertError } = await supabase
        .from('player_item')
        .insert({ player_id: playerId, item_id: itemId });
    if (insertError)
        return { type: 'ERROR', title: 'LINK FAILURE', message: "Transmission interrupted." };

    revalidatePath('/');
    return {
        type: 'SUCCESS',
        title: 'ITEM SECURED',
        message: isScavenger && firstFinder
            ? `Scavenger Bonus: You recovered the ${itemData.name} overlooked by ${firstFinder.player!.name}!`
            : `You secured the ${itemData.name}. Intel uploaded to inventory.`
    };
}
