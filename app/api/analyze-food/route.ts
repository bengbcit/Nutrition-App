// app/api/analyze-food/route.ts
import { NextRequest, NextResponse } from 'next/server';

type Provider = 'groq' | 'nvidia' | 'gemini' | 'mock';

// 获取环境变量
const PROVIDER = (process.env.ANALYSIS_PROVIDER || 'mock') as Provider;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    // 移除 base64 头 (data:image/jpeg;base64,) 兼容带 header 和不带 header 两种格式
    const base64Image = image.includes(',') ? image.split(',')[1] : image;

    let result;
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

    return NextResponse.json(result);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze food' },
      { status: 500 }
    );
  }
}

// ============================================
// Groq API (最快，推荐)
// ============================================
async function analyzeWithGroq(imageBase64: string) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.2-90b-vision-preview',  // 或 'llama-3.2-11b-vision-preview'
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this food image and return ONLY valid JSON in this exact format:
{
  "foods": ["food1", "food2"],
  "calories": 450,
  "nutrition": {
    "protein": 25,
    "carbs": 40,
    "fat": 15
  }
}
Use real estimates. Be specific about food types.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" }
    })
  });

  const data = await response.json();
  const content = data.choices[0].message.content;
  return JSON.parse(content);
}

// ============================================
// NVIDIA API
// ============================================
async function analyzeWithNvidia(imageBase64: string) {
  // NVIDIA 需要先获取 NGC API Key
  // 注册: https://build.nvidia.com/

  const response = await fetch('https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this food image. Return JSON with foods(array), calories(number), nutrition(protein,carbs,fat in grams)'
            },
            {
              type: 'image_url',
              image_url: `data:image/jpeg;base64,${imageBase64}`
            }
          ]
        }
      ],
      temperature: 0.2,
      max_tokens: 300
    })
  });

  const data = await response.json();
  // NVIDIA 返回格式可能不同，需要根据实际响应调整
  const content = data.choices?.[0]?.message?.content || data.response;

  try {
    return JSON.parse(content);
  } catch {
    // 如果返回不是 JSON，尝试提取
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Invalid response format');
  }
}

// ============================================
// Google Gemini API (免费额度大)
// ============================================
async function analyzeWithGemini(imageBase64: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Analyze this food image. Return ONLY valid JSON in this exact format, no markdown, no explanation:
{
  "foods": ["specific food names"],
  "calories": estimated_calories,
  "nutrition": {
    "protein": grams,
    "carbs": grams,
    "fat": grams
  }
}`
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: imageBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 500,
          responseMimeType: "application/json"
        }
      })
    }
  );

  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;

  // 清理可能的 markdown 标记
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  return JSON.parse(cleaned);
}

// ============================================
// Mock 分析（用于测试，无需 API Key）
// ============================================
async function analyzeWithMock() {
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
    nutrition: {
      protein: random.protein,
      carbs: random.carbs,
      fat: random.fat
    }
  };
}