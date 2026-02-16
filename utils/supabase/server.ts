import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            // Cast 'options' to 'any' or a compatible type to bypass the strict check
                            cookieStore.set({ name, value, ...(options as any) })
                        )
                    } catch {
                        // This can be ignored if middleware is handling session refreshes
                    }
                }
            },
        }
    )
}
