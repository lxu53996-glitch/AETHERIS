/**
 * DeepSeek AI Client
 * Production-ready integration for AETHERIS
 */

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekStreamOptions {
  model?: string;
  messages: DeepSeekMessage[];
  temperature?: number;
  maxTokens?: number;
  onChunk?: (text: string) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Call DeepSeek API with streaming support
 */
export async function streamDeepSeek(options: DeepSeekStreamOptions): Promise<void> {
  const {
    model = process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    messages,
    temperature = 0.7,
    maxTokens = 2000,
    onChunk,
    onComplete,
    onError,
  } = options;

  const apiKey = process.env.DEEPSEEK_API_KEY;
  const apiBase = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  try {
    const response = await fetch(`${apiBase}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          
          if (data === '[DONE]') {
            onComplete?.();
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            
            if (content) {
              onChunk?.(content);
            }
          } catch (e) {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }

    onComplete?.();
  } catch (error) {
    onError?.(error as Error);
  }
}

/**
 * Generate plot branches using DeepSeek
 */
export async function generatePlotBranches(
  prompt: string,
  logicMode: 'creative' | 'logical' | 'balanced',
  onBranchGenerated: (branch: { id: string; title: string; description: string }) => void
): Promise<void> {
  const systemPrompt = getSystemPrompt(logicMode);
  
  const messages: DeepSeekMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ];

  let currentBranch = '';
  const branches: Array<{ id: string; title: string; description: string }> = [];

  await streamDeepSeek({
    messages,
    temperature: logicMode === 'creative' ? 0.9 : logicMode === 'logical' ? 0.5 : 0.7,
    maxTokens: 800,
    onChunk: (text) => {
      currentBranch += text;
      
      // Parse branches from the generated text
      const parsedBranches = parseBranches(currentBranch);
      
      // Emit new branches as they are completed
      parsedBranches.forEach((branch) => {
        if (!branches.find((b) => b.id === branch.id)) {
          branches.push(branch);
          onBranchGenerated(branch);
        }
      });
    },
    onComplete: () => {
      console.log('DeepSeek generation complete');
    },
    onError: (error) => {
      console.error('DeepSeek error:', error);
      throw error;
    },
  });
}

/**
 * Get system prompt based on logic mode
 */
function getSystemPrompt(mode: 'creative' | 'logical' | 'balanced'): string {
  const basePrompt = `You are a creative writing assistant for AETHERIS, an AI-powered story writing platform.

Given a story context, generate exactly 3 distinct plot branches labeled A, B, and C.

Output format (strict JSON):
{
  "branches": [
    {
      "id": "A",
      "title": "Brief title (2-4 words)",
      "description": "One paragraph describing this plot path (30-50 words)"
    },
    {
      "id": "B",
      "title": "Brief title",
      "description": "One paragraph description"
    },
    {
      "id": "C",
      "title": "Brief title",
      "description": "One paragraph description"
    }
  ]
}`;

  const modeInstructions = {
    creative: '\n\nFocus on: Unexpected twists, emotional depth, and narrative surprises.',
    logical: '\n\nFocus on: Cause-effect relationships, practical outcomes, and realistic consequences.',
    balanced: '\n\nFocus on: A mix of creativity and logic, balancing surprise with coherence.',
  };

  return basePrompt + modeInstructions[mode];
}

/**
 * Parse branches from generated text
 */
function parseBranches(text: string): Array<{ id: string; title: string; description: string }> {
  try {
    // Try to extract JSON from the text
    const jsonMatch = text.match(/\{[\s\S]*"branches"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.branches || [];
    }
  } catch (e) {
    // Fallback: return empty array if parsing fails
  }
  return [];
}
