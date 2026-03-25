'use client'

import { handleItemDiscovery } from "@/app/actions/discoverItem";
import Overlay, { OverlayProps } from "@/components/Overlay";
import { useSession } from "@/hooks/useSession";
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function FindItem() {
    const router = useRouter();
    const { player, loading: sessionLoading } = useSession();
    const { itemId } = useParams();
    const [ overlayProps, setOverlayProps ] = useState<OverlayProps | null>(null);
    const [ hasScanned, setHasScanned ] = useState(false);

    useEffect(() => {
        if (sessionLoading) return;
        if (!player) { router.push('/'); return; }
        const handleScan = async () => {
            if (hasScanned || !itemId) return;
            setHasScanned(true);
            const singleItemId = Array.isArray(itemId) ? itemId[0] : itemId;
            const overlayProps: OverlayProps = await handleItemDiscovery(player!.id!, player!.role!, singleItemId);
            setOverlayProps({ onClose: () => router.push('/'), ...overlayProps });
        }
        void handleScan();
    }, [player, sessionLoading, itemId, hasScanned, router])

    return (
        <div className="min-h-screen bg-black flex items-center justify-center font-mono">
            {(sessionLoading || !overlayProps) &&
                <div className="text-green-500 animate-pulse text-sm">SCANNING ITEM...</div>
            }
            {overlayProps && <Overlay {...overlayProps} />}
        </div>
    );
}
