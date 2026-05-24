// app/components/NutritionChart.tsx
'use client';

interface NutritionChartProps {
  nutrition: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

export default function NutritionChart({ nutrition }: NutritionChartProps) {
  const total = nutrition.protein + nutrition.carbs + nutrition.fat;
  const proteinPercent = total > 0 ? (nutrition.protein / total) * 100 : 0;
  const carbsPercent = total > 0 ? (nutrition.carbs / total) * 100 : 0;
  const fatPercent = total > 0 ? (nutrition.fat / total) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4">💊 Macros Breakdown</h3>
      
      {/* 横向比例条 */}
      <div className="flex h-6 rounded-full overflow-hidden mb-4">
        <div 
          className="bg-blue-500 transition-all duration-500"
          style={{ width: `${proteinPercent}%` }}
          title={`Protein: ${proteinPercent.toFixed(1)}%`}
        />
        <div 
          className="bg-green-500 transition-all duration-500"
          style={{ width: `${carbsPercent}%` }}
          title={`Carbs: ${carbsPercent.toFixed(1)}%`}
        />
        <div 
          className="bg-red-500 transition-all duration-500"
          style={{ width: `${fatPercent}%` }}
          title={`Fat: ${fatPercent.toFixed(1)}%`}
        />
      </div>
      
      {/* 详细数据 */}
      <div className="space-y-3">
        <BarRow color="blue" label="Protein" grams={nutrition.protein} percent={proteinPercent} />
        <BarRow color="green" label="Carbs" grams={nutrition.carbs} percent={carbsPercent} />
        <BarRow color="red" label="Fat" grams={nutrition.fat} percent={fatPercent} />
      </div>
    </div>
  );
}

function BarRow({ color, label, grams, percent }: { 
  color: 'blue' | 'green' | 'red'; 
  label: string; 
  grams: number; 
  percent: number;
}) {
  const colorClasses = {
    blue: 'bg-blue-500 text-blue-600',
    green: 'bg-green-500 text-green-600',
    red: 'bg-red-500 text-red-600',
  };
  const [bgClass, textClass] = colorClasses[color].split(' ');
  
  return (
    <div>
      <div className="flex justify-between mb-1 text-sm">
        <span className={textClass + ' font-semibold'}>{label}</span>
        <span className="text-gray-600">{grams}g ({percent.toFixed(1)}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`${bgClass} h-2 rounded-full transition-all duration-500`} 
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}