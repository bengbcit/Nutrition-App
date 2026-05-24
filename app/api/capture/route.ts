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
  
  let lastError: unknown;
  
  // 重试最多 3 次，间隔递增
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await execAsync(
        `rpicam-still -o ${tmpFile} ` +
        `--width ${RESOLUTION_WIDTH} --height ${RESOLUTION_HEIGHT} ` +
        `-t ${WARMUP_MS} -q ${JPEG_QUALITY} -n`,
        { timeout: 15000 }
      );
      
      // 成功了
      const buffer = await readFile(tmpFile);
      const base64 = buffer.toString('base64');
      await unlink(tmpFile).catch(() => {});
      return NextResponse.json({ image: `data:image/jpeg;base64,${base64}` });
      
    } catch (error) {
      lastError = error;
      const errMsg = error instanceof Error ? error.message : String(error);
      const isCameraBusy = errMsg.includes('in use by another process');
      
      console.warn(`Capture attempt ${attempt}/3 failed${isCameraBusy ? ' (camera busy)' : ''}`);
      
      // 不是最后一次 → 等会再试
      if (attempt < 3) {
        // 摄像头被占等更久，其他错误等短点
        const delay = isCameraBusy ? 800 : 200;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  
  // 3 次都失败
  await unlink(tmpFile).catch(() => {});
  console.error('Capture failed after 3 attempts:', lastError);
  return NextResponse.json(
    { 
      error: lastError instanceof Error ? lastError.message.substring(0, 200) : 'Capture failed',
    },
    { status: 500 }
  );
}