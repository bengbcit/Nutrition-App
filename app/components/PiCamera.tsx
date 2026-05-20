// app/components/PiCamera.tsx
'use client';

import { useState } from 'react';

interface PiCameraProps {
    onCapture: (imageData: string) => void;
}

export default function PiCamera({ onCapture }: PiCameraProps) {
    const [isCapturing, setIsCapturing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCapture = async () => {
        setIsCapturing(true);
        setError(null);

        try {
            const response = await fetch('/api/capture', { method: 'POST' });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Capture failed');
            }

            const { image } = await response.json();
            onCapture(image);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsCapturing(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4">📸 Pi Camera Capture</h2>

            {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                    {error}
                </div>
            )}

            <button
                onClick={handleCapture}
                disabled={isCapturing}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-4 px-4 rounded-lg transition-colors text-lg"
            >
                {isCapturing ? '📷 Capturing...' : '📷 Take Photo'}
            </button>

            <p className="text-sm text-gray-500 mt-3 text-center">
                Photo will be taken by the camera connected to Raspberry Pi
            </p>
        </div>
    );
}