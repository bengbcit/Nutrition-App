// app/lib/history.ts
export interface FoodResult {
  foods: string[];
  calories: number;
  nutrition: { protein: number; carbs: number; fat: number };
}

export interface AnalysisRecord {
  id: string;
  timestamp: number;     // Unix ms
  imageUrl: string;      // base64 data URL（注意：占空间，下面有优化建议）
  result: FoodResult;
}

const STORAGE_KEY = 'nutrition-fitness-history';
const MAX_RECORDS = 50;  // 防止 localStorage 爆炸

export function loadHistory(): AnalysisRecord[] {
  if (typeof window === 'undefined') return [];  // SSR 安全
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load history:', e);
    return [];
  }
}

export function saveHistory(records: AnalysisRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    // 只保留最近 MAX_RECORDS 条
    const trimmed = records.slice(0, MAX_RECORDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    // localStorage 满了
    console.error('Failed to save history (storage full?):', e);
  }
}

export function addRecord(record: AnalysisRecord): AnalysisRecord[] {
  const current = loadHistory();
  const updated = [record, ...current];
  saveHistory(updated);
  return updated;
}

export function deleteRecord(id: string): AnalysisRecord[] {
  const current = loadHistory();
  const updated = current.filter(r => r.id !== id);
  saveHistory(updated);
  return updated;
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

// 计算今日统计
export function getTodayStats(records: AnalysisRecord[]) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const startMs = todayStart.getTime();
  
  const todayRecords = records.filter(r => r.timestamp >= startMs);
  
  return {
    count: todayRecords.length,
    totalCalories: todayRecords.reduce((sum, r) => sum + r.result.calories, 0),
    totalProtein: todayRecords.reduce((sum, r) => sum + r.result.nutrition.protein, 0),
    totalCarbs: todayRecords.reduce((sum, r) => sum + r.result.nutrition.carbs, 0),
    totalFat: todayRecords.reduce((sum, r) => sum + r.result.nutrition.fat, 0),
  };
}