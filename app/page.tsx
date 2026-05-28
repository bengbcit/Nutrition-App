// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import SmartCamera from './components/SmartCamera';
import DemoImages from './components/DemoImages';
import ImageUploader from './components/ImageUploader';
import ResultDisplay from './components/ResultDisplay';
import NutritionChart from './components/NutritionChart';
import AnalysisHistory from './components/AnalysisHistory';
import {
  FoodResult,
  AnalysisRecord,
  loadHistoryRemote,
  addRecordRemote
} from './lib/history';

export default function Home() {
  const [imageData, setImageData] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<FoodResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [showUploader, setShowUploader] = useState(false);

  // 启动时从 Supabase 加载历史（失败自动回退到 localStorage）
  useEffect(() => {
    loadHistoryRemote().then(setHistory);
  }, []);

  const handleCapture = async (image: string) => {
    setImageData(image);
    setIsLoading(true);
    setError(null);

    try {
      const base64Image = image.includes(',') ? image.split(',')[1] : image;

      const response = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `API error: ${response.status}`);
      }

      const result: FoodResult = await response.json();
      setAnalysisResult(result);

      // 保存到 Supabase（失败自动回退 localStorage）
      const record: AnalysisRecord = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        imageUrl: image,
        result,
      };
      addRecordRemote(record).then(setHistory);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to analyze: ${msg}`);
      console.error('Analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setImageData(null);
    setAnalysisResult(null);
    setError(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto py-8 px-4">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🍽️ Nutrition Fitness App
          </h1>
          <p className="text-gray-600 mb-3">
            AI-powered food recognition · Multi-provider · Raspberry Pi integration
          </p>
          <div className="flex justify-center gap-3 text-sm">
            <a
              href="https://github.com/bengbcit/Nutrition-App"
              target="_blank"
              rel="noopener"
              className="text-blue-600 hover:underline"
            >
              📦 GitHub
            </a>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => setShowUploader(true)}
              className="text-blue-600 hover:underline cursor-pointer"
            >
              Upload Image 📤
            </button>
          </div>
        </header>

        {!analysisResult ? (
          <div className="max-w-2xl mx-auto">
            <SmartCamera onCapture={handleCapture} />
            <DemoImages onSelect={handleCapture} />

            {isLoading && (
              <div className="mt-8 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-600">Analyzing your food...</p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <p className="mb-2">{error}</p>
                {imageData && (
                  <button
                    onClick={() => handleCapture(imageData)}
                    className="bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-1 px-3 rounded"
                  >
                    🔄 Retry Analysis
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {imageData && (
                <div className="bg-white rounded-lg shadow-lg p-4">
                  <h3 className="font-semibold mb-2">📸 Captured Photo</h3>
                  <img src={imageData} alt="Food" className="w-full rounded-lg" />
                </div>
              )}
              <div className="space-y-4">
                <ResultDisplay result={analysisResult} onReset={handleReset} />
                <NutritionChart nutrition={analysisResult.nutrition} />
              </div>
            </div>
          </div>
        )}

        {/* 历史记录 —— 总是显示在底部 */}
        <div className="max-w-4xl mx-auto">
          <AnalysisHistory records={history} onUpdate={setHistory} />
        </div>

        {/* Upload modal */}
        {showUploader && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={(e) => {
              // Close when clicking the backdrop (not the modal content)
              if (e.target === e.currentTarget) setShowUploader(false);
            }}
          >
            <div className="relative w-full max-w-lg">
              <button
                onClick={() => setShowUploader(false)}
                className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
              <ImageUploader
                onCapture={(imageData) => {
                  setShowUploader(false);
                  handleCapture(imageData);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}