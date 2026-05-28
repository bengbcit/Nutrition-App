// app/components/Camera.tsx
'use client';

import { useRef, useState, useEffect } from 'react';

interface CameraProps {
    onCapture: (imageData: string) => void;
}

export default function Camera({ onCapture }: CameraProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const startCamera = async () => {
        setError(null);
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API not supported');
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false,
            });

            // Video element is always in DOM (hidden when inactive), so ref is available
            if (!videoRef.current) {
                setError('Video element not ready. Please refresh and try again.');
                return;
            }

            videoRef.current.srcObject = stream;

            // Wait for video metadata to load before showing preview
            videoRef.current.onloadedmetadata = () => {
                setIsCameraActive(true);
            };

            // Explicit play() needed for some browsers; handle autoplay policy blocks
            videoRef.current.play().catch((err) => {
                console.error('Video play failed:', err);
                setError('Video preview blocked by browser. Please tap the screen or use Upload instead.');
            });

        } catch (error) {
            console.error('Camera error:', error);
            if (error instanceof Error) {
                if (error.name === 'NotFoundError') {
                    setError('No camera found.');
                } else if (error.name === 'NotAllowedError') {
                    setError('Camera permission denied.');
                } else if (error.name === 'NotReadableError') {
                    setError('Camera is in use by another app.');
                } else {
                    setError(`Camera error: ${error.message}`);
                }
            }
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                // Use video's actual dimensions for better quality
                const origWidth = videoRef.current.videoWidth;
                const origHeight = videoRef.current.videoHeight;

                // Limit max dimension to 1280px, scale proportionally
                const MAX_DIM = 1280;
                let width = origWidth;
                let height = origHeight;
                if (Math.max(width, height) > MAX_DIM) {
                    const scale = MAX_DIM / Math.max(width, height);
                    width = Math.round(width * scale);
                    height = Math.round(height * scale);
                }

                canvasRef.current.width = width;
                canvasRef.current.height = height;
                context.drawImage(videoRef.current, 0, 0, width, height);

                // JPEG quality 0.85 — good enough for AI analysis
                const imageData = canvasRef.current.toDataURL('image/jpeg', 0.85);
                setCapturedImage(imageData);
                onCapture(imageData);
                stopCamera();
            }
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
            videoRef.current.onloadedmetadata = null;
            setIsCameraActive(false);
        }
    };

    const resetCapture = () => {
        setCapturedImage(null);
        setError(null);
    };

    // Cleanup camera on component unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    return (
        <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4">📸 Food Photo Capture</h2>

            {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                    {error}
                    <button
                        onClick={() => setError(null)}
                        className="ml-3 text-sm underline"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {!capturedImage ? (
                <div className="space-y-4">
                    {/* Video & canvas always in DOM so refs are available when getUserMedia resolves */}
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={
                            isCameraActive
                                ? "w-full rounded-lg bg-black"
                                : "hidden"
                        }
                        style={
                            isCameraActive
                                ? { maxHeight: '480px', objectFit: 'cover', minHeight: '200px' }
                                : undefined
                        }
                    />
                    <canvas
                        ref={canvasRef}
                        className="hidden"
                    />

                    {!isCameraActive ? (
                        <button
                            onClick={startCamera}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                        >
                            📹 Start Camera
                        </button>
                    ) : (
                        <div className="flex gap-4">
                            <button
                                onClick={capturePhoto}
                                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                            >
                                📷 Capture
                            </button>
                            <button
                                onClick={stopCamera}
                                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                            >
                                ✕ Cancel
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <img
                        src={capturedImage}
                        alt="Captured food"
                        className="w-full rounded-lg shadow-lg"
                    />
                    <button
                        onClick={resetCapture}
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                        🔄 Take Another Photo
                    </button>
                </div>
            )}
        </div>
    );
}