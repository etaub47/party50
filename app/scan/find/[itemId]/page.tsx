'use client'

import { handleItemDiscovery } from "@/app/actions/discoverItem";
import Overlay, { OverlayProps } from "@/components/Overlay";
import { Player } from "@/types/dbtypes";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function BuyItem() {
    const router = useRouter()
    const { itemId } = useParams()
    const supabase = createClient()

    const [ isLoading, setIsLoading ] = useState(true);
    const [ overlayProps, setOverlayProps ] = useState<OverlayProps | null>(null)

    useEffect(() => {
        const handleScan = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user || !itemId)
                { router.push('/'); return; }

            const { data: playerData, error: playerError } = await supabase
                .from('player')
                .select('*')
                .eq('id', session.user.id)
                .single();
            if (!playerData || playerError)
                { router.push('/'); return; }
            const player: Player = playerData as Player;

            const singleItemId = Array.isArray(itemId) ? itemId[0] : itemId;
            const overlayProps: OverlayProps = await handleItemDiscovery(player.id!, player.role!, singleItemId);

            setIsLoading(false);
            setOverlayProps({onClose: () => router.push('/?tab=inventory'), ...overlayProps});
        }
        void handleScan();
    }, [itemId, router])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black text-blue-500 font-mono">
                <div className="animate-pulse">SCANNING ITEM...</div>
            </div>
        );
    }

    if (!overlayProps) return null;
    return (
        <Overlay {...overlayProps} />
    );
}
