// app/api/analyze-food/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

type Provider = 'groq' | 'nvidia' | 'gemini' | 'mock';

const PROVIDER = (process.env.ANALYSIS_PROVIDER || 'mock') as Provider;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Performance configuration
const TIMEOUT_MS = 30_000;
const CACHE_TTL_MS = 10 * 60 * 1000;        // cache for 10 minutes
const CACHE_MAX_SIZE = 100;                 // max 100 cached entries
const IMAGE_MAX_BYTES = 4 * 1024 * 1024;    // images >4MB should be compressed on frontend

// ============================================
// Unified prompt
// ============================================
const ANALYSIS_PROMPT = `Identify foods in this image. Return ONLY valid JSON:
{
  "foods": ["food1", "food2"],
  "calories": 520,
  "nutrition": {"protein": 28, "carbs": 45, "fat": 18}
}

Rules:
- Use short food names (max 4 words each)
- If no food: {"foods": [], "calories": 0, "nutrition": {"protein": 0, "carbs": 0, "fat": 0}}
- All numbers must be integers, no strings, no placeholders`;

// ============================================
// Type definitions
// ============================================
interface FoodResult {
  foods: string[];
  calories: number;
  nutrition: { protein: number; carbs: number; fat: number };
}

interface CachedEntry {
  result: FoodResult;
  expiresAt: number;
  provider: Provider;
}

// ============================================
// In-memory cache (Map with LRU eviction)
// ============================================
const analysisCache = new Map<string, CachedEntry>();

function hashImage(base64: string): string {
  // SHA-256 hash ensures the same image always maps to the same key
  return createHash('sha256').update(base64).digest('hex').substring(0, 16);
}

function getCached(key: string): FoodResult | null {
  const entry = analysisCache.get(key);
  if (!entry) return null;

  // Expired → delete
  if (Date.now() > entry.expiresAt) {
    analysisCache.delete(key);
    return null;
  }

  // LRU: re-insert to move to end of Map (most recently used)
  analysisCache.delete(key);
  analysisCache.set(key, entry);
  return entry.result;
}

function setCached(key: string, result: FoodResult) {
  // Exceeded max capacity → evict oldest (head of Map)
  if (analysisCache.size >= CACHE_MAX_SIZE) {
    const oldestKey = analysisCache.keys().next().value;
    if (oldestKey) analysisCache.delete(oldestKey);
  }

  analysisCache.set(key, {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS,
    provider: PROVIDER,
  });
}

// ============================================
// fetch with timeout
// ============================================
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================
// JSON parsing (handles markdown wrapping, trailing text, etc.)
// ============================================
function safeJsonParse(text: string): FoodResult {
  // Attempt 1: direct parse
  try {
    return JSON.parse(text);
  } catch { }

  // Strip markdown markers
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  // Attempt 2: parse after cleaning
  try {
    return JSON.parse(cleaned);
  } catch { }

  // Attempt 3: extract full { ... } block
  const fullMatch = cleaned.match(/\{[\s\S]*\}/);
  if (fullMatch) {
    try {
      return JSON.parse(fullMatch[0]);
    } catch { }
  }

  // Attempt 4: repair truncated JSON
  // e.g. '{"foods": ["A", "B"], "c'  →  '{"foods": ["A", "B"]}'
  try {
    return repairTruncatedJson(cleaned);
  } catch { }

  throw new Error(`Could not parse JSON from response: ${text.substring(0, 200)}`);
}

// ====================================================
// Attempt to repair truncated JSON — as long as the foods array is intact
// ====================================================
function repairTruncatedJson(text: string): FoodResult {
  // Extract foods array
  const foodsMatch = text.match(/"foods"\s*:\s*\[([\s\S]*?)\]/);
  if (!foodsMatch) throw new Error('No foods array found');

  // Parse foods array
  const foodsArrayStr = '[' + foodsMatch[1] + ']';
  let foods: string[];
  try {
    foods = JSON.parse(foodsArrayStr);
  } catch {
    throw new Error('Could not parse foods array');
  }

  // Extract numeric fields (use sensible defaults if missing)
  const caloriesMatch = text.match(/"calories"\s*:\s*(\d+)/);
  const proteinMatch = text.match(/"protein"\s*:\s*(\d+)/);
  const carbsMatch = text.match(/"carbs"\s*:\s*(\d+)/);
  const fatMatch = text.match(/"fat"\s*:\s*(\d+)/);

  console.warn(`⚠️  JSON was truncated, recovered partial result: ${foods.length} foods`);

  return {
    foods,
    calories: caloriesMatch ? parseInt(caloriesMatch[1]) : 0,
    nutrition: {
      protein: proteinMatch ? parseInt(proteinMatch[1]) : 0,
      carbs: carbsMatch ? parseInt(carbsMatch[1]) : 0,
      fat: fatMatch ? parseInt(fatMatch[1]) : 0,
    },
  };
}

// ============================================
// Main handler 
// ============================================
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Accept both data URL with header and plain base64
    const base64Image = image.includes(',') ? image.split(',')[1] : image;

    // Monitor: image size
    const imageBytes = Math.floor(base64Image.length * 0.75);  // base64 decoded is ~75% of encoded size
    const imageKB = (imageBytes / 1024).toFixed(0);

    if (imageBytes > IMAGE_MAX_BYTES) {
      console.warn(`⚠️  Large image: ${imageKB}KB. Consider compressing on frontend.`);
    }

    // Cache check
    const cacheKey = hashImage(base64Image);
    const cached = getCached(cacheKey);
    if (cached) {
      const elapsed = Date.now() - startTime;
      console.log(`✨ Cache HIT (${cacheKey.substring(0, 8)}) in ${elapsed}ms | image: ${imageKB}KB`);
      return NextResponse.json({
        ...cached,
        _meta: { cached: true, elapsedMs: elapsed, provider: PROVIDER },
      });
    }

    // Cache miss — call AI provider
    console.log(`🔍 Analyzing with provider: ${PROVIDER} | image: ${imageKB}KB | cache size: ${analysisCache.size}`);

    let result: FoodResult;
    switch (PROVIDER) {
      case 'groq':
        result = await analyzeWithGroq(base64Image);
        break;
      case 'nvidia':
        result = await analyzeWithNvidia(base64Image);
        break;
      case 'gemini':
        result = await analyzeWithGemini(base64Image);
        break;
      default:
        result = await analyzeWithMock();
    }

    // Write to cache
    setCached(cacheKey, result);

    const elapsed = Date.now() - startTime;
    console.log(`✅ Analysis done in ${elapsed}ms | provider: ${PROVIDER}`);

    return NextResponse.json({
      ...result,
      _meta: { cached: false, elapsedMs: elapsed, provider: PROVIDER },
    });

  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ API Error after ${elapsed}ms:`, error);

    // Distinguish timeout from other errors
    const isTimeout = error instanceof Error && error.name === 'AbortError';

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: PROVIDER,
        elapsedMs: elapsed,
      },
      { status: isTimeout ? 504 : 500 }
    );
  }
}

// ============================================
// Groq API
// ============================================
async function analyzeWithGroq(imageBase64: string): Promise<FoodResult> {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured');

  const response = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.2-90b-vision-preview',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: ANALYSIS_PROMPT },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ],
      }],
      temperature: 0.3,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API ${response.status}: ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq returned no content');
  return safeJsonParse(content);
}

// ============================================
// NVIDIA API
// ============================================
async function analyzeWithNvidia(imageBase64: string): Promise<FoodResult> {
  if (!NVIDIA_API_KEY) throw new Error('NVIDIA_API_KEY is not configured');

  const response = await fetchWithTimeout('https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: ANALYSIS_PROMPT },
          { type: 'image_url', image_url: `data:image/jpeg;base64,${imageBase64}` },
        ],
      }],
      temperature: 0.2,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`NVIDIA API ${response.status}: ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || data.response;
  if (!content) throw new Error('NVIDIA returned no content');
  return safeJsonParse(content);
}

// ============================================
// Gemini API
// ============================================
async function analyzeWithGemini(imageBase64: string): Promise<FoodResult> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');

  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: ANALYSIS_PROMPT },
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
          ],
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API ${response.status}: ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no text');
  return safeJsonParse(text);
}

// ============================================
// Mock
// ============================================
async function analyzeWithMock(): Promise<FoodResult> {
  const mockFoods = [
    { foods: ['Grilled Chicken', 'Steamed Broccoli', 'Brown Rice'], calories: 485, protein: 38, carbs: 42, fat: 16 },
    { foods: ['Caesar Salad', 'Grilled Salmon'], calories: 520, protein: 35, carbs: 15, fat: 28 },
    { foods: ['Greek Yogurt', 'Mixed Berries', 'Granola'], calories: 350, protein: 20, carbs: 45, fat: 10 },
    { foods: ['Vegetable Stir Fry', 'Tofu', 'Quinoa'], calories: 420, protein: 22, carbs: 55, fat: 14 },
    { foods: ['Egg Sandwich', 'Avocado'], calories: 380, protein: 18, carbs: 35, fat: 18 },
  ];
  const random = mockFoods[Math.floor(Math.random() * mockFoods.length)];
  await new Promise(resolve => setTimeout(resolve, 1000));
  return {
    foods: random.foods,
    calories: random.calories,
    nutrition: { protein: random.protein, carbs: random.carbs, fat: random.fat },
  };
}