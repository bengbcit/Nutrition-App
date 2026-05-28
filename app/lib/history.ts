// app/lib/history.ts
// 
// 数据持久化策略：
//   1. 优先 → Supabase（API Routes → 服务端 DB + Storage）
//   2. 降级 → localStorage（Supabase 未配置时自动回退）

export interface FoodResult {
  foods: string[];
  calories: number;
  nutrition: { protein: number; carbs: number; fat: number };
}

export interface AnalysisRecord {
  id: string;
  timestamp: number;     // Unix ms
  imageUrl: string;      // base64 data URL 或 Supabase Storage 公开 URL
  result: FoodResult;
}

const STORAGE_KEY = 'nutrition-fitness-history';
const MAX_RECORDS = 50;  // 防止 localStorage 爆炸

// ============================================
// Supabase API 模式（优先使用）
// ============================================

export async function loadHistoryRemote(): Promise<AnalysisRecord[]> {
  try {
    const res = await fetch('/api/history');
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch (e) {
    console.warn('Failed to load from Supabase, falling back to localStorage:', e);
    return loadHistoryLocal();
  }
}

export async function addRecordRemote(record: AnalysisRecord): Promise<AnalysisRecord[]> {
  try {
    const res = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (!res.ok) throw new Error('API error');
    // 重新加载最新列表
    return await loadHistoryRemote();
  } catch (e) {
    console.warn('Failed to save to Supabase, falling back to localStorage:', e);
    return addRecordLocal(record);
  }
}

export async function deleteRecordRemote(id: string): Promise<AnalysisRecord[]> {
  try {
    const res = await fetch(`/api/history?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('API error');
    return await loadHistoryRemote();
  } catch (e) {
    console.warn('Failed to delete from Supabase, falling back to localStorage:', e);
    return deleteRecordLocal(id);
  }
}

export async function clearHistoryRemote(): Promise<AnalysisRecord[]> {
  // Supabase 模式下逐条删除（避免一次 SQL 清空整表）
  // 实际使用中建议在 UI 里逐条删，这里提供简单实现
  try {
    const records = await loadHistoryRemote();
    for (const r of records) {
      await fetch(`/api/history?id=${encodeURIComponent(r.id)}`, { method: 'DELETE' });
    }
    return [];
  } catch {
    clearHistoryLocal();
    return [];
  }
}

// ============================================
// localStorage 模式（fallback / 离线）
// ============================================

export function loadHistoryLocal(): AnalysisRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecordLocal(record: AnalysisRecord): AnalysisRecord[] {
  const current = loadHistoryLocal();
  const updated = [record, ...current];
  saveHistoryLocal(updated);
  return updated;
}

export function deleteRecordLocal(id: string): AnalysisRecord[] {
  const current = loadHistoryLocal();
  const updated = current.filter(r => r.id !== id);
  saveHistoryLocal(updated);
  return updated;
}

export function clearHistoryLocal(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

function saveHistoryLocal(records: AnalysisRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = records.slice(0, MAX_RECORDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    console.error('localStorage full — history not saved');
  }
}

// ============================================
// 兼容旧 API（别名，保持现有代码不报错）
// ============================================

/** @deprecated 使用 loadHistoryRemote() 或 loadHistoryLocal() */
export const loadHistory = loadHistoryLocal;
/** @deprecated 使用 addRecordRemote() 或 addRecordLocal() */
export const addRecord = addRecordLocal;
/** @deprecated 使用 deleteRecordRemote() 或 deleteRecordLocal() */
export const deleteRecord = deleteRecordLocal;
/** @deprecated 使用 clearHistoryRemote() 或 clearHistoryLocal() */
export const clearHistory = clearHistoryLocal;

function saveHistory(records: AnalysisRecord[]): void {
  saveHistoryLocal(records);
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