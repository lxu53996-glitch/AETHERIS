import { NextRequest } from 'next/server';
import { generateAI, type AIConfig } from '@/lib/ai/client';

export const runtime = 'edge';

interface CouncilRequest {
  text: string;
  context?: string;
  provider?: 'cloud' | 'local';
  ollamaUrl?: string;
  localModel?: string;
}

interface Review {
  role: string;
  score: number;
  comment: string;
}

interface CouncilResponse {
  reviews: Review[];
  overall_verdict: string;
}

/**
 * AI Council API
 * Three distinct AI personas analyze a novel chapter from different perspectives
 */
export async function POST(request: NextRequest) {
  try {
    const { text, context, provider = 'cloud', ollamaUrl, localModel } = (await request.json()) as CouncilRequest;

    // Validate request
    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: text is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build system prompt
    const systemPrompt = `You are the AETHERIS HIGH COUNCIL. You consist of three distinct personas analyzing a novel chapter.

PERSONAS:
1. [LOGICIAN]: Obsessed with plot holes, causality, and realism. Critical of 'deus ex machina'. Analytical and precise.
2. [MERCHANT]: Obsessed with pacing, hook, reader retention, and market trends. Loves cliffhangers. Commercial-minded.
3. [POET]: Obsessed with prose quality, metaphors, sensory details, and emotional depth. Hates clichés. Artistic and refined.

TASK:
Analyze the user's text. Each persona must provide:
- score (1-100): Numeric quality rating from their perspective
- comment: Short, sharp critique in their specific voice (max 150 characters)

RESPONSE FORMAT (JSON only, no markdown):
{
  "reviews": [
    { "role": "Logician", "score": 85, "comment": "..." },
    { "role": "Merchant", "score": 60, "comment": "..." },
    { "role": "Poet", "score": 72, "comment": "..." }
  ],
  "overall_verdict": "A brief summary sentence synthesizing all three perspectives."
}

IMPORTANT: Always respond in Chinese (中文). All comments and verdicts must be in Chinese.`;

    // Build user prompt
    let userPrompt = `请分析以下章节内容：

${text}`;

    if (context) {
      userPrompt += `\n\n背景信息：\n${context}`;
    }

    userPrompt += '\n\n请三位评审员分别从各自的角度进行评分和点评。';

    // Prepare AI configuration
    const aiConfig: AIConfig = {
      provider,
      ollamaUrl,
      localModel,
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    };

    // Call AI (Cloud or Local)
    const { content } = await generateAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      aiConfig
    );

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No response from AI' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse AI response
    let result: CouncilResponse;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Return default response if parsing fails
      result = {
        reviews: [
          { role: 'Logician', score: 50, comment: '解析失败，无法分析' },
          { role: 'Merchant', score: 50, comment: '解析失败，无法分析' },
          { role: 'Poet', score: 50, comment: '解析失败，无法分析' },
        ],
        overall_verdict: 'AI 响应解析失败，请重试',
      };
    }

    // Validate response structure
    if (!result.reviews || !Array.isArray(result.reviews)) {
      result.reviews = [
        { role: 'Logician', score: 50, comment: '数据格式错误' },
        { role: 'Merchant', score: 50, comment: '数据格式错误' },
        { role: 'Poet', score: 50, comment: '数据格式错误' },
      ];
    }

    if (!result.overall_verdict) {
      result.overall_verdict = '评审数据不完整';
    }

    // Ensure we have exactly 3 reviews
    if (result.reviews.length !== 3) {
      console.warn('Unexpected number of reviews:', result.reviews.length);
      // Pad or trim to 3 reviews
      while (result.reviews.length < 3) {
        result.reviews.push({
          role: 'Unknown',
          score: 50,
          comment: '评审缺失',
        });
      }
      result.reviews = result.reviews.slice(0, 3);
    }

    // Validate each review
    result.reviews = result.reviews.map((review) => ({
      role: review.role || 'Unknown',
      score: typeof review.score === 'number' ? Math.max(1, Math.min(100, review.score)) : 50,
      comment: review.comment || '无评论',
    }));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI Council error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
