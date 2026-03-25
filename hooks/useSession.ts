'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Player } from '@/types/dbtypes'

export function useSession() {
    const [ player, setPlayer ] = useState<Player | null>(null)
    const [ loading, setLoading ] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } =
                await supabase.auth.getSession();
            if (session?.user) {
                const { data } = await supabase
                    .from('player')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                if (data)
                    setPlayer(data as Player);
            }
            setLoading(false);
        }
        void getSession();
    }, [])

    return { player, loading }
}
