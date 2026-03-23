'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function BuyItem() {
    const router = useRouter()
    const { itemId } = useParams()

    useEffect(() => {
        if (itemId) {
            // redirect back to home with the buyItem parameter to trigger the purchase logic
            router.push(`/?buyItem=${itemId}`)
        }
    }, [itemId, router])

    return (
        <div className="flex items-center justify-center min-h-screen bg-black text-blue-500 font-mono">
            <div className="animate-pulse">AUTHENTICATING HARDWARE PURCHASE...</div>
        </div>
    )
}
