'use client'

import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useRouter } from 'next/navigation';

export default function QRScanner({ onClose }: { onClose: () => void }) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {

        // initialize the scanner
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            },
            /* verbose= */ false
        );

        // logic to check if the URL belongs to your app
        const onScanSuccess = (decodedText: string) => {
            if (decodedText.includes('party50.vercel.app')) {
                scanner.clear(); // Shut down camera
                const url = new URL(decodedText);
                router.push(url.pathname);
                onClose();
            } else {
                setError("UNRECOGNIZED FREQUENCY: Not a valid HQ code.");
            }
        };

        const onScanFailure = (err: any) => {
            // ignore constant scan failures (like blurry frames)
        };

        scanner.render(onScanSuccess, onScanFailure);

        // cleanup on unmount
        return () => {
            scanner.clear().catch(error => console.error("Failed to clear scanner", error));
        };
    }, [router, onClose]);

    return (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center p-6">
            <h2 className="text-blue-400 font-mono mb-4 animate-pulse">INITIALIZING OPTICAL SENSOR...</h2>

            {/* This ID is where the camera feed will render */}
            <div id="reader" className="w-full max-w-sm overflow-hidden rounded-xl border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>

            {error && <p className="mt-4 text-red-500 font-mono text-sm">{error}</p>}

            <button
                onClick={onClose}
                className="mt-8 px-8 py-3 bg-gray-800 text-white font-mono rounded-full border border-gray-600"
            >
                ABORT SCAN
            </button>
        </div>
    );
}
