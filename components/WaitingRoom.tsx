'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Overlay from "@/components/Overlay";

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

    useEffect(() => {
        let channel: any;

        const updateTeamStatus = async () => {

            // fetch current members of this team
            const { data, count } = await supabase
                .from('player_challenge')
                .select('status', { count: 'exact' })
                .eq('team_id', teamId);

            const actualCount = count || 0;
            setCurrentCount(actualCount);

            // if the room is full, flip MY status to IN_PROGRESS
            const { data: { user } } = await supabase.auth.getUser();
            if (actualCount >= minPlayers && user?.id) {
                await supabase
                    .from('player_challenge')
                    .update({ status: 'IN_PROGRESS' })
                    .eq('team_id', teamId)
                    .eq('player_id', user.id); // Only flip myself
            }

            // check if the player should transition to the game
            if (data?.some(row => row.status === 'IN_PROGRESS')) {
                onStart();
            }
        };

        const setupRealtime = async () => {
            if (channel)
                await supabase.removeChannel(channel);
            await updateTeamStatus();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session)
                return;

            const channelName = `waiting-${Date.now()}`;
            channel = (supabase as any)
                .channel(channelName)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'player_challenge', filter: `team_id=eq.${teamId}` },
                    (payload: any) => {
                        console.log("REALTIME SIGNAL RECEIVED:", payload);
                        updateTeamStatus();
                    }
                )
                .on(
                    'postgres_changes' as any,
                    { event: 'DELETE', schema: 'public', table: 'player_challenge', filter: `player_id=eq.${playerId}` },
                    () => setEvictionMessage("The mission has been terminated by an agent.")
                )
                .subscribe((status: string) => {
                    console.log(`Realtime status (${channelName}):`, status);
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
            if (channel)
                void supabase.removeChannel(channel);
        };
    }, [teamId, minPlayers, onStart]);

    const needed = Math.max(0, minPlayers - currentCount);

    return (
        <div>
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
