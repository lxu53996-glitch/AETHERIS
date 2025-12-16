import { NextRequest } from 'next/server';
import { generateAI, type AIConfig } from '@/lib/ai/client';

export const runtime = 'edge';

interface RefactorRequest {
  text: string;
  instruction: string;
  context?: string;
  provider?: 'cloud' | 'local';
  ollamaUrl?: string;
  localModel?: string;
}

interface RefactorResponse {
  rewritten: string;
}

/**
 * Text Refactoring API
 * Rewrites text based on user instructions while preserving meaning and plot
 */
export async function POST(request: NextRequest) {
  try {
    const { text, instruction, context, provider = 'cloud', ollamaUrl, localModel } = (await request.json()) as RefactorRequest;

    // Validate request
    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: text is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!instruction || instruction.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: instruction is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build system prompt
    const systemPrompt = `You are AETHERIS REFACTOR, a specialized text processing engine.

TASK:
Rewrite the provided text based STRICTLY on the user's instruction.

CONSTRAINTS:
- Preserve the original meaning and plot events.
- Do NOT add new content unless asked to 'expand'.
- Do NOT output conversational filler (e.g., 'Here is the text', 'I've rewritten...').
- Output ONLY the rewritten text.

COMMON INSTRUCTIONS:
- 'Convert to 3rd Person': Change 'I' to the character's name (from context) or 'he/she'.
- 'Convert to Past Tense': Change verbs to past tense.
- 'Enhance Style': Improve vocabulary and sensory details (Show, Don't Tell).
- 'Simplify': Use shorter sentences and common words.
- 'Add Dialogue': Insert character dialogue where appropriate.
- 'Remove Dialogue': Convert dialogue to narrative description.

RESPONSE FORMAT (JSON only, no markdown):
{
  "rewritten": "The rewritten text goes here..."
}

IMPORTANT: Always respond in Chinese (中文) if the original text is in Chinese. Match the language of the original text.`;

    // Build user prompt
    let userPrompt = `指令：${instruction}`;

    if (context && context.trim().length > 0) {
      userPrompt += `\n\n背景信息（角色名等）：\n${context}`;
    }

    userPrompt += `\n\n原始文本：\n${text}`;

    userPrompt += '\n\n请严格按照指令重写文本。只输出重写后的文本，不要添加任何解释或多余内容。';

    // Prepare AI configuration
    const aiConfig: AIConfig = {
      provider,
      ollamaUrl,
      localModel,
      temperature: 0.5,
      max_tokens: 4000,
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
    let result: RefactorResponse;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Fallback: assume the content itself is the rewritten text
      result = { rewritten: content };
    }

    // Validate response structure
    if (!result.rewritten || typeof result.rewritten !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid response format from AI' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Clean up response (remove markdown code blocks if present)
    let rewrittenText = result.rewritten.trim();
    
    // Remove markdown code blocks
    if (rewrittenText.startsWith('```') && rewrittenText.endsWith('```')) {
      rewrittenText = rewrittenText
        .replace(/^```[\w]*\n/, '')
        .replace(/\n```$/, '')
        .trim();
    }

    return new Response(JSON.stringify({ rewritten: rewrittenText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Text refactoring error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
