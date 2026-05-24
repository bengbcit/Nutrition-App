// app/api/preview/route.ts
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

// 预览用更低分辨率和质量，跑得快
const PREVIEW_WIDTH = process.env.PREVIEW_WIDTH || '640';
const PREVIEW_HEIGHT = process.env.PREVIEW_HEIGHT || '480';
const PREVIEW_QUALITY = process.env.PREVIEW_QUALITY || '70';

export async function GET() {
  const tmpFile = path.join(os.tmpdir(), `preview-${Date.now()}.jpg`);
  
  try {
    // --immediate: 跳过 AE/AWB 等待（预览不需要完美曝光）
    // -t 1: 最短预热时间
    // -n: 无预览窗口
    await execAsync(
      `rpicam-still -o ${tmpFile} ` +
      `--width ${PREVIEW_WIDTH} --height ${PREVIEW_HEIGHT} ` +
      `-t 1 -q ${PREVIEW_QUALITY} -n --immediate`,
      { timeout: 5000 }
    );
    
    const buffer = await readFile(tmpFile);
    await unlink(tmpFile).catch(() => {});
    
    // 直接返回 jpeg 二进制（比 base64 快 33%）
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    await unlink(tmpFile).catch(() => {});
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Preview failed' },
      { status: 500 }
    );
  }
}