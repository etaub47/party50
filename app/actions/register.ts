'use server'
import { createClient } from '@/utils/supabase/server'
import { SupabaseClient } from "@supabase/supabase-js";

export async function registerPlayer(formData: FormData):
    Promise<{ success: boolean; error?: string, player?: any }> {
    const supabase: SupabaseClient<any, "public"> = await createClient()
    const name: string = formData.get('playerName') as string
    const role: string = formData.get('playerRole') as string

    const { data: { user }} = await supabase.auth.getUser()
    if (!user)
        return { success: false, error: 'No active session', player: null }

    const { data, error } = await supabase
        .from('player')
        .insert([{ name, role }])
        .select() // This returns the row we just created
        .single();

    if (error)
        return { success: false, error: error.message, player: null };

    return { success: true, player: data };
}
