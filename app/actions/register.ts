'use server'

import { createClient } from '@/utils/supabase/server'
import { SupabaseClient } from "@supabase/supabase-js";

export async function registerPlayer(formData: FormData):
    Promise<{ success: boolean; error?: string, player?: any }> {

    const supabase: SupabaseClient<any, "public"> = await createClient()
    const name: string = formData.get('playerName') as string
    const role: string = formData.get('playerRole') as string
    const playerId = formData.get('playerId') as string // Use the ID passed from the client

    if (!playerId)
        return { success: false, error: 'Missing Player ID' };

    // one round trip does the lot: game-status gate, role-balance check, and the insert
    // itself, so two agents registering at the same instant can't both slip past the check.
    const { data, error } = await supabase
        .rpc('register_player', { p_player_id: playerId, p_name: name, p_role: role });

    if (error)
        return { success: false, error: error.message };

    // a set-returning function comes back as rows; there is exactly one
    const player = (data as any[] | null)?.[0];

    return { success: true, player };
}
