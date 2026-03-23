import { useState } from 'react';
import { validatePurchase, executePurchase, PurchaseResult } from "@/app/actions/purchaseItem";
import { OverlayProps } from "@/components/Overlay";

export function usePurchase(playerId: string, playerRole: string) {
    const [ purchaseOverlay, setPurchaseOverlay ] = useState<OverlayProps | null>(null);
    const [ isProcessing, setIsProcessing ] = useState(false);

    // perform checks and validations before purchasing an item
    const purchaseItem = async (itemId: string) => {
        if (!playerId)
            return;

        const result =
            await validatePurchase(playerId, itemId, playerRole);

        if (result.status === 'owned') {
            setPurchaseOverlay({
                title: 'Purchase Failure',
                message: `You already possess the ${result.itemName}.`,
                type: 'ERROR',
                onClose: () => setPurchaseOverlay(null)
            });
        } else if (result.status === 'poor') {
            setPurchaseOverlay({
                title: 'Purchase Failure',
                message: `Insufficient credits to acquire the ${result.itemName}.`,
                type: 'ERROR',
                onClose: () => setPurchaseOverlay(null)
            });
        } else if (result.status === 'confirm') {
            setPurchaseOverlay({
                title: 'Confirm Purchase',
                message: `Confirm acquisition of the ${result.itemName} for ${result.cost} credits?`,
                type: 'CONFIRM',
                onConfirm: () => { confirmPurchase(itemId); },
                onClose: () => setPurchaseOverlay(null)
            });
        } else /* error */ {
            setPurchaseOverlay({
                title: 'Scan Error',
                message: `Data link failure`,
                type: 'ERROR',
                onClose: () => setPurchaseOverlay(null)
            });
        }
    };

    // purchase an item
    const confirmPurchase = async (itemId: string) => {
        if (!playerId || !itemId)
            return;

        setIsProcessing(true);
        const result: PurchaseResult =
            await executePurchase(playerId, itemId, playerRole);
        setIsProcessing(false);

        if (result.success) {
            setPurchaseOverlay({
                title: 'Acquisition Complete',
                message: `${result.itemName ?? 'Item'} has been added to your inventory.`,
                type: 'SUCCESS',
                onClose: () => setPurchaseOverlay(null)
            });
        } else {
            setPurchaseOverlay({
                title: 'Transaction Failed',
                message: `${result.errorMessage}`,
                type: 'ERROR',
                onClose: () => setPurchaseOverlay(null)
            });
        }
    };

    return { purchaseOverlay, isProcessing, purchaseItem };
}
