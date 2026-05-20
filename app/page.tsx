// app/page.tsx
'use client';

import { useState } from 'react';
import SmartCamera from './components/SmartCamera';  // ← 改这里
import ResultDisplay from './components/ResultDisplay';

interface FoodResult {
  foods: string[];
  calories: number;
  nutrition: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

export default function Home() {
  const [imageData, setImageData] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<FoodResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = async (image: string) => {
    setImageData(image);
    setIsLoading(true);
    setError(null);
    
    try {
      // 兼容：image 可能是完整 data URL 或纯 base64
      const base64Image = image.includes(',') ? image.split(',')[1] : image;
      
      const response = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
      });
      
      if (!response.ok) {
        throw new Error('Analysis failed');
      }
      
      const result: FoodResult = await response.json();
      setAnalysisResult(result);
      
    } catch (error) {
      console.error('Analysis error:', error);
      setError(`Failed to analyze food: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // 仅开发模式 fallback
      if (process.env.NODE_ENV === 'development') {
        setAnalysisResult({
          foods: ['[MOCK] Grilled Chicken', '[MOCK] Steamed Vegetables', '[MOCK] Brown Rice'],
          calories: 520,
          nutrition: { protein: 35, carbs: 45, fat: 18 }
        });
      }
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
          <p className="text-gray-600">
            AI-powered food recognition
          </p>
        </header>

        {!analysisResult ? (
          <div className="max-w-2xl mx-auto">
            <SmartCamera onCapture={handleCapture} />  {/* ← 改这里 */}
            
            {isLoading && (
              <div className="mt-8 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-600">Analyzing your food...</p>
              </div>
            )}
            
            {error && (
              <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
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
              <ResultDisplay result={analysisResult} onReset={handleReset} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}