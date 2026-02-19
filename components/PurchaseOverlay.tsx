interface PurchaseOverlayProps {
    overlay: { type: string; itemName?: string };
    onClose: () => void;
    onConfirm: () => void;
    isProcessing: boolean;
}

export default function PurchaseOverlay({ overlay, onClose, onConfirm, isProcessing }: PurchaseOverlayProps) {
    const isError = overlay.type.startsWith('ERROR');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-gray-900 border-2 border-blue-500 rounded-xl p-6 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                <h3 className={`text-xl font-bold mb-4 ${isError ? 'text-red-500' : 'text-blue-400'}`}>
                    {isError ? 'SYSTEM ERROR' : 'SECURE TRANSACTION'}
                </h3>

                <p className="text-gray-300 mb-8">
                    {overlay.type === 'ERROR_OWNED' && `You already possess the ${overlay.itemName}.`}
                    {overlay.type === 'ERROR_CREDITS' && `Insufficient credits to acquire the ${overlay.itemName}.`}
                    {overlay.type === 'CONFIRM' && `Confirm acquisition of ${overlay.itemName}?`}
                    {overlay.type === 'SUCCESS' && `Acquisition complete. ${overlay.itemName} has been added to your inventory.`}
                    {overlay.type === 'ERROR_GENERIC' && `An unexpected error occurred. ${overlay.itemName}`}
                </p>

                <div className="flex gap-4">
                    {overlay.type === 'CONFIRM' ? (
                        <>
                            <button
                                onClick={onConfirm}
                                disabled={isProcessing}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg disabled:opacity-50"
                            >
                                {isProcessing ? 'PROCESSING...' : 'CONFIRM'}
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg"
                            >
                                CANCEL
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onClose}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg"
                        >
                            ACKNOWLEDGE
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
