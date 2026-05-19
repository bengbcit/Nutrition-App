# Nutrition Fitness App

AI-powered food recognition app using Claude Vision API + Next.js

## Features
- 📸 Real-time food photo capture
- 🤖 AI food recognition using Claude Vision
- 📊 Nutritional information display
- 💾 Supabase data persistence
- 🎨 Responsive UI with Tailwind CSS

## Tech Stack
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **AI**: Claude Vision API
- **Database**: Supabase
- **Deployment**: Vercel

## Getting Started

### Prerequisites
- Node.js 18+
- Claude API Key
- Supabase Project

### Installation
\`\`\`bash
npm install
\`\`\`

### Environment Variables
Create `.env.local`:
\`\`\`
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
ANTHROPIC_API_KEY=your_claude_api_key
\`\`\`

### Development
\`\`\`bash
npm run dev
# Visit http://localhost:3000
\`\`\`

## Deployment
Deploy to Vercel:
\`\`\`bash
npm run build
vercel deploy
\`\`\`

## Roadmap
- [ ] Camera component implementation
- [ ] Claude Vision API integration
- [ ] Result display UI
- [ ] Supabase integration
- [ ] Vercel deployment

## License
MIT