'use client'

import { shredItem } from "@/app/actions/shredItem";
import Overlay, { OverlayProps } from "@/components/Overlay";
import { useState } from 'react'
import { InventoryItem } from "@/types/dbtypes";
import ConnectionStatus from "@/components/ConnectionStatus";

export default function InventoryView({ items, playerId, isConnected }: {
    items: InventoryItem[], playerId: string, isConnected: boolean }) {
    const [ overlayProps, setOverlayProps ] = useState<OverlayProps | null>(null);
    const [ isShredding, setIsShredding ] = useState(false);

    const initiateShred = (itemId: string, itemName: string) => {
        setOverlayProps({
            title: 'CONFIRM DESTRUCTION',
            message: `Are you sure you want to shred the ${itemName}? This evidence will be permanently destroyed, and its Intel value lost.`,
            type: 'CONFIRM',
            onConfirm: () => executeShred(itemId),
            onClose: () => setOverlayProps(null),
            isProcessing: isShredding
        });
    };

    const executeShred = async (itemId: string) => {
        setIsShredding(true);
        setOverlayProps(prev => prev ? { ...prev, isProcessing: true } : null);
        const result: { success: boolean, error?: string } = await shredItem(playerId, itemId);
        setIsShredding(false);
        if (result.success) {
            setOverlayProps(null);
        } else {
            setOverlayProps({
                title: 'MECHANICAL FAILURE',
                message: `The shredder jammed: ${result.error}. Please try again.`,
                type: 'ERROR',
                onClose: () => setOverlayProps(null)
            });
        }
    };

    if (items.length === 0)
        return <div className="p-8 text-center text-gray-500">No items collected.</div>

    return (
        <div className="mt-4 w-full max-w-md">
            <div className="w-full flex justify-end mb-2">
                <ConnectionStatus isActive={isConnected} />
            </div>
            <h2 className="text-2xl font-bold mb-4">Inventory</h2>
            <ul className="space-y-2">
                {items.map(i => (
                    <li key={`${i.player_id}-${i.item_id}`}
                        className="p-2 bg-yellow-100 border-1 border-black-800 rounded-lg flex grid grid-cols-4 gap-4 justify-items-start">
                        <span className="text-black col-span-2">{i.item!.name}</span>
                        {i.item!.type === 'Intel' && (
                            <span className="bg-black/75 rounded-lg font-sans">
                                <button onClick={() => initiateShred(i.item_id!, i.item!.name)} className="text-white">
                                    &nbsp;SHRED&nbsp;
                                </button>
                            </span>
                        )}
                        {i.item!.type !== 'Intel' && (
                            <span>&nbsp;</span>
                        )}
                        <span className="justify-self-end">
                            {i.item!.credits !== 0 && (
                                <span className="bg-green-700 rounded-lg text-white ml-1 font-mono">
                                    &nbsp;{i.item!.credits > 0 ? `+${i.item!.credits}` : i.item!.credits}&nbsp;
                                </span>
                            )}
                            {i.item!.cost !== 0 && (
                                <span className="bg-green-700 rounded-lg text-white ml-1 font-mono">
                                    &nbsp;{`-${i.item!.cost}`}&nbsp;
                                </span>
                            )}
                            {i.item!.intel !== 0 && (
                                <span className="bg-blue-700 rounded-lg text-white ml-1 font-mono">
                                    &nbsp;{i.item!.intel > 0 ? `+${i.item!.intel}` : i.item!.intel}&nbsp;
                                </span>
                            )}
                            {i.item!.heat !== 0 && (
                                <span className="bg-red-700 rounded-lg text-white ml-1 font-mono">
                                    &nbsp;{i.item!.heat > 0 ? `+${i.item!.heat}` : i.item!.heat}&nbsp;
                                </span>
                            )}
                        </span>
                    </li>
                ))}
            </ul>
            {overlayProps && <Overlay {...overlayProps} />}
        </div>
    )
}
