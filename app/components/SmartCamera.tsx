// app/components/SmartCamera.tsx
'use client';

import { useState, useEffect } from 'react';
import Camera from './Camera';
import PiCamera from './PiCamera';

interface SmartCameraProps {
  onCapture: (imageData: string) => void;
}

type CameraMode = 'detecting' | 'pi' | 'browser';

export default function SmartCamera({ onCapture }: SmartCameraProps) {
  const [autoMode, setAutoMode] = useState<CameraMode>('detecting');
  const [userOverride, setUserOverride] = useState<CameraMode | null>(null);
  const [piAvailable, setPiAvailable] = useState(false);

  useEffect(() => {
    // 启动时检测后端
    fetch('/api/camera-status')
      .then(res => res.json())
      .then(data => {
        setPiAvailable(data.piCamera);
        setAutoMode(data.piCamera ? 'pi' : 'browser');
      })
      .catch(() => {
        setPiAvailable(false);
        setAutoMode('browser');
      });
  }, []);

  // 用户手动选择优先生效
  const activeMode = userOverride || autoMode;

  // 检测中
  if (autoMode === 'detecting') {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
        <p className="text-gray-600">Detecting available cameras...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* 模式切换器 */}
      <div className="flex items-center gap-2 mb-4 justify-center text-sm flex-wrap">
        <span className="text-gray-600">Camera source:</span>
        
        {/* Pi 摄像头按钮 —— 只在可用时显示 */}
        {piAvailable && (
          <button
            onClick={() => setUserOverride('pi')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeMode === 'pi'
                ? 'bg-blue-500 text-white shadow'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🥧 Pi Camera
            {autoMode === 'pi' && userOverride === null && (
              <span className="ml-1 text-xs opacity-70">(auto)</span>
            )}
          </button>
        )}
        
        <button
          onClick={() => setUserOverride('browser')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeMode === 'browser'
              ? 'bg-blue-500 text-white shadow'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📱 Device Camera
          {autoMode === 'browser' && userOverride === null && (
            <span className="ml-1 text-xs opacity-70">(auto)</span>
          )}
        </button>
        
        {/* 如果用户手动选了，显示一个"重置"按钮 */}
        {userOverride !== null && (
          <button
            onClick={() => setUserOverride(null)}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
            title="Reset to auto-detected mode"
          >
            reset
          </button>
        )}
      </div>

      {/* 渲染对应组件 */}
      {activeMode === 'pi' ? (
        <PiCamera onCapture={onCapture} />
      ) : (
        <Camera onCapture={onCapture} />
      )}
    </div>
  );
}