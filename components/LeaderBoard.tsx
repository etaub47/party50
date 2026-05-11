'use client'

import { executeTransfer } from "@/app/actions/transferCredits";
import { executeLegalAdvice } from "@/app/actions/legalAdvice";
import Overlay, { OverlayProps } from "@/components/Overlay";
import { InventoryItem, PlayerStats } from "@/types/dbtypes";
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import ConnectionStatus from "@/components/ConnectionStatus";

const supabase = createClient()

export default function Leaderboard({ playerStats, items, isActive, isConnected }: {
    playerStats: PlayerStats | null,
    items: InventoryItem[],
    isActive: boolean
    isConnected: boolean
}) {
    const [ players, setPlayers ] = useState<PlayerStats[]>([])
    const [ overlayProps, setOverlayProps ] = useState<OverlayProps | null>(null);
    const [ advisedRecipientIds, setAdvisedRecipientIds ] = useState<Set<string>>(new Set());

    const isLawyer: boolean = playerStats?.role === 'Lawyer';
    const hasDossier: boolean | undefined = items?.some(row => row.item?.name === 'Agent Dossier');

    const initiateTransfer = (targetAgent: PlayerStats) => {
        if (!playerStats) return;
        setOverlayProps({
            title: 'SECURE WIRE TRANSFER',
            message: `Enter the credit amount to authorize to ${targetAgent.name}.`,
            type: 'INPUT',
            inputType: 'number',
            onConfirmValue: (amount) => handleTransfer(targetAgent, amount),
            onClose: () => setOverlayProps(null)
        });
    };

    const handleTransfer = async (targetAgent: PlayerStats, amount: string) => {
        if (!playerStats)
            return;
        setOverlayProps(prev => prev ? { ...prev, isProcessing: true } : null);

        const result = await executeTransfer(
            playerStats.id,
            playerStats.name,
            targetAgent.id!,
            targetAgent.name!,
            amount
        );

        if (result.success) {
            void fetchPlayers();
            setOverlayProps({
                title: 'TRANSFER SUCCESSFUL',
                message: `Funds have been successfully routed to ${targetAgent.name}.`,
                type: 'SUCCESS',
                onClose: () => setOverlayProps(null)
            });
        } else {
            setOverlayProps({
                title: 'TRANSACTION REFUSED',
                message: result.error || 'The encryption handshake failed.',
                type: 'ERROR',
                onClose: () => setOverlayProps(null)
            });
        }
    };

    const initiateLegalAdvice = (targetAgent: PlayerStats) => {
        if (!playerStats)
            return;
        const isSelf = playerStats.id === targetAgent.id;

        setOverlayProps({
            title: isSelf ? 'CONFIRM SELF-COUNSEL' : 'OFFER LEGAL ADVICE',
            message: isSelf ? "Take your own legal advice?" : `Give legal counsel to ${targetAgent.name}?`,
            type: 'CONFIRM',
            onConfirm: () => handleLegalAdvice(targetAgent),
            onClose: () => setOverlayProps(null)
        });
    };

    const handleLegalAdvice = async (targetAgent: PlayerStats) => {
        if (!playerStats)
            return;
        const isSelf = playerStats.id === targetAgent.id;
        setOverlayProps(prev => prev ? { ...prev, isProcessing: true } : null);
        const result = await executeLegalAdvice(
            playerStats.id,
            playerStats.name,
            targetAgent.id!
        );

        if (result.success) {
            void fetchPlayers();
            setOverlayProps({
                title: isSelf ? 'PROTECTIONS APPLIED' : 'COUNSEL APPLIED',
                message: isSelf
                    ? "You have successfully applied legal protections to your own file."
                    : `You have given legal advice to ${targetAgent.name}.`,
                type: 'SUCCESS',
                onClose: () => setOverlayProps(null)
            });
        } else {
            setOverlayProps({
                title: 'LEGAL FILING ERROR',
                message: result.error || 'Could not process legal advice.',
                type: 'ERROR',
                onClose: () => setOverlayProps(null)
            });
        }
    };

    const fetchPlayers = useCallback(async () => {
        const { data } = await supabase
            .from('player_stats')
            .select('*')
            .order('total_intel', { ascending: false })
            .order('total_heat', { ascending: true });
        if (data)
            setPlayers(data as PlayerStats[]);
    }, []);

    const fetchAdviceHistory = useCallback(async () => {
        if (!playerStats || playerStats.role !== 'Lawyer')
            return;
        const { data } = await supabase
            .from('lawyer_advice')
            .select('recipient_id')
            .eq('lawyer_id', playerStats.id);
        if (data) {
            const ids = data.map((row: any) => row['recipient_id'] as string);
            setAdvisedRecipientIds(new Set(ids));
        }
    }, [playerStats?.id, playerStats?.role]);

    useEffect(() => {
        if (isActive) {
            void fetchPlayers();
            void fetchAdviceHistory();
        }
    }, [isActive, fetchPlayers]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isActive) {
            interval = setInterval(() => {
                console.log("⏲️ Auto-refreshing leaderboard...");
                void fetchPlayers();
                void fetchAdviceHistory();
            }, 30000);
        }
        return () => {
            if (interval)
                clearInterval(interval);
        };
    }, [isActive, fetchPlayers]);

    return (
        <div className="mt-4 w-full max-w-md">
            <div className="w-full flex justify-end mb-2">
                <ConnectionStatus isActive={isConnected} />
            </div>
            <h2 className="text-2xl font-bold mb-4">Active Agents</h2>
            <ul className="space-y-2">
                {players.map(p => {
                    const hasReceivedAdvice = advisedRecipientIds.has(p.id);
                    const isSelf = playerStats?.id === p.id;

                    return (
                        <li key={p.id} className="p-2 border-1 border-black-800 bg-blue-100 rounded-lg flex justify-between items-center">
                            <div className="flex flex-col">
                                <span className="text-black">
                                    {p.name} {isSelf && "(YOU)"}
                                </span>
                                {hasDossier && (
                                    <div className="text-xs mt-1">
                                        <div className="text-yellow-200 mb-1">Specialization: {p.role}</div>
                                        <div className="text-gray-400 flex gap-2 font-mono text-[10px]">
                                            <span className="text-blue-300">INT: {p.total_intel}</span>
                                            <span className="text-red-300">HEA: {p.total_heat}</span>
                                            <span className="text-green-300">CRD: {p.current_credits}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                {isLawyer && (
                                    <button
                                        disabled={hasReceivedAdvice}
                                        onClick={() => initiateLegalAdvice(p)}
                                        className={`text-[10px] font-bold py-1 px-2 rounded transition-all font-mono border ${
                                            hasReceivedAdvice
                                                ? 'bg-red-700/80 text-white border-red-900 cursor-not-allowed'
                                                : 'bg-red-700/80 text-white border-red-900'
                                        }`}
                                    >
                                        {hasReceivedAdvice ? 'ADVISED' : (isSelf ? 'TAKE ADVICE' : 'ADVISE')}
                                    </button>
                                )}

                                {playerStats && !isSelf && (
                                    <button
                                        onClick={() => initiateTransfer(p)}
                                        className="bg-green-800/80 text-white border border-green-900 text-[10px] font-bold py-1 px-2 rounded transition-all font-mono"
                                    >
                                        GIVE $
                                    </button>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>
            {overlayProps && <Overlay {...overlayProps} />}
        </div>
    )
}
