'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

interface Item { id: string, name: string, cost: number }
interface Player { id: string, credits: number }

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

export async function validatePurchase(playerId: string, itemId: string): Promise<ValidationResult> {
    const supabase = await createClient();

    const { data: item } =
        await supabase.from('item').select('name, cost').eq('id', itemId).single();
    const { data: player } =
        await supabase.from('player').select('credits').eq('id', playerId).single();

    if (!item || !player) return { status: 'error', message: 'Data link failure.' };

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
    if (player.credits < item.cost)
        return { status: 'poor', itemName: item.name };

    // success - ready for confirmation overlay
    return { status: 'confirm', itemName: item.name, cost: item.cost };
}

export async function executePurchase(playerId: string, itemId: string): Promise<PurchaseResult> {
    const supabase = await createClient()

    // fetch item cost and player credits
    const { data: itemData, error: itemError } = await supabase
        .from('item')
        .select('cost, name')
        .eq('id', itemId)
        .single()
    const { data: playerData, error: playerError } = await supabase
        .from('player')
        .select('credits')
        .eq('id', playerId)
        .single()

    if (itemError || playerError || !itemData || !playerData)
        return { success: false, error: "Verification failed." }

    const item = itemData as Item;
    const player = playerData as Player;

    // validation: check if player already owns the item
    const { data: existing } = await supabase
        .from('player_item')
        .select('item_id')
        .eq('player_id', playerId)
        .eq('item_id', itemId)
        .maybeSingle()

    if (existing) return { success: false, error: `You already possess the ${item.name}.` }

    // validation: check if player has enough credits
    if (player.credits < item.cost) {
        return { success: false, error: "Insufficient credits for this acquisition." }
    }

    // atomic operation (ideally wrap this in a transaction)
    const { error: updateError } = await supabase
        .from('player')
        .update({ credits: player.credits - item.cost })
        .eq('id', playerId)

    if (updateError) return { success: false, error: "Transaction failed." }

    const { error: insertError } = await supabase
        .from('player_item')
        .insert({ player_id: playerId, item_id: itemId })

    if (insertError) return { success: false, error: "Item delivery failed." }

    revalidatePath('/')
    return { success: true, itemName: item.name, message: `${item.name} acquired successfully.` }
}
