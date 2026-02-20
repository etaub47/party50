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

    const { data, error } = await supabase
        .from('player')
        .insert([{ id: playerId, name, role }])
        .select() // This returns the row we just created
        .single();

    if (error)
        return { success: false, error: error.message };

    return { success: true, player: data };
}
