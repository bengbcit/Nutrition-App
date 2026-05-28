# Nutrition Fitness App — AI 食物扫描仪

基于 AI 的食物识别应用，原生支持 **Raspberry Pi CSI 摄像头**，放在厨房就能用。

[GitHub](https://github.com/bengbcit/Nutrition-App) | 支持 Vercel 部署

## 功能

- 📸 **3 种拍照方式**: 浏览器摄像头 / Pi CSI 摄像头 / 文件上传
- 🤖 **多 AI 提供商**: Claude (Anthropic) / Groq / NVIDIA / Gemini，环境变量一键切换
- 📊 卡路里 + 三大宏量营养素（蛋白质、碳水、脂肪）分析
- 💾 **Supabase 云端存储**: PostgreSQL + 图片存储，未配置时自动降级到 localStorage
- 🥧 **Raspberry Pi 原生支持**: CSI 摄像头实时预览 + 拍照（通过 `rpicam-still`）
- 📅 每日营养摘要 & 分析历史记录
- 🎨 纯 Tailwind CSS 4，零组件库依赖

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) + React 19 |
| 语言 | TypeScript 5 |
| 样式 | Tailwind CSS 4 |
| AI | Claude / Groq / Gemini / NVIDIA |
| 数据库 | Supabase (PostgreSQL + Storage) |
| 部署 | Vercel + Raspberry Pi 本地 |

## 架构

```
浏览器摄像头 ──┐
Pi CSI 摄像头 ──┼── SmartCamera ── API analyze-food ── 缓存? ── AI 提供商
文件上传 ──────┘                                      │
Demo 图片 ─────┘                              命中 → 返回缓存
                                                      │
                                              未命中 → Claude/Groq/Gemini
                                                      │
                                              结果 → UI + 历史 → Supabase
```

## 快速开始

```bash
npm install
# 复制 .env.example → .env.local，设置 ANALYSIS_PROVIDER=mock
npm run dev        # http://localhost:3000
npm run dev:https  # HTTPS 模式（浏览器摄像头需要）
```

## Supabase 配置（5 分钟）

1. 在 [supabase.com](https://supabase.com) 创建项目
2. SQL Editor → 运行 `supabase-init.sql`
3. Storage → 创建 `food-photos` 桶（设为公开）
4. 添加到 `.env.local`：
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxxxxxxxxx
```

## 关键设计决策

- **video 元素常驻 DOM**: 通过 `className="hidden"` 解决条件渲染导致的 `videoRef.current === null` bug
- **LRU 缓存**: SHA-256 哈希 → 10 分钟 TTL → 最多 100 条。同一张照片不会重复调用 AI
- **多 Provider 统一接口**: 统一的 `ANALYSIS_PROMPT` + route handler 内的 switch 分发
- **优雅降级**: Supabase 不可用 → 自动回退到 localStorage，不影响使用
- **Pi 摄像头桥接**: 通过 `child_process.exec` 调用 `rpicam-still`，用 `Image.onload` 消除预览闪烁
