'use client'

import { HistoryEvent } from "@/types/dbtypes";
import ConnectionStatus from "@/components/ConnectionStatus";

export default function HistoryView({ events, isConnected }: {
    events: HistoryEvent[], isConnected: boolean }) {

    if (events.length === 0)
        return <div className="p-8 text-center text-gray-500">No mission events recorded.</div>

    return (
        <div className="flex flex-col gap-4 w-full max-w-md mx-auto mt-4">
            <div className="w-full flex justify-end mb-2">
                <ConnectionStatus isActive={isConnected} />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-center">Mission Log</h2>
            {events.map((log: HistoryEvent) => (
                <div
                    key={`${log.player_id}-${log.event_id}`}
                    className="p-3 bg-gray-900 border-2 border-orange-700 rounded-lg shadow-sm flex flex-col gap-1"
                >
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] uppercase tracking-widest text-gray-400 font-mono">
                            {new Date(log.created_at).toLocaleString()}
                        </span>
                    </div>

                    <p className="text-left text-sm text-gray-100 leading-relaxed italic">
                        {log.event.description}
                    </p>

                    <div className="flex gap-2">
                        {log.event.intel !== 0 && (
                            <span className="bg-blue-700 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                {log.event.intel > 0 ? `+${log.event.intel}` : log.event.intel} INTEL
                            </span>
                        )}
                        {log.event.heat !== 0 && (
                            <span className="bg-red-700 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                {log.event.heat > 0 ? `+${log.event.heat}` : log.event.heat} HEAT
                            </span>
                        )}
                        {log.event.credits !== 0 && (
                            <span className="bg-green-700 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                {log.event.credits > 0 ? `+${log.event.credits}` : log.event.credits} CREDITS
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}
