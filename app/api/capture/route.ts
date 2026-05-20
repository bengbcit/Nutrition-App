// app/api/capture/route.ts
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';

const RESOLUTION_WIDTH = process.env.CAMERA_WIDTH || '1920';
const RESOLUTION_HEIGHT = process.env.CAMERA_HEIGHT || '1080';
const JPEG_QUALITY = process.env.CAMERA_JPEG_QUALITY || '95';
const WARMUP_MS = process.env.CAMERA_WARMUP_MS || '1500';

const execAsync = promisify(exec);

export async function POST() {
  const tmpFile = path.join(os.tmpdir(), `capture-${Date.now()}.jpg`);
  
  try {
    // rpicam-still 参数：
    // -o: 输出文件
    // --width/--height: 分辨率
    // -t: 预热时间（让 AE/AWB 稳定）
    // -q: JPEG 质量
    // -n: 无预览（headless 必须）
    await execAsync(
      `rpicam-still -o ${tmpFile} ` +
      `--width ${RESOLUTION_WIDTH} --height ${RESOLUTION_HEIGHT} ` +
      `-t ${WARMUP_MS} -q ${JPEG_QUALITY} -n`,
      { timeout: 15000 }
    );
    
    const buffer = await readFile(tmpFile);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;
    
    await unlink(tmpFile).catch(() => {});
    
    return NextResponse.json({ image: dataUrl });
  } catch (error) {
    await unlink(tmpFile).catch(() => {});
    console.error('Capture error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Capture failed' },
      { status: 500 }
    );
  }
}