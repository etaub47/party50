import { useState } from 'react';

export interface OverlayProps {
    title: string;
    message: string;
    type?: 'INFO' | 'ERROR' | 'CONFIRM' | 'SUCCESS' | 'INPUT';
    inputType?: 'number' | 'text';
    onClose?: () => void;
    onConfirm?: () => void;
    onConfirmValue?: (value: string) => void;
    isProcessing?: boolean;
}

export default function Overlay(props: OverlayProps) {
    const [ inputValue, setInputValue ] = useState("");
    const isError = props.type === 'ERROR';

    const handleConfirm = () => {
        if (props.onConfirmValue) {
            props.onConfirmValue(inputValue);
        } else if (props.onConfirm) {
            props.onConfirm();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className={`w-full max-w-sm bg-gray-900 border-2 rounded-xl p-6 shadow-lg ${
                isError ? 'border-red-500 shadow-red-500/20' : 'border-blue-500 shadow-blue-500/20'
            }`}>
                <h3 className={`text-xl font-bold mb-4 ${isError ? 'text-red-500' : 'text-blue-400'} font-mono uppercase tracking-widest`}>
                    {props.title}
                </h3>

                <p className="text-gray-300 mb-8 font-mono text-sm leading-relaxed">
                    {props.message}
                </p>

                {props.type === 'INPUT' && (
                    <div className="mb-6">
                        <input
                            autoFocus
                            type={props.inputType || 'text'}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="ENTER AMOUNT..."
                            className="w-full bg-black border border-blue-500/50 rounded p-3 text-blue-400 font-mono text-center focus:outline-none focus:border-blue-400"
                        />
                    </div>
                )}

                <div className="flex gap-4">
                    {(props.onConfirm || props.onConfirmValue) ? (
                        <>
                            <button
                                onClick={handleConfirm}
                                disabled={props.isProcessing || false}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg disabled:opacity-50 font-mono text-sm"
                            >
                                {props.isProcessing ? 'PROCESSING...' : 'CONFIRM'}
                            </button>
                            {props.onClose && (
                                <button
                                    onClick={props.onClose}
                                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg font-mono text-sm"
                                >
                                    CANCEL
                                </button>
                            )}
                        </>
                    ) : (
                        props.onClose && (
                            <button
                                onClick={props.onClose}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg font-mono text-sm"
                            >
                                ACKNOWLEDGE
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
