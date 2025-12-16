import { NextRequest } from 'next/server';
import { generateAI, type AIConfig } from '@/lib/ai/client';

export const runtime = 'edge';

interface ExpandRequest {
  text: string;
  context?: string;
  provider?: 'cloud' | 'local';
  ollamaUrl?: string;
  localModel?: string;
}

interface ExpandResponse {
  content: string;
}

/**
 * Fractal Expansion API
 * Expands short summaries into detailed, sensory-rich scenes
 */
export async function POST(request: NextRequest) {
  try {
    const { text, context, provider = 'cloud', ollamaUrl, localModel } = (await request.json()) as ExpandRequest;

    // Validate request
    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: text is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build system prompt
    const systemPrompt = `You are AETHERIS FRACTAL, a creative expansion engine.

TASK:
Turn the user's SHORT SUMMARY (1-2 sentences) into a DETAILED SCENE (300-500 words).

GUIDELINES:
- SHOW, DON'T TELL. Focus on sensory details (sight, sound, smell, touch, taste).
- Maintain the tone of the provided Context (if any).
- Stay true to the plot point described in the summary, but expand strictly on the *execution* of that moment.
- Use vivid imagery and evocative language.
- Create atmosphere and immerse the reader in the scene.
- Output ONLY the generated prose. No intros, no explanations, no meta-commentary.

RESPONSE FORMAT (JSON only, no markdown):
{
  "content": "The expanded prose goes here..."
}

IMPORTANT: Always respond in Chinese (中文) if the summary is in Chinese. Match the language of the original text.`;

    // Build user prompt
    let userPrompt = `摘要需扩展：\n${text}`;

    if (context && context.trim().length > 0) {
      userPrompt += `\n\n世界背景：\n${context}`;
    }

    userPrompt += '\n\n请将上述摘要扩展为详细的场景描写（300-500字），注重感官细节和氛围营造。只输出扩展后的散文内容，不要添加任何说明。';

    // Prepare AI configuration
    const aiConfig: AIConfig = {
      provider,
      ollamaUrl,
      localModel,
      temperature: 0.8,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    };

    // Call AI (Cloud or Local)
    const { content: responseContent } = await generateAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      aiConfig
    );

    if (!responseContent) {
      return new Response(
        JSON.stringify({ error: 'No response from AI' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse AI response
    let result: ExpandResponse;
    try {
      result = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseContent);
      // Fallback: assume the content itself is the expanded text
      result = { content: responseContent };
    }

    // Validate response structure
    if (!result.content || typeof result.content !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid response format from AI' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Clean up response (remove markdown code blocks if present)
    let expandedContent = result.content.trim();
    
    // Remove markdown code blocks
    if (expandedContent.startsWith('```') && expandedContent.endsWith('```')) {
      expandedContent = expandedContent
        .replace(/^```[\w]*\n/, '')
        .replace(/\n```$/, '')
        .trim();
    }

    // Remove common meta-commentary patterns
    const metaPatterns = [
      /^这是扩展后的内容[：:]/i,
      /^以下是扩展后的场景[：:]/i,
      /^扩展后的场景如下[：:]/i,
      /^Here is the expanded scene[：:]/i,
    ];

    for (const pattern of metaPatterns) {
      expandedContent = expandedContent.replace(pattern, '').trim();
    }

    return new Response(JSON.stringify({ content: expandedContent }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Fractal expansion error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
