'use client'

import Overlay, { OverlayProps } from "@/components/Overlay";
import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { joinChallenge, JoinChallengeResult } from '@/app/actions/joinChallenge'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

export default function ScanChallenge() {
    const router = useRouter()
    const { challengeId } = useParams()

    const [ isLoading, setIsLoading ] = useState(true);
    const [ overlayProps, setOverlayProps ] = useState<OverlayProps | null>(null)

    // One scan is one join. The redirect below is not instant, so without this a re-render
    // (or StrictMode's second effect pass in dev) fires a second join while the first is
    // still in flight.
    const hasScannedRef = useRef(false);

    useEffect(() => {
        const handleScan = async () => {
            if (hasScannedRef.current)
                return;
            hasScannedRef.current = true;

            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user) {
                router.push('/')
                return
            }

            const result: JoinChallengeResult = await joinChallenge(session.user.id, challengeId as string);
            if (result.success) {
                router.push(`/?activeChallenge=${challengeId}&teamId=${result.teamId}&status=${result.status}`)
            } else {
                setIsLoading(false);
                setOverlayProps({ onClose: () => router.push('/'), ...result.overlayProps! });
            }
        }
        void handleScan();
    }, [challengeId, router])

    return (
        <div className="min-h-screen bg-black flex items-center justify-center font-mono">
            {isLoading && <div className="text-green-500 animate-pulse text-sm">INITIALIZING MISSION DATA...</div>}
            {overlayProps && <Overlay {...overlayProps} />}
        </div>
    );
}
