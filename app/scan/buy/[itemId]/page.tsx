'use client'

import { executePurchase, validatePurchase } from "@/app/actions/purchaseItem";
import Overlay, { OverlayProps } from "@/components/Overlay";
import { useSession } from "@/hooks/useSession";
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function BuyItem() {
    const router = useRouter()
    const { player, loading: sessionLoading } = useSession();
    const { itemId } = useParams()
    const [ overlayProps, setOverlayProps ] = useState<OverlayProps | null>(null)
    const [ hasScanned, setHasScanned ] = useState(false);

    useEffect(() => {
        if (sessionLoading) return;
        if (!player) { router.push('/'); return; }

        const startPurchaseFlow = async () => {
            if (hasScanned || !itemId) return;
            setHasScanned(true);
            const singleItemId = Array.isArray(itemId) ? itemId[0] : itemId;
            const result = await validatePurchase(player.id!, singleItemId, player.role!);
            if (result.status === 'owned') {
                setOverlayProps({
                    title: 'OWNERSHIP DETECTED',
                    message: `Your biometric signature is already linked to the ${result.itemName}.`,
                    type: 'INFO',
                    onClose: () => router.push('/')
                });
            } else if (result.status === 'poor') {
                setOverlayProps({
                    title: 'INSUFFICIENT FUNDS',
                    message: `Acquiring the ${result.itemName} requires more credits than your balance allows.`,
                    type: 'ERROR',
                    onClose: () => router.push('/')
                });
            } else if (result.status === 'confirm') {
                setOverlayProps({
                    title: 'CONFIRM ACQUISITION',
                    message: `Authorize transfer of ${result.cost} credits for the ${result.itemName}?`,
                    type: 'CONFIRM',
                    onConfirm: () => performPurchase(singleItemId),
                    onClose: () => router.push('/')
                });
            } else {
                setOverlayProps({
                    title: 'LINK ERROR',
                    message: 'Terminal offline.',
                    type: 'ERROR',
                    onClose: () => router.push('/')
                });
            }
        };
        void startPurchaseFlow();
    }, [player, sessionLoading, itemId, hasScanned, router]);

    const performPurchase = async (id: string) => {
        setOverlayProps(prev => prev ? { ...prev, isProcessing: true } : null);
        const final = await executePurchase(player!.id!, id, player!.role!);

        if (final.success) {
            setOverlayProps({
                title: 'TRANSACTION COMPLETE',
                message: 'Hardware registered. Check your inventory for deployment.',
                type: 'SUCCESS',
                onClose: () => router.push('/')
            });
        } else {
            setOverlayProps({
                title: 'ENCRYPTION FAILURE',
                message: final.errorMessage || 'Purchase failed.',
                type: 'ERROR',
                onClose: () => router.push('/')
            });
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center font-mono">
            {(sessionLoading || !overlayProps) &&
                <div className="text-green-500 animate-pulse text-sm">INITIALIZING SECURE HANDSHAKE...</div>
            }
            {overlayProps && <Overlay {...overlayProps} />}
        </div>
    );
}
