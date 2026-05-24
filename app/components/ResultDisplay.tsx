// app/components/ResultDisplay.tsx
'use client';

interface FoodResult {
  foods: string[];
  calories: number;
  nutrition: { protein: number; carbs: number; fat: number };
}

interface ResultDisplayProps {
  result: FoodResult;
  onReset: () => void;
}

export default function ResultDisplay({ result, onReset }: ResultDisplayProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        📊 Analysis Results
        <button
          onClick={onReset}
          className="ml-auto text-sm bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-lg transition-colors"
        >
          New Scan
        </button>
      </h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg mb-2">🍴 Foods Detected</h3>
          <ul className="list-disc list-inside space-y-1">
            {result.foods.map((food, idx) => (
              <li key={idx} className="text-gray-700">{food}</li>
            ))}
          </ul>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-lg mb-2">🔥 Calories</h3>
          <p className="text-4xl font-bold text-orange-500">
            {result.calories} <span className="text-lg text-gray-500">kcal</span>
          </p>
          <div className="mt-3 bg-gray-200 rounded-full h-4 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-orange-400 to-orange-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (result.calories / 2000) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {result.calories} kcal / 2000 kcal daily target
          </p>
        </div>
      </div>
    </div>
  );
}