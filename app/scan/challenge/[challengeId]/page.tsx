'use client'

import Overlay, { OverlayProps } from "@/components/Overlay";
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { joinChallenge, JoinChallengeResult } from '@/app/actions/joinChallenge'
import { createClient } from '@/utils/supabase/client'

export default function ScanChallenge() {
    const router = useRouter()
    const { challengeId } = useParams()
    const supabase = createClient()

    const [ isLoading, setIsLoading ] = useState(true);
    const [ overlayProps, setOverlayProps ] = useState<OverlayProps | null>(null)

    useEffect(() => {
        const handleScan = async () => {
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
    }, [challengeId, router, supabase.auth])

    return (
        <div className="min-h-screen bg-black flex items-center justify-center font-mono">
            {isLoading && <div className="text-green-500 animate-pulse text-sm">INITIALIZING MISSION DATA...</div>}
            {overlayProps && <Overlay {...overlayProps} />}
        </div>
    );
}
