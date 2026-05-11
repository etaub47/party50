'use client'

import { useState } from 'react'
import { PlayerStats } from "@/types/dbtypes";
import ConnectionStatus from "@/components/ConnectionStatus";
import QRScanner from '@/components/QRScanner';

export default function ProfileView({ playerStats, isConnected }: {
    playerStats: PlayerStats, isConnected: boolean }) {
    const [ isScanning, setIsScanning ] = useState(false);

    return (
        <div className="mt-4 w-full max-w-xl flex flex-col gap-2 items-center">
            <div className="w-full flex justify-end mb-2">
                <ConnectionStatus isActive={isConnected} />
            </div>
            <h2 className="text-2xl font-bold">{playerStats.name}</h2>
            <span className="text-blue-400">{playerStats.role}</span>

            <div className="w-full flex flex-col items-center p-4">
                <div className="relative w-full bg-gray-700 h-10 rounded-lg overflow-hidden mt-4 border border-gray-600">
                    <div
                        className="h-full bg-blue-500 transition-all duration-500 ease-out"
                        style={{ width: `${Math.max((playerStats.total_intel / playerStats.max_intel) * 100, 2)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                        Intel: {playerStats.total_intel} / {playerStats.max_intel}
                    </span>
                </div>
                <div className="relative w-full bg-gray-700 h-10 rounded-lg overflow-hidden mt-5 border border-gray-600">
                    <div
                        className={`h-full bg-red-500 transition-all duration-500 ease-out 
                            ${playerStats.total_heat >= 80 ? 'animate-pulse' : ''}`}
                        style={{ width: `${Math.max(Math.min(playerStats.total_heat, 100), 2)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                        Heat: {playerStats.total_heat}
                    </span>
                </div>
                <div className="relative w-full bg-gray-700 h-10 rounded-lg overflow-hidden mt-5 border border-gray-600">
                    <div
                        className="h-full bg-green-600 transition-all duration-500 ease-out"
                        style={{ width: `${Math.max((playerStats.current_credits / playerStats.max_credits) * 100, 2)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                        Credits: {playerStats.current_credits} / {playerStats.max_credits}
                    </span>
                </div>

                <button
                    onClick={() => setIsScanning(true)}
                    className="mt-6 w-full max-w-xs bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-3 transition-transform active:scale-95"
                >
                    <span className="text-xl">📷</span>
                    <span className="font-mono tracking-widest uppercase text-lg">Scan</span>
                </button>

                {isScanning && <QRScanner onClose={() => setIsScanning(false)} />}

            </div>
        </div>
    )
}
