'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function shredItem(playerId: string, itemId: string): Promise<{success: boolean, error?: string}> {
    const supabase = await createClient();

    console.log(`SHRED: Agent ${playerId} is destroying evidence: ${itemId}`);

    const { error } = await supabase
        .from('player_item')
        .delete()
        .eq('player_id', playerId)
        .eq('item_id', itemId);

    if (error) {
        console.error("SHRED_ERROR:", error.message);
        return { success: false, error: error.message };
    }

    // This ensures any server-side components (like Profile stats)
    // update their data on the next request.
    revalidatePath('/');

    return { success: true };
}
