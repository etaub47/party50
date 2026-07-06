'use client'

import { Mission } from "@/types/types";
import { RealtimeChannel } from "@supabase/realtime-js";
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Overlay, { OverlayProps } from "@/components/Overlay";
import ConnectionStatus from "@/components/ConnectionStatus";

const supabase = createClient()

export default function WaitingRoom({ teamId, missionData, playerId, onStart, onAbort, onTerminate }: {
    teamId: string,
    missionData: Mission,
    playerId: string,
    onStart: () => void,
    onAbort: () => void,
    onTerminate: () => void
}) {
    const [ currentCount, setCurrentCount ] = useState(0)
    const [ isConnected, setIsConnected ] = useState(false);
    const [ overlayProps, setOverlayProps ] = useState<OverlayProps | null>(null);

    const isRetryingRef = useRef(false);

    const updateTeamStatus = async () => {

        // fetch current count for UI and logic gating
        const { count } = await supabase
            .from('player_challenge')
            .select('status', { count: 'exact' })
            .eq('team_id', teamId);

        const actualCount = count || 0;
        setCurrentCount(actualCount);

        // only proceed if the room is full
        if (actualCount >= missionData.requirements.min_players) {

            // verify required hardware asset across the whole team
            if (missionData.requirements.required_item_id) {
                const { data: teamPlayers } = await supabase
                    .from('player_challenge')
                    .select('player_id')
                    .eq('team_id', teamId);

                const teamPlayerIds = (teamPlayers || [])
                    .map(p => p.player_id)
                    .filter((id): id is string => id !== null);

                const { data: matchingItems } = await supabase
                    .from('player_item')
                    .select('item_id')
                    .eq('item_id', missionData.requirements.required_item_id)
                    .in('player_id', teamPlayerIds);

                const teamHasAsset = matchingItems && matchingItems.length > 0;

                if (!teamHasAsset) {
                    const { data: requiredItem } = await supabase
                        .from('item')
                        .select('name')
                        .eq('id', missionData.requirements.required_item_id)
                        .single<{ name: string | null }>();

                    setOverlayProps({
                        title: 'ACCESS RESTRICTED',
                        message: `This operation requires specialized hardware [${requiredItem?.name ?? 'UNKNOWN ASSET'}]. No team member has the required tool in their inventory.`,
                        type: 'ERROR',
                        onClose: () => onAbort()
                    });
                    return;
                }
            }

            // check for collusion
            const { data: isRepeatTrio, error: rpcError } = await supabase
                .rpc('check_team_collusion', { p_team_id: teamId });
            if (rpcError) {
                console.error("Collusion Check Error:", rpcError);
                return;
            }

            // check to make sure that these same three players haven't already done a mission together
            // otherwise, flip MY status to IN_PROGRESS and start the mission
            if (isRepeatTrio) {
                setOverlayProps({
                    title: 'MISSION COMPROMISED',
                    message: "This specific trio is drawing too much suspicion. You have aborted the mission to avoid detection.",
                    type: 'ERROR',
                    onClose: () => onAbort()
                });
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                if (user?.id) {
                    await supabase
                        .from('player_challenge')
                        .update({ status: 'IN_PROGRESS' })
                        .eq('team_id', teamId)
                        .eq('player_id', user.id);
                    onStart();
                }
            }
        }
    };

    useEffect(() => {
        const channelName = `waiting-${teamId}-${playerId}-${Date.now()}`;

        let isActive: boolean = true;
        let channel: RealtimeChannel;

        const setupRealtime = async () => {
            await updateTeamStatus();
            const { data: { session } } = await supabase.auth.getSession();
            if (!isActive || !session) return;

            channel = supabase.channel(channelName)
                .on('postgres_changes' as any,
                    { event: 'INSERT', schema: 'public', table: 'player_challenge', filter: `team_id=eq.${teamId}` },
                    (payload: any) => {
                        // any row inserted into this table for this player's team warrants an update
                        console.log("WAITING / INSERT - REALTIME SIGNAL RECEIVED: ", payload);
                        if (!isActive)
                            return;
                        void updateTeamStatus();
                    }
                )
                .on('postgres_changes' as any,
                    { event: 'DELETE', schema: 'public', table: 'player_challenge', filter: `player_id=eq.${playerId}` },
                    () => {
                        // if this player's row was deleted, this indicates the mission was aborted by someone
                        console.log("WAITING / DELETE - REALTIME SIGNAL RECEIVED");
                        if (!isActive)
                            return;
                        setOverlayProps({
                            title: 'CONNECTION TERMINATED',
                            message: "The mission has been terminated by an agent.",
                            type: 'INFO',
                            onClose: () => onTerminate()
                        });
                    }
                )
                .subscribe((status: string) => {
                    console.log("WAITING / SUBSCRIBE - STATUS: " + status);
                    if (!isActive) return;
                    const isSubscribed = status === 'SUBSCRIBED';
                    setIsConnected(isSubscribed);
                    if (!isSubscribed && !isRetryingRef.current) {
                        isRetryingRef.current = true;
                        console.log("Waiting Link unstable. Attempting reconnection in 5s...");
                        setTimeout(() => {
                            if (isActive) {
                                isRetryingRef.current = false;
                                setupRealtime();
                            }
                        }, 5000);
                    }
                });
        };

        void setupRealtime();
        return () => {
            isActive = false;
            if (channel)
                void supabase.removeChannel(channel);
        };
    }, [teamId, missionData, onStart, playerId]);

    const needed = Math.max(0, missionData.requirements.min_players - currentCount);

    return (
        <div>
            <div className="w-full flex justify-end mb-2">
                <ConnectionStatus isActive={isConnected} />
            </div>
            <div className="flex flex-col items-center justify-center p-10 bg-slate-900 rounded-xl border border-blue-500 animate-pulse">
                <h2 className="text-xl font-bold text-blue-400 mb-2">Team Formation in Progress</h2>
                <p className="text-white text-lg">
                    {needed > 0
                        ? `Waiting for ${needed} more agent${needed > 1 ? 's' : ''}...`
                        : "Team assembled. Commencing mission..."}
                </p>
                <div className="mt-4 flex gap-2">
                    {Array.from({ length: missionData.requirements.min_players }).map((_, i) => (
                        <div
                            key={i}
                            className={`w-4 h-4 rounded-full ${i < currentCount ? 'bg-green-500' : 'bg-gray-600'}`}
                        />
                    ))}
                </div>
                <div className="mt-2 border-red-400/50 pt-2 text-right">
                    <button
                        onClick={() => {
                            setOverlayProps({
                                title: 'CRITICAL WARNING',
                                message: 'ABORT MISSION? Connection for all team members will be severed.',
                                type: 'ERROR',
                                onConfirm: () => onAbort(),
                                onClose: () => setOverlayProps(null)
                            });
                        }}
                        className="text-red-400 hover:text-red-400 text-xs uppercase tracking-tighter"
                    >
                        Abort Mission
                    </button>
                </div>
            </div>
            {overlayProps && <Overlay {...overlayProps} />}
        </div>
    );
}
