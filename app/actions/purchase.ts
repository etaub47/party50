'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export interface ValidationResult {
    status: 'error' | 'owned' | 'poor' | 'confirm';
    message?: string;
    itemName?: string;
    cost?: number;
}

export interface PurchaseResult {
    success: boolean;
    message?: string;
    itemName?: string;
    error?: string;
}

export async function validatePurchase(playerId: string, itemId: string, playerRole: string): Promise<ValidationResult> {
    const supabase = await createClient();

    const { data: item } =
        await supabase.from('item').select('name, cost').eq('id', itemId).single();
    const { data: player } =
        await supabase.from('player').select('credits').eq('id', playerId).single();

    if (!item || !player)
        return { status: 'error', message: 'Data link failure.' };

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
    if (player.credits < itemCost)
        return { status: 'poor', itemName: item.name };

    // success - ready for confirmation overlay
    return { status: 'confirm', itemName: item.name, cost: itemCost };
}

export async function executePurchase(playerId: string, itemId: string, playerRole: string): Promise<PurchaseResult> {
    const supabase = await createClient();

    // the RPC handles the deduction of credits and the addition of the item atomically
    const { error } = await supabase.rpc('purchase_item_with_discount', {
        p_player_id: playerId,
        p_item_id: itemId,
        p_player_role: playerRole
    });

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath('/');
    return { success: true, message: "Acquisition successful." };
}
