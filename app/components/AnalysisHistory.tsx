// app/components/AnalysisHistory.tsx
'use client';

import { AnalysisRecord, getTodayStats, deleteRecordRemote, clearHistoryRemote, deleteRecordLocal, clearHistoryLocal } from '../lib/history';

interface AnalysisHistoryProps {
  records: AnalysisRecord[];
  onUpdate: (records: AnalysisRecord[]) => void;
}

export default function AnalysisHistory({ records, onUpdate }: AnalysisHistoryProps) {
  const stats = getTodayStats(records);

  const handleDelete = async (id: string) => {
    if (confirm('Delete this record?')) {
      const updated = await deleteRecordRemote(id);
      onUpdate(updated);
    }
  };

  const handleClear = async () => {
    if (confirm('Clear all history? This cannot be undone.')) {
      const updated = await clearHistoryRemote();
      onUpdate(updated);
    }
  };

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mt-8 text-center text-gray-500">
        📭 No analysis history yet. Take your first food photo!
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
      {/* 今日统计 */}
      <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg">
        <h3 className="font-bold text-lg mb-2">📅 Today&apos;s Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Stat label="Meals" value={`${stats.count}`} />
          <Stat label="Calories" value={`${stats.totalCalories} kcal`} accent />
          <Stat label="Protein" value={`${stats.totalProtein.toFixed(0)}g`} />
          <Stat label="Carbs / Fat" value={`${stats.totalCarbs.toFixed(0)}g / ${stats.totalFat.toFixed(0)}g`} />
        </div>
      </div>

      {/* 历史列表头 */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">📋 History ({records.length})</h2>
        <button
          onClick={handleClear}
          className="text-sm text-red-500 hover:text-red-700"
        >
          Clear All
        </button>
      </div>

      {/* 记录列表 */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {records.map((record) => (
          <div key={record.id} className="border rounded-lg p-3 hover:shadow-md transition flex gap-3">
            {/* 缩略图 */}
            <img
              src={record.imageUrl}
              alt="Food"
              className="w-16 h-16 object-cover rounded flex-shrink-0"
            />

            {/* 信息 */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">
                {new Date(record.timestamp).toLocaleString()}
              </p>
              <p className="font-semibold text-sm truncate">
                {record.result.foods.join(', ')}
              </p>
              <div className="flex gap-3 text-xs text-gray-600 mt-1">
                <span className="text-orange-600 font-semibold">
                  🔥 {record.result.calories} kcal
                </span>
                <span>P: {record.result.nutrition.protein}g</span>
                <span>C: {record.result.nutrition.carbs}g</span>
                <span>F: {record.result.nutrition.fat}g</span>
              </div>
            </div>

            {/* 删除按钮 */}
            <button
              onClick={() => handleDelete(record.id)}
              className="text-gray-400 hover:text-red-500 text-xs"
              title="Delete"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-600">{label}</p>
      <p className={`font-bold ${accent ? 'text-orange-600 text-lg' : 'text-gray-800'}`}>
        {value}
      </p>
    </div>
  );
}