'use client'

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useRouter } from 'next/navigation';

export default function QRScanner({ onClose }: { onClose: () => void }) {
    const router = useRouter();
    const [ status, setStatus ] = useState("INITIALIZING OPTICAL SENSOR...");
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        const startScanner = async () => {
            try {
                // Small delay to ensure the DOM element is fully painted
                await new Promise(resolve => setTimeout(resolve, 500));

                await html5QrCode.start(
                    { facingMode: "environment" }, // Prefer back camera
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                    },
                    (decodedText) => {
                        if (decodedText.includes('party50.vercel.app')) {
                            stopScanner().then(() => {
                                const url = new URL(decodedText);
                                router.push(url.pathname);
                                onClose();
                            });
                        }
                    },
                    (ignored) => {
                        // constant "No QR code found" noise - ignore
                    }
                );
                setStatus("SENSOR ACTIVE");
            } catch (err: any) {
                console.error("Camera error:", err);
                setStatus(`ACCESS DENIED: ${err?.message || 'Check permissions'}`);
            }
        };

        const stopScanner = async () => {
            if (scannerRef.current && scannerRef.current?.isScanning) {
                await scannerRef.current!.stop();
            }
        };

        void startScanner();

        return () => {
            stopScanner().catch(e => console.error("Cleanup error", e));
        };
    }, [router, onClose]);

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6">
            <h2 className="text-blue-400 font-mono mb-4 text-center">{status}</h2>

            {/* aspect ratio 1:1 helps mobile browsers center the feed */}
            <div id="reader" className="w-full max-w-sm aspect-square overflow-hidden rounded-xl border-2 border-blue-500 bg-gray-900 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            </div>

            <button
                onClick={onClose}
                className="mt-8 px-8 py-3 bg-red-900/20 hover:bg-red-900/40 text-red-500 font-mono rounded-full border border-red-500/30 transition-all uppercase tracking-widest text-xs"
            >
                Abort Mission
            </button>
        </div>
    );
}
