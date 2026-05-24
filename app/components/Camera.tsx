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
            // Check if mediaDevices API is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Your browser does not support camera access');
            }

            // Try to get camera with optimal settings for Raspberry Pi
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 }
                },
                audio: false,
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Wait for video to be ready
                await new Promise((resolve) => {
                    if (videoRef.current) {
                        videoRef.current.onloadedmetadata = resolve;
                    }
                });
                setIsCameraActive(true);
            }
        } catch (error) {
            console.error('Camera access error:', error);
            if (error instanceof Error) {
                if (error.name === 'NotFoundError') {
                    setError('No camera detected. Please connect a camera and refresh.');
                } else if (error.name === 'NotAllowedError') {
                    setError('Camera permission denied. Please allow camera access in browser settings.');
                } else if (error.name === 'NotReadableError') {
                    setError('Camera is already in use by another application.');
                } else {
                    setError(`Camera error: ${error.message}`);
                }
            } else {
                setError('Camera access required. Please enable camera permissions.');
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

                // 限制最大边长 1280px，按比例缩放
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

                // 0.85 质量，对 AI 来说足够
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
                    {!isCameraActive ? (
                        <button
                            onClick={startCamera}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                        >
                            📹 Start Camera
                        </button>
                    ) : (
                        <>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full rounded-lg bg-black"
                                style={{ maxHeight: '480px', objectFit: 'cover' }}
                            />
                            <canvas
                                ref={canvasRef}
                                className="hidden"
                            />
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
                        </>
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