'use client'

import { shredItem } from "@/app/actions/shredItem";
import Overlay, { OverlayProps } from "@/components/Overlay";
import { useState } from 'react'
import { InventoryItem } from "@/types/dbtypes";
import ConnectionStatus from "@/components/ConnectionStatus";
import Link from 'next/link';

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
        <div className="mt-4 w-full max-w-md mx-auto px-2">
            <div className="w-full flex justify-end mb-2">
                <ConnectionStatus isActive={isConnected} />
            </div>
            <h2 className="text-2xl font-bold mb-4">Inventory</h2>
            <ul className="space-y-2">
                {items.map(i => (
                    <li
                        key={`${i.player_id}-${i.item_id}`}
                        className="px-3 py-2 bg-yellow-100 border border-slate-800 rounded-xl flex flex-col gap-2 font-mono shadow-sm"
                    >
                        <div className="flex items-center justify-between min-w-0">
            <span className="text-black font-bold text-sm tracking-wide uppercase truncate">
                {i.item!.name}
            </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/10">

                            <div className="flex flex-wrap gap-1.5 items-center">
                                {i.item!.credits !== 0 && (
                                    <span className="bg-green-700 text-white text-[10px] font-bold px-2 py-0.5
                                      rounded-md shadow-sm whitespace-nowrap">
                                        {i.item!.credits > 0 ? `+${i.item!.credits}` : i.item!.credits} CREDITS
                                    </span>
                                )}
                                {i.item!.cost !== 0 && (
                                    <span className="bg-green-700 text-white text-[10px] font-bold px-2 py-0.5
                                      rounded-md shadow-sm whitespace-nowrap">
                                        -{i.item!.cost} CREDITS
                                    </span>
                                )}
                                {i.item!.intel !== 0 && (
                                    <span className="bg-blue-700 text-white text-[10px] font-bold px-2 py-0.5
                                      rounded-md shadow-sm whitespace-nowrap">
                                        {i.item!.intel > 0 ? `+${i.item!.intel}` : i.item!.intel} INTEL
                                    </span>
                                )}
                                {i.item!.heat !== 0 && (
                                    <span className="bg-red-700 text-white text-[10px] font-bold px-2 py-0.5
                                      rounded-md shadow-sm whitespace-nowrap">
                                        {i.item!.heat > 0 ? `+${i.item!.heat}` : i.item!.heat} HEAT
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center shrink-0">
                                {i.item!.type === 'Intel' && (
                                    <button
                                        onClick={() => initiateShred(i.item_id!, i.item!.name)}
                                        className="bg-black/85 text-white text-[10px] font-sans font-bold px-3 py-1 rounded-md hover:bg-black transition-all"
                                    >
                                        SHRED
                                    </button>
                                )}
                                {i.item!.name === 'Recon Readout' && (
                                    <Link
                                        href="/recon-readout"
                                        className="bg-blue-900 text-blue-100 text-[10px] font-sans font-bold px-3 py-1 rounded-md hover:bg-blue-800 transition-all text-center"
                                    >
                                        VIEW
                                    </Link>
                                )}
                            </div>

                        </div>
                    </li>
                ))}
            </ul>
            {overlayProps && <Overlay {...overlayProps} />}
        </div>
    )
}
