import { NextRequest } from 'next/server';

export const runtime = 'edge';

interface SimulateRequest {
  prompt: string;
  logicMode: 'creative' | 'logical' | 'balanced';
  context?: string;
  provider?: 'cloud' | 'local';
  ollamaUrl?: string;
  localModel?: string;
}

interface Branch {
  id: string;
  title: string;
  description: string;
}

/**
 * DeepSeek V3 API Integration
 * OpenAI-compatible streaming endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const { prompt, logicMode, context, provider = 'cloud', ollamaUrl, localModel } = (await request.json()) as SimulateRequest;

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const systemPrompt = buildSystemPrompt(logicMode, context);
          
          // Route to Cloud or Local based on provider
          let fullResponse = '';
          
          if (provider === 'local') {
            // Call Ollama (non-streaming for simplicity)
            const ollamaEndpoint = ollamaUrl || 'http://127.0.0.1:11434';
            const model = localModel || 'llama3';
            
            const ollamaResponse = await fetch(`${ollamaEndpoint}/api/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: prompt },
                ],
                stream: false,
                options: {
                  temperature: getTemperature(logicMode),
                  num_predict: 1500,
                },
              }),
            });
            
            if (!ollamaResponse.ok) {
              throw new Error(`Ollama API error: ${ollamaResponse.status}`);
            }
            
            const data = await ollamaResponse.json();
            fullResponse = data.message?.content || '';
          } else {
            // Call DeepSeek (Cloud) with streaming
            const apiKey = process.env.DEEPSEEK_API_KEY;
            if (!apiKey) {
              throw new Error('DEEPSEEK_API_KEY not configured');
            }
            
            const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: prompt },
                ],
                stream: true,
                temperature: getTemperature(logicMode),
                max_tokens: 1500,
              }),
            });
            
            if (!deepseekResponse.ok) {
              throw new Error(`DeepSeek API error: ${deepseekResponse.status}`);
            }
            
            // Read DeepSeek stream
            const reader = deepseekResponse.body?.getReader();
            if (!reader) {
              throw new Error('No stream reader available');
            }
            
            const decoder = new TextDecoder();
            let buffer = '';
            
            // Parse SSE stream from DeepSeek
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6).trim();
                  
                  if (data === '[DONE]') continue;
                  
                  try {
                    const chunk = JSON.parse(data);
                    const content = chunk.choices?.[0]?.delta?.content;
                    if (content) fullResponse += content;
                  } catch (e) {
                    // Ignore malformed chunks
                  }
                }
              }
            }
          }

          // Parse branches from complete response
          const branches = parseBranches(fullResponse);

          // Stream branches to frontend with typewriter effect
          await streamBranchesToClient(controller, encoder, branches, logicMode);

          // Send completion signal
          const doneSignal = { type: 'done' };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(doneSignal)}\n\n`));
          controller.close();
        } catch (error) {
          console.error('DeepSeek streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Request error:', error);
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Build system prompt for AETHERIS narrative engine
 */
function buildSystemPrompt(mode: 'creative' | 'logical' | 'balanced', context?: string): string {
  const basePrompt = `你是 AETHERIS，一个为创意作家设计的非线性叙事引擎。

${context ? `世界背景设定（WORLD CONTEXT）：
${context}

` : ''}你的任务：基于用户的故事上下文，生成恰好 3 个不同的情节分支。

规则：
1. 输出纯 JSON 格式（不要 markdown 代码块，不要额外解释）
2. 每个分支必须是 40-60 个汉字
3. 分支之间应该有显著的差异
4. 使用富有感染力的、电影化的语言
5. **必须使用中文输出**

输出格式：
{
  "branches": [
    {
      "id": "A",
      "title": "行动导向的标题（2-4个字）",
      "description": "对这条叙事路径的生动描述..."
    },
    {
      "id": "B",
      "title": "对话/外交标题",
      "description": "强调互动的描述..."
    },
    {
      "id": "C",
      "title": "转折/揭示标题",
      "description": "揭示意外元素的描述..."
    }
  ]
}`;

  const modeGuidance = {
    creative: '\n\n模式：创意型 - 优先考虑意外转折、隐喻性语言和情感共鸣。',
    logical: '\n\n模式：逻辑型 - 优先考虑因果链、现实结果和策略思维。',
    balanced: '\n\n模式：平衡型 - 混合创意与连贯性，平衡惊喜与可信度。',
  };

  return basePrompt + modeGuidance[mode];
}

/**
 * Get temperature based on logic mode
 */
function getTemperature(mode: 'creative' | 'logical' | 'balanced'): number {
  const temperatures = {
    creative: 0.9,
    logical: 0.5,
    balanced: 0.7,
  };
  return temperatures[mode];
}

/**
 * Parse branches from DeepSeek response
 */
function parseBranches(text: string): Branch[] {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*"branches"[\s\S]*\}/);
    
    if (jsonMatch) {
      const jsonText = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonText);
      
      if (parsed.branches && Array.isArray(parsed.branches)) {
        return parsed.branches.slice(0, 3); // Ensure max 3 branches
      }
    }
  } catch (e) {
    console.error('Failed to parse branches:', e);
  }

  // Fallback branches if parsing fails (中文版本)
  return [
    {
      id: 'A',
      title: '直接行动',
      description: '角色立即采取果断行动，正面迎接挑战，依靠勇气和直觉来应对眼前的危机。',
    },
    {
      id: 'B',
      title: '战略对话',
      description: '语言成为武器，角色在紧张的谈判中周旋，寻求盟友或争取时间。',
    },
    {
      id: 'C',
      title: '隐藏真相',
      description: '一个启示改变了一切——看似确定的事物崩塌，更深层的谜团浮现。',
    },
  ];
}

/**
 * Stream branches to client with typewriter effect
 */
async function streamBranchesToClient(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  branches: Branch[],
  logicMode: 'creative' | 'logical' | 'balanced'
) {
  for (let i = 0; i < branches.length; i++) {
    const branch = branches[i];

    // Send branch metadata
    const metadata = {
      type: 'branch_start',
      index: i,
      id: branch.id,
      title: branch.title,
    };
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`));
    await delay(100);

    // Stream description character by character
    const chars = branch.description.split('');
    for (let j = 0; j < chars.length; j++) {
      const chunk = {
        type: 'text_chunk',
        index: i,
        id: branch.id,
        text: chars[j],
        isComplete: j === chars.length - 1,
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));

      // Variable typing speed
      const typingDelay = logicMode === 'creative' ? 50 : logicMode === 'logical' ? 20 : 30;
      await delay(typingDelay);
    }

    // Send branch completion
    const completion = {
      type: 'branch_complete',
      index: i,
      id: branch.id,
    };
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(completion)}\n\n`));
    await delay(300);
  }
}

/**
 * Utility delay function
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
