# Nutrition Fitness App — AI-Powered Food Scanner

AI-powered food recognition app with **Raspberry Pi CSI camera** support.

[GitHub](https://github.com/bengbcit/Nutrition-App) | Vercel deploy ready

## Features

- 📸 **3 capture methods**: Browser camera / Pi CSI camera / File upload
- 🤖 **Multi-provider AI**: Claude (Anthropic) / Groq / NVIDIA / Gemini — switchable via env
- 📊 Calorie + macro nutrition analysis (protein, carbs, fat)
- 💾 **Supabase persistence**: PostgreSQL + Storage with auto-fallback to localStorage
- 🥧 **Raspberry Pi native**: CSI camera live preview + capture via `rpicam-still`
- 📅 Daily nutrition summary & analysis history
- 🎨 Tailwind CSS 4 — no component library needed

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| AI | Claude / Groq / Gemini / NVIDIA |
| Database | Supabase (PostgreSQL + Storage) |
| Deployment | Vercel + Raspberry Pi |

## Architecture

```
Browser Camera ─┐
Pi CSI Camera ──┼── SmartCamera ── API analyze-food ── Cache? ── AI Provider
File Upload ────┘                                      │
Demo Images ────┘                              hit → return cached
                                                      │
                                               miss → Claude/Groq/Gemini
                                                      │
                                              Result → UI + History → Supabase
```

## Quick Start

```bash
npm install
# Copy .env.example → .env.local, set ANALYSIS_PROVIDER=mock
npm run dev        # http://localhost:3000
npm run dev:https  # HTTPS (required for browser camera)
```

## Supabase Setup (5 min)

1. Create project at [supabase.com](https://supabase.com)
2. SQL Editor → run `supabase-init.sql`
3. Storage → create bucket `food-photos` (public)
4. Add to `.env.local`:
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxxxxxxxxx
```

## Key Design Decisions

- **Video element always in DOM**: Fixed the `videoRef.current === null` bug by keeping `<video>` rendered (hidden when inactive) instead of conditional rendering
- **LRU cache**: SHA-256 hash → 10-min TTL → max 100 entries. Same photo never re-analyzed
- **Multi-provider pattern**: Unified `ANALYSIS_PROMPT` + provider-switch in route handler
- **Graceful degradation**: Supabase unavailable → auto-fallback to localStorage
- **Pi camera bridge**: `rpicam-still` via `child_process.exec`, `Image.onload` for flicker-free preview
