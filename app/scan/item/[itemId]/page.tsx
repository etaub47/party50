'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function ScanItemPage() {
    const router = useRouter()
    const { itemId } = useParams()

    useEffect(() => {
        if (itemId) {
            // redirect back to home with the scanItem parameter to trigger the purchase logic
            router.push(`/?scanItem=${itemId}`)
        }
    }, [itemId, router])

    return (
        <div className="flex items-center justify-center min-h-screen bg-black text-blue-500 font-mono">
            <div className="animate-pulse">AUTHENTICATING HARDWARE SCAN...</div>
        </div>
    )
}
