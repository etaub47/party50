'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { Item } from "@/types/dbtypes";

export interface ValidationResult {
    status: 'error' | 'owned' | 'poor' | 'confirm';
    itemName?: string;
    cost?: number;
}

export interface PurchaseResult {
    success: boolean;
    itemName?: string;
    errorMessage?: string;
}

export async function validatePurchase(playerId: string, itemId: string,
                                       playerRole: string): Promise<ValidationResult> {
    const supabase = await createClient();

    const { data: item } =
        await supabase.from('item').select('name, cost').eq('id', itemId).single();
    const { data: player } =
        await supabase.from('player_stats').select('current_credits').eq('id', playerId).single();

    if (!item || !player)
        return { status: 'error' };

    // check ownership
    const { data: existing } = await supabase
        .from('player_item')
        .select('item_id')
        .eq('player_id', playerId)
        .eq('item_id', itemId)
        .maybeSingle();
    if (existing)
        return { status: 'owned', itemName: item.name };

    // check credits
    let itemCost: number = item.cost;
    if (playerRole === "Bargain Hunter")
        itemCost = Math.floor(itemCost * 0.7);
    if (player.current_credits < itemCost)
        return { status: 'poor', itemName: item.name };

    // success - ready for confirmation overlay
    return { status: 'confirm', itemName: item.name, cost: itemCost };
}

export async function executePurchase(playerId: string, itemId: string,
                                      playerRole: string): Promise<PurchaseResult> {
    const supabase = await createClient();

    // look up the name of the item being purchased
    const { data: data } =
        await supabase.from('item').select('name').eq('id', itemId).single();
    const itemName: string = data ? (data as Item).name : "Item";

    // the RPC handles the deduction of credits and the addition of the item atomically
    const { error } = await supabase.rpc('purchase_item_with_discount', {
        p_player_id: playerId,
        p_item_id: itemId,
        p_player_role: playerRole
    });

    if (error) {
        return { success: false, errorMessage: error.message };
    }

    revalidatePath('/');
    return { success: true, itemName };
}
