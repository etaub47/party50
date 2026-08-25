'use client'

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Overlay from '@/components/Overlay';

export default function RecoveryPage() {
    const { playerId } = useParams();
    const router = useRouter();
    const supabase = createClient();
    const [ error, setError ] = useState<string | null>(null);
    const [ isRetrying, setIsRetrying ] = useState(false);

    const performRecovery = useCallback(async () => {
        if (!playerId)
            return;

        setError(null);
        try {
            // ensure the new phone has a session (anonymous login)
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                const { error: signInError } = await supabase.auth.signInAnonymously();
                if (signInError) throw signInError;
            }

            // call the SQL function to "claim" the old ID
            const { error: rpcError } = await supabase.rpc('recover_player_identity', {
                target_player_id: playerId
            });
            if (rpcError) throw rpcError;

            window.location.href = '/';
        } catch (err) {
            console.error("Recovery failed:", err);
            const message = (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string')
                ? err.message
                : 'Recovery failed for an unknown reason.';
            setError(message);
        } finally {
            setIsRetrying(false);
        }
    }, [playerId, supabase]);

    useEffect(() => {
        void performRecovery();
    }, [performRecovery]);

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
            {!error && (
                <h1 className="text-amber-500 font-mono animate-pulse uppercase">Syncing Field Identity...</h1>
            )}
            {error && (
                <Overlay
                    title="Recovery Failed"
                    message={error}
                    type="ERROR"
                    isProcessing={isRetrying}
                    onConfirm={() => { setIsRetrying(true); void performRecovery(); }}
                    onClose={() => router.push('/')}
                />
            )}
        </div>
    );
}
