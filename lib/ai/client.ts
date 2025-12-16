/**
 * Unified AI Client
 * Routes AI requests to either Cloud (DeepSeek) or Local (Ollama)
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIConfig {
  provider: 'cloud' | 'local';
  ollamaUrl?: string;
  localModel?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: string };
}

export interface AIResponse {
  content: string;
}

/**
 * Generate AI response using configured provider
 */
export async function generateAI(
  messages: AIMessage[],
  config: AIConfig
): Promise<AIResponse> {
  if (config.provider === 'local') {
    return generateWithOllama(messages, config);
  } else {
    return generateWithCloud(messages, config);
  }
}

/**
 * Generate response using Ollama (Local)
 */
async function generateWithOllama(
  messages: AIMessage[],
  config: AIConfig
): Promise<AIResponse> {
  const ollamaUrl = config.ollamaUrl || 'http://127.0.0.1:11434';
  const model = config.localModel || 'llama3';

  try {
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          temperature: config.temperature || 0.7,
          num_predict: config.max_tokens || 2000,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      content: data.message?.content || '',
    };
  } catch (error) {
    console.error('Ollama generation failed:', error);
    throw new Error(
      `Failed to connect to Ollama at ${ollamaUrl}. Please ensure Ollama is running.`
    );
  }
}

/**
 * Generate response using DeepSeek (Cloud)
 */
async function generateWithCloud(
  messages: AIMessage[],
  config: AIConfig
): Promise<AIResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }

  try {
    const requestBody: any = {
      model: 'deepseek-chat',
      messages,
      temperature: config.temperature || 0.7,
      max_tokens: config.max_tokens || 2000,
    };

    // Add response_format if specified (for JSON mode)
    if (config.response_format) {
      requestBody.response_format = config.response_format;
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices?.[0]?.message?.content || '',
    };
  } catch (error) {
    console.error('DeepSeek generation failed:', error);
    throw new Error('Failed to generate response with DeepSeek');
  }
}
