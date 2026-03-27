'use client'

import { executeTransfer } from "@/app/actions/transferCredits";
import Overlay, { OverlayProps } from "@/components/Overlay";
import { PlayerStats } from "@/types/dbtypes";
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import ConnectionStatus from "@/components/ConnectionStatus";

const supabase= createClient()

export default function Leaderboard({ hasDossier, activePlayerData }: {
    hasDossier: boolean,
    activePlayerData: PlayerStats | null
}) {
    const [ players, setPlayers ] = useState<any[]>([])
    const [ isConnected, setIsConnected ] = useState(false);
    const [overlayProps, setOverlayProps] = useState<OverlayProps | null>(null);

    const initiateTransfer = (targetAgent: PlayerStats) => {
        if (!activePlayerData)
            return;
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
        if (!activePlayerData)
            return;
        setOverlayProps(prev => prev ? { ...prev, isProcessing: true } : null);

        const result = await executeTransfer(
            activePlayerData.id,
            activePlayerData.name,
            targetAgent.id!,
            targetAgent.name!,
            amount
        );

        if (result.success) {
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

    useEffect(() => {
        let channel: any;

        const fetchPlayers = async () => {
            const { data } = await supabase
                .from('player_stats')
                .select('*')
                .order('total_intel', { ascending: false })
                .order('total_heat', { ascending: true });
            if (data) setPlayers(data as PlayerStats[]);
        };

        const setupRealtime = async () => {
            if (channel)
                await supabase.removeChannel(channel);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session)
                return;

            await fetchPlayers();

            const channelName = `leaderboard-${Date.now()}`;
            channel = supabase
                .channel(channelName) // unique name avoids 'phx_close' collisions
                .on(
                    'postgres_changes' as any,
                    { event: '*', schema: 'public', table: 'player' },
                    () => fetchPlayers()
                )
                .on(
                    'postgres_changes' as any,
                    { event: '*', schema: 'public', table: 'player_item' },
                    () => fetchPlayers()
                )
                .on(
                    'postgres_changes' as any,
                    { event: '*', schema: 'public', table: 'player_event' },
                    () => fetchPlayers()
                )
                .subscribe((status: string) => {
                    console.log(`Realtime status (${channelName}):`, status);
                    setIsConnected(status === 'SUBSCRIBED');
                    const isFailure = status === 'CHANNEL_ERROR' || status === 'TIMED_OUT';
                    if (isFailure) {
                        console.log("Retrying subscription in 2s...");
                        setTimeout(() => {
                            void setupRealtime();
                        }, 2000);
                    }
                });
        };

        void setupRealtime();

        return () => {
            if (channel) {
                console.log("Cleaning up channel:", channel.topic);
                void supabase.removeChannel(channel);
            }
        };
    }, []);

    return (
        <div className="mt-4 w-full max-w-md">
            <div className="w-full flex justify-end mb-2">
                <ConnectionStatus isActive={isConnected} />
            </div>
            <h2 className="text-2xl font-bold mb-4">Active Agents</h2>
            <ul className="space-y-2">
                { players.map(p => (
                    <li key={p.id} className="p-3 bg-slate-800 rounded-lg flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="font-bold text-white">
                                {p.name} {activePlayerData?.id === p.id && "(YOU)"}
                            </span>
                            { hasDossier && (
                                <div>
                                    <div className="text-xs text-yellow-200 mt-1 flex flex-col gap-2">
                                        <span>Specialization: {p.role}</span>
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1 flex gap-2">
                                        <span className="text-blue-300">Intel: {p.total_intel} / {p.max_intel}</span>
                                        <span className="text-red-300">Heat: {p.total_heat}</span>
                                        <span className="text-green-300">Credits: {p.current_credits} / {p.max_credits}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {activePlayerData && activePlayerData?.id !== p.id && (
                            <button
                                onClick={() => initiateTransfer(p)}
                                className="bg-green-900/40 hover:bg-green-700 text-green-400 hover:text-white border border-green-500/30 text-[10px] font-bold py-1 px-3 rounded transition-all font-mono"
                            >
                                GIVE $
                            </button>
                        )}
                    </li>
                ))}
            </ul>
            {overlayProps && <Overlay {...overlayProps} />}
        </div>
    )
}
