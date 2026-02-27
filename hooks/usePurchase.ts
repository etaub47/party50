import { useState } from 'react';
import { validatePurchase, executePurchase } from "@/app/actions/purchase";

export function usePurchase(playerId: string, playerRole: string) {
    const [overlay, setOverlay] = useState<{ type: string, itemName?: string } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastScannedItemId, setLastScannedItemId] = useState<string | null>(null);

    const purchaseItem = async (itemId: string) => {
        if (!playerId) return;
        setLastScannedItemId(itemId);
        const result = await validatePurchase(playerId, itemId, playerRole);

        if (result.status === 'owned') {
            setOverlay({ type: 'ERROR_OWNED', itemName: result.itemName ?? 'Unknown Item' });
        } else if (result.status === 'poor') {
            setOverlay({ type: 'ERROR_CREDITS', itemName: result.itemName ?? 'Unknown Item' });
        } else if (result.status === 'confirm') {
            setOverlay({ type: 'CONFIRM', itemName: result.itemName ?? 'Unknown Item' });
        } else {
            alert(result.message || 'Scan Error');
        }
    };

    const confirmPurchase = async () => {
        if (!playerId || !lastScannedItemId) return;
        setIsProcessing(true);
        const result = await executePurchase(playerId, lastScannedItemId, playerRole);
        setIsProcessing(false);

        if (result.success) {
            setOverlay({ type: 'SUCCESS', itemName: result.itemName || 'Item' });
        } else {
            setOverlay({ type: 'ERROR_GENERIC', itemName: result.error || 'Transaction Failed' });
        }
    };

    return { overlay, isProcessing, purchaseItem, confirmPurchase, setOverlay };
}
