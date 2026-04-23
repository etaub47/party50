'use client'

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function RecoveryPage() {
    const { playerId } = useParams();
    const supabase = createClient();

    useEffect(() => {
        const performRecovery = async () => {
            if (!playerId)
                return;

            // ensure the new phone has a session (anonymous login)
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                await supabase.auth.signInAnonymously();
            }

            // call the SQL function to "claim" the old ID
            const { error } = await supabase.rpc('recover_player_identity', {
                target_player_id: playerId
            });

            if (!error) {
                window.location.href = '/';
            } else {
                console.error("Recovery failed:", error);
            }
        };

        void performRecovery();
    }, [playerId, supabase]);

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
            <h1 className="text-amber-500 font-mono animate-pulse uppercase">Syncing Field Identity...</h1>
        </div>
    );
}
