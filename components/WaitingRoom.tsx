'use client'
import { RealtimeChannel } from "@supabase/realtime-js";
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Overlay from "@/components/Overlay";
import ConnectionStatus from "@/components/ConnectionStatus";

const supabase = createClient()

export default function WaitingRoom({ teamId, minPlayers, playerId, onStart, onAbort }: {
    teamId: string,
    minPlayers: number,
    playerId: string,
    onStart: () => void,
    onAbort: () => void
}) {

    const [ currentCount, setCurrentCount ] = useState(0)
    const [ evictionMessage, setEvictionMessage ] = useState<string | null>(null);
    const [ isConnected, setIsConnected ] = useState(false);

    const isRetryingRef = useRef(false);

    // update the team status indicator based on the number of players who have joined the challenge
    const updateTeamStatus = async () => {

        // fetch current members of this team
        const { count } = await supabase
            .from('player_challenge')
            .select('status', { count: 'exact' })
            .eq('team_id', teamId);

        const actualCount = count || 0;
        setCurrentCount(actualCount);

        // if the room is full, flip MY status to IN_PROGRESS and start the mission
        const { data: { user } } = await supabase.auth.getUser();
        if (actualCount >= minPlayers && user?.id) {
            await supabase
                .from('player_challenge')
                .update({ status: 'IN_PROGRESS' })
                .eq('team_id', teamId)
                .eq('player_id', user.id);
            onStart();
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
                        if (!isActive) return;
                        void updateTeamStatus();
                    }
                )
                .on('postgres_changes' as any,
                    { event: 'DELETE', schema: 'public', table: 'player_challenge', filter: `player_id=eq.${playerId}` },
                    () => {
                        // if this player's row was deleted, this indicates the mission was aborted by someone
                        console.log("WAITING / DELETE - REALTIME SIGNAL RECEIVED");
                        if (!isActive) return;
                        setEvictionMessage("The mission has been terminated by an agent.")
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
    }, [teamId, minPlayers, onStart, playerId]);

    const needed = Math.max(0, minPlayers - currentCount);

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
                    {Array.from({ length: minPlayers }).map((_, i) => (
                        <div
                            key={i}
                            className={`w-4 h-4 rounded-full ${i < currentCount ? 'bg-green-500' : 'bg-gray-600'}`}
                        />
                    ))}
                </div>
                <div className="mt-2 border-red-400/50 pt-2 text-right">
                    <button
                        onClick={onAbort}
                        className="text-red-400 hover:text-red-400 text-xs uppercase tracking-tighter"
                    >
                        Abort Mission
                    </button>
                </div>
            </div>
            {evictionMessage && (
                <Overlay
                    title="CONNECTION TERMINATED"
                    message={evictionMessage}
                    type="INFO"
                    onClose={() => window.location.reload()}
                />
            )}
        </div>

    );
}
