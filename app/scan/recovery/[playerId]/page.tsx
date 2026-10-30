'use client'

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Overlay from '@/components/Overlay';

// names shown in the confirm step; ownName is null when this device has no player yet
interface RecoveryNames {
    targetName: string;
    ownName: string | null;
}

export default function RecoveryPage() {
    const { playerId } = useParams();
    const router = useRouter();
    const supabase = createClient();
    const [ names, setNames ] = useState<RecoveryNames | null>(null);
    const [ error, setError ] = useState<string | null>(null);
    const [ isProcessing, setIsProcessing ] = useState(false);

    const toMessage = (err: unknown) =>
        (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string')
            ? err.message
            : 'Recovery failed for an unknown reason.';

    // read-only: work out who this device is and who it would become, then ask before
    // touching anything, since recovering deletes this device's current player
    const prepareRecovery = useCallback(async () => {
        if (!playerId || typeof playerId !== 'string')
            return;

        setError(null);
        setNames(null);
        try {
            // ensure the new phone has a session (anonymous login)
            let { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                const { data, error: signInError } = await supabase.auth.signInAnonymously();
                if (signInError) throw signInError;
                session = data.session;
            }
            const ownId = session?.user.id;
            if (!ownId) throw new Error('No active session detected.');

            // scanning your own token changes nothing
            if (ownId === playerId) {
                window.location.href = '/';
                return;
            }

            const { data: target, error: targetError } = await supabase
                .from('player')
                .select('name')
                .eq('id', playerId)
                .maybeSingle();
            if (targetError) throw targetError;
            if (!target) throw new Error('Target player identity not found.');

            const { data: own, error: ownError } = await supabase
                .from('player')
                .select('name')
                .eq('id', ownId)
                .maybeSingle();
            if (ownError) throw ownError;

            setNames({ targetName: target.name ?? 'Player', ownName: own ? (own.name ?? 'Player') : null });
        } catch (err) {
            console.error("Recovery failed:", err);
            setError(toMessage(err));
        } finally {
            setIsProcessing(false);
        }
    }, [playerId, supabase]);

    const performRecovery = async () => {
        setIsProcessing(true);
        try {
            // call the SQL function to "claim" the old ID
            const { error: rpcError } = await supabase.rpc('recover_player_identity', {
                target_player_id: playerId
            });
            if (rpcError) throw rpcError;

            window.location.href = '/';
        } catch (err) {
            console.error("Recovery failed:", err);
            setNames(null);
            setError(toMessage(err));
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        void prepareRecovery();
    }, [prepareRecovery]);

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
            {!error && (
                <h1 className="text-amber-500 font-mono animate-pulse uppercase">Syncing Field Identity...</h1>
            )}
            {!error && names && (
                <Overlay
                    title={names.ownName ? 'Erase This Agent?' : 'Assume Identity?'}
                    message={names.ownName
                        ? `This will ERASE agent ${names.ownName} and all of their progress on this device, and replace it with agent ${names.targetName}. This cannot be undone.`
                        : `This device will become agent ${names.targetName}. Their old device will lose access.`}
                    type={names.ownName ? 'ERROR' : 'CONFIRM'}
                    isProcessing={isProcessing}
                    onConfirm={() => void performRecovery()}
                    onClose={() => router.push('/')}
                />
            )}
            {error && (
                <Overlay
                    title="Recovery Failed"
                    message={error}
                    type="ERROR"
                    isProcessing={isProcessing}
                    onConfirm={() => { setIsProcessing(true); void prepareRecovery(); }}
                    onClose={() => router.push('/')}
                />
            )}
        </div>
    );
}
