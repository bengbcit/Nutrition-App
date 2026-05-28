// app/lib/history.ts
// 
// Data persistence strategy:
//   1. Primary → Supabase (API Routes → server-side DB + Storage)
//   2. Fallback → localStorage (auto-fallback when Supabase is not configured)

export interface FoodResult {
  foods: string[];
  calories: number;
  nutrition: { protein: number; carbs: number; fat: number };
}

export interface AnalysisRecord {
  id: string;
  timestamp: number;     // Unix ms
  imageUrl: string;      // base64 data URL or Supabase Storage public URL
  result: FoodResult;
}

const STORAGE_KEY = 'nutrition-fitness-history';
const MAX_RECORDS = 50;  // prevent localStorage from overflowing

// ============================================
// Supabase API mode (preferred)
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
    // reload latest list after insert
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
  // Delete one-by-one to avoid accidentally truncating the entire table
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
// localStorage mode (fallback / offline)
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
// Legacy API aliases (for backward compatibility)
// ============================================

/** @deprecated Use loadHistoryRemote() or loadHistoryLocal() */
export const loadHistory = loadHistoryLocal;
/** @deprecated Use addRecordRemote() or addRecordLocal() */
export const addRecord = addRecordLocal;
/** @deprecated Use deleteRecordRemote() or deleteRecordLocal() */
export const deleteRecord = deleteRecordLocal;
/** @deprecated Use clearHistoryRemote() or clearHistoryLocal() */
export const clearHistory = clearHistoryLocal;

function saveHistory(records: AnalysisRecord[]): void {
  saveHistoryLocal(records);
}

// Calculate today's statistics
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