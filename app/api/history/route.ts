// app/api/history/route.ts
// 分析历史记录 CRUD API（服务端 → Supabase）
import { NextRequest, NextResponse } from 'next/server';
import {
    getSupabaseAdmin,
    AnalysisRow,
    uploadImage,
    deleteImage,
} from '@/lib/supabase';

// ============================================
// GET /api/history — 获取所有分析记录（按时间倒序）
// ============================================
export async function GET() {
    try {
        const supabase = getSupabaseAdmin();

        const { data, error } = await supabase
            .from('analyses')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        // 把 Supabase 行 → 前端 AnalysisRecord 格式
        const records = (data || []).map(row => ({
            id: row.id,
            timestamp: new Date(row.created_at).getTime(),
            imageUrl: row.image_url || '',
            result: {
                foods: row.foods || [],
                calories: row.calories,
                nutrition: {
                    protein: row.protein,
                    carbs: row.carbs,
                    fat: row.fat,
                },
            },
        }));

        return NextResponse.json(records);
    } catch (err) {
        console.error('GET /api/history error:', err);
        return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
    }
}

// ============================================
// POST /api/history — 保存一条新的分析记录
// ============================================
export async function POST(request: NextRequest) {
    try {
        const supabase = getSupabaseAdmin();
        const body = await request.json();

        const { id, timestamp, imageUrl, result } = body;

        if (!id || !result) {
            return NextResponse.json({ error: 'Missing id or result' }, { status: 400 });
        }

        // 1. 上传图片到 Supabase Storage（如果有 base64 图片）
        let storedImageUrl: string | null = null;
        if (imageUrl && imageUrl.startsWith('data:image')) {
            storedImageUrl = await uploadImage(imageUrl, id);
        }

        // 2. 插入数据库行
        const row: AnalysisRow = {
            id,
            created_at: new Date(timestamp).toISOString(),
            foods: result.foods || [],
            calories: result.calories || 0,
            protein: result.nutrition?.protein || 0,
            carbs: result.nutrition?.carbs || 0,
            fat: result.nutrition?.fat || 0,
            image_url: storedImageUrl || imageUrl || null,
        };

        const { error } = await supabase.from('analyses').insert(row);

        if (error) {
            console.error('Supabase insert error:', error);
            return NextResponse.json({ error: 'Failed to save record' }, { status: 500 });
        }

        return NextResponse.json({ success: true, id, imageUrl: storedImageUrl });
    } catch (err) {
        console.error('POST /api/history error:', err);
        return NextResponse.json({ error: 'Failed to save record' }, { status: 500 });
    }
}

// ============================================
// DELETE /api/history?id=xxx — 删除一条记录
// ============================================
export async function DELETE(request: NextRequest) {
    try {
        const supabase = getSupabaseAdmin();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
        }

        // 1. 删除数据库行
        const { error } = await supabase.from('analyses').delete().eq('id', id);

        if (error) {
            console.error('Supabase delete error:', error);
            return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
        }

        // 2. 删除 Storage 中的图片（静默失败）
        await deleteImage(id);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/history error:', err);
        return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
    }
}
