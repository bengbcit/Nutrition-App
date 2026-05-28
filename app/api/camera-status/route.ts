// app/api/camera-status/route.ts
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Cache detection results to avoid running the command every time
let cachedResult: { piCamera: boolean; details: string } | null = null;
let cacheTime = 0;
const CACHE_TTL = 30_000; // 30 秒缓存

export async function GET() {
  // 缓存命中直接返回
  if (cachedResult && Date.now() - cacheTime < CACHE_TTL) {
    return NextResponse.json(cachedResult);
  }

  try {
    const { stdout } = await execAsync(
      'rpicam-hello --list-cameras 2>&1',
      { timeout: 3000 }
    );

    // 检测到摄像头芯片型号 = 可用
    const hasCamera = /ov\d+|imx\d+/i.test(stdout);

    cachedResult = {
      piCamera: hasCamera,
      details: hasCamera ? 'CSI camera detected' : 'No CSI camera found',
    };
    cacheTime = Date.now();
    return NextResponse.json(cachedResult);
  } catch {
    // rpicam-hello 不存在 = 不是 Pi 或不支持
    cachedResult = {
      piCamera: false,
      details: 'rpicam not available (not a Pi or no camera support)',
    };
    cacheTime = Date.now();
    return NextResponse.json(cachedResult);
  }
}