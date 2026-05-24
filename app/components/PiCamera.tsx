// app/components/PiCamera.tsx
'use client';

import { useState, useEffect, useRef } from 'react';

interface PiCameraProps {
    onCapture: (imageData: string) => void;
}

type Mode = 'idle' | 'previewing' | 'capturing';

const PREVIEW_INTERVAL_MS = 500;  // 每 500ms 刷新预览

export default function PiCamera({ onCapture }: PiCameraProps) {
    const [mode, setMode] = useState<Mode>('idle');
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [fps, setFps] = useState(0);

    // 用 ref 而不是 state 跟踪 interval，避免重渲染问题
    const intervalRef = useRef<number | null>(null);
    const lastFrameTime = useRef<number>(Date.now());

    // 预览循环：等上一张返回再发下一张，不堆积
    useEffect(() => {
        if (mode !== 'previewing') return;

        let cancelled = false;
        let timeoutId: number | null = null;

        const fetchNextFrame = async () => {
            if (cancelled) return;

            const t = Date.now();
            try {
                // 用 Image 预加载，等图片真的加载完才更新 src
                // 这样画面不会闪烁/跳动
                const url = `/api/preview?t=${t}`;
                await new Promise<void>((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve();
                    img.onerror = () => reject(new Error('Image load failed'));
                    img.src = url;
                });

                if (cancelled) return;
                setPreviewUrl(url);

                // 估算 fps
                const delta = Date.now() - lastFrameTime.current;
                if (delta > 0) setFps(Math.round(1000 / delta));
                lastFrameTime.current = Date.now();
            } catch {
                // 偶发失败（摄像头占用等），忽略，继续下一张
            }

            if (cancelled) return;
            // 等很短再发下一张（给摄像头一点喘息时间）
            timeoutId = window.setTimeout(fetchNextFrame, 100);
        };

        fetchNextFrame();  // 立即开始

        return () => {
            cancelled = true;
            if (timeoutId !== null) clearTimeout(timeoutId);
        };
    }, [mode]);

    const startPreview = () => {
        setError(null);
        setMode('previewing');
    };

    const cancelPreview = () => {
        setMode('idle');
        setPreviewUrl('');
    };

    const handleCapture = async () => {
        setMode('capturing');  // 立即停止预览，释放摄像头
        setError(null);

        // ⭐ 等600ms(日志里 preview 最慢 852ms，但大部分是 200-500ms)，让上一个 preview 请求先完成释放摄像头
        await new Promise(resolve => setTimeout(resolve, 600));

        try {
            const response = await fetch('/api/capture', { method: 'POST' });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || `Capture failed (${response.status})`);
            }

            const { image } = await response.json();
            onCapture(image);
            setMode('idle');  // 拍完回到初始状态
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setMode('idle');
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4">📸 Pi Camera Capture</h2>

            {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg flex justify-between items-start">
                    <span>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="ml-3 text-sm underline flex-shrink-0"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* 初始状态：只有一个 Start Preview 按钮 */}
            {mode === 'idle' && (
                <button
                    onClick={startPreview}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-4 rounded-lg transition-colors text-lg"
                >
                    📹 Start Preview
                </button>
            )}

            {/* 预览状态：显示画面 + Capture/Cancel 按钮 */}
            {mode === 'previewing' && (
                <div className="space-y-4">
                    {/* 固定宽高比的容器，画面变了也不跳 */}
                    <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                        {previewUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={previewUrl}
                                alt="Live preview"
                                className="absolute inset-0 w-full h-full object-contain"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-white">
                                <div className="text-center">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                                    <p className="text-sm">Loading preview...</p>
                                </div>
                            </div>
                        )}

                        {/* fps 角标 */}
                        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                            {fps > 0 ? `~${fps} fps` : 'starting...'}
                        </div>

                        {/* LIVE 标识 */}
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                            LIVE
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleCapture}
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                        >
                            📷 Capture
                        </button>
                        <button
                            onClick={cancelPreview}
                            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                        >
                            ✕ Cancel
                        </button>
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                        Preview is low quality. Tap Capture for HD photo.
                    </p>
                </div>
            )}

            {/* 拍照中状态 */}
            {mode === 'capturing' && (
                <div className="py-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-3"></div>
                    <p className="text-gray-600">Capturing high-resolution photo...</p>
                </div>
            )}
        </div>
    );
}