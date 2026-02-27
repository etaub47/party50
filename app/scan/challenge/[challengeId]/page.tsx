'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { joinChallenge, JoinChallengeResult } from '@/app/actions/joinChallenge'
import { createClient } from '@/utils/supabase/client'

export default function ScanPage() {
    const router = useRouter()
    const { challengeId } = useParams()
    const supabase = createClient()

    useEffect(() => {
        const handleScan = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user) {
                // If not logged in, send them to the home page to register first
                router.push('/')
                return
            }

            const result: JoinChallengeResult =
                await joinChallenge(session.user.id, challengeId as string);
            if (result.success) {
                // redirect back home, but we'll add logic to page.tsx to show the mission
                router.push(`/?activeChallenge=${challengeId}&teamId=${result.teamId}`)
            } else {
                alert(result.error || "Failed to join challenge")
                router.push('/')
            }
        }
        void handleScan();
    }, [challengeId, router, supabase.auth])

    return (
        <div className="flex items-center justify-center min-h-screen bg-black text-white">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-xl font-mono">INITIALIZING MISSION DATA...</p>
            </div>
        </div>
    )
}
