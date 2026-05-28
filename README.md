# Nutrition Fitness App

AI-powered food recognition app — supports Raspberry Pi CSI camera + multi-provider AI

## Features
- 📸 Browser camera / Pi CSI camera / File upload — 3 ways to capture food photos
- 🤖 Multi-provider AI: Claude (Anthropic) / Groq / NVIDIA / Gemini
- 📊 Calorie + macro nutrition (protein, carbs, fat) analysis
- 💾 Supabase persistence: cloud DB + image storage (auto-fallback to localStorage)
- 🥧 Raspberry Pi CSI camera native support with live preview
- 📅 Daily nutrition summary & analysis history
- 🎨 Responsive UI with Tailwind CSS 4

## Tech Stack
- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS 4
- **AI**: Claude / Groq / Gemini / NVIDIA (switchable via env)
- **Database**: Supabase (PostgreSQL + Storage)
- **Deployment**: Vercel + Raspberry Pi local

## Getting Started

### Prerequisites
- Node.js 18+
- (Optional) Supabase project — falls back to localStorage if not configured
- (Optional) AI API key — mock mode available for development

### Installation
\`\`\`bash
npm install
\`\`\`

### Environment Variables
Create `.env.local`:
\`\`\`bash
# AI Provider (mock | groq | gemini | nvidia)
ANALYSIS_PROVIDER=mock

# Choose one based on provider:
GROQ_API_KEY=gsk_xxxxxxxx
GEMINI_API_KEY=AIza_xxxxxxxx
# No key needed for mock mode

# Supabase (optional — falls back to localStorage)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxxxxxxxxx
\`\`\`

### Supabase Setup (5 minutes)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste & run `supabase-init.sql`
3. Go to **Storage** → create bucket `food-photos` (public)
4. Copy `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from Settings → API
5. Add them to `.env.local`

> ⚠️ Use `SUPABASE_SERVICE_ROLE_KEY` (not the anon key). This stays on the server-side only.

### Development
\`\`\`bash
npm run dev          # http://localhost:3000
npm run dev:https    # HTTPS mode (required for browser camera)
\`\`\`

## Deployment
Deploy to Vercel:
\`\`\`bash
npm run build
vercel deploy
\`\`\`
Add the same environment variables in Vercel Dashboard → Settings → Environment Variables.

## Project Structure
\`\`\`
app/
├── api/
│   ├── analyze-food/route.ts   # AI analysis (multi-provider + LRU cache)
│   ├── camera-status/route.ts  # Pi CSI camera detection
│   ├── capture/route.ts        # Pi camera capture
│   ├── history/route.ts        # Supabase CRUD for history
│   └── preview/route.ts        # Pi camera live preview
├── components/
│   ├── Camera.tsx              # Browser getUserMedia camera
│   ├── SmartCamera.tsx         # Auto-detect Pi vs browser camera
│   ├── PiCamera.tsx            # Pi CSI camera with live preview
│   ├── ImageUploader.tsx       # Drag & drop file upload
│   ├── DemoImages.tsx          # Pre-loaded demo images
│   ├── ResultDisplay.tsx       # Food names + calorie bar
│   ├── NutritionChart.tsx      # Macro breakdown chart
│   └── AnalysisHistory.tsx     # History list + daily summary
├── lib/
│   ├── history.ts              # Data persistence (Supabase + localStorage fallback)
│   └── supabase.ts             # Supabase server client + storage helpers
├── page.tsx                    # Main page (orchestrator)
└── layout.tsx                  # Root layout
\`\`\`

## Demo Images
Burger, Salad, and Bento images from https://www.magnific.com (License: CC0)


## License
MIT