// lib/supabase.ts — Supabase server-side client (API Routes / Server Components only)
import { createClient } from '@supabase/supabase-js';

// 数据库行类型
export interface AnalysisRow {
  id: string;
  created_at: string;       // ISO timestamp
  foods: string[];           // JSONB array
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image_url: string | null;  // Supabase Storage 公开 URL
}

// 服务端 admin 客户端（service_role key → 绕过 RLS，仅在服务端使用）
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

// Storage bucket 名称
export const STORAGE_BUCKET = 'food-photos';

/**
 * 上传图片到 Supabase Storage，返回公开 URL
 */
export async function uploadImage(base64: string, recordId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  // 解码 base64 → Buffer
  const pureBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
  const buffer = Buffer.from(pureBase64, 'base64');

  const filePath = `${recordId}.jpg`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    console.error('Storage upload error:', error);
    return null;  // 图片上传失败不影响主要流程
  }

  // 获取公开 URL
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * 删除 Storage 中的图片
 */
export async function deleteImage(recordId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const filePath = `${recordId}.jpg`;

  await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([filePath])
    .catch(() => { });  // 静默失败——图片可能不存在
}
