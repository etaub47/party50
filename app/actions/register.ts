'use server'
import { createClient } from '@/utils/supabase/server'
import { SupabaseClient } from "@supabase/supabase-js";

export async function registerPlayer(formData: FormData): Promise<{ success: boolean; error?: string }> {
    const supabase: SupabaseClient<any, "public"> = await createClient()
    const name: string = formData.get('playerName') as string
    const role: string = formData.get('playerRole') as string

    const { data: { user }} = await supabase.auth.getUser()

    if (!user)
        return { success: false, error: 'No active session' }

    // 2. Insert or Update the player row
    const response=
        await supabase.from('player').upsert({
            id: user.id,
            name: name,
            role: role,
            credits: 20,
            max_intel: 200,
            max_credits: 100
        })

    return { success: !response.error, error: response.error?.message }
}
