/**
 * AETHERIS AI Client
 * Handles streaming plot generation with real-time updates
 */

export interface PlotBranch {
  id: string;
  title: string;
  description: string;
  isStreaming?: boolean;
}

export interface SimulationOptions {
  prompt: string;
  logicMode: 'creative' | 'logical' | 'balanced';
  context?: string;
  provider?: 'cloud' | 'local';
  ollamaUrl?: string;
  localModel?: string;
  onBranchStart?: (branch: { id: string; title: string; index: number }) => void;
  onTextChunk?: (data: { id: string; text: string; index: number }) => void;
  onBranchComplete?: (data: { id: string; index: number }) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Generate plot branches with streaming support
 */
export async function generatePlotBranches(options: SimulationOptions): Promise<void> {
  const { prompt, logicMode, context, provider, ollamaUrl, localModel, onBranchStart, onTextChunk, onBranchComplete, onComplete, onError } = options;

  try {
    const response = await fetch('/api/simulate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        prompt, 
        logicMode, 
        context,
        provider,
        ollamaUrl,
        localModel,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
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

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete messages
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || ''; // Keep incomplete message in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6)); // Remove 'data: ' prefix

            switch (data.type) {
              case 'branch_start':
                onBranchStart?.({
                  id: data.id,
                  title: data.title,
                  index: data.index,
                });
                break;

              case 'text_chunk':
                onTextChunk?.({
                  id: data.id,
                  text: data.text,
                  index: data.index,
                });
                break;

              case 'branch_complete':
                onBranchComplete?.({
                  id: data.id,
                  index: data.index,
                });
                break;

              case 'done':
                onComplete?.();
                break;
            }
          } catch (parseError) {
            console.error('Failed to parse SSE data:', parseError);
          }
        }
      }
    }
  } catch (error) {
    onError?.(error as Error);
  }
}

/**
 * Cancel ongoing simulation (for future use)
 */
export function cancelSimulation(): void {
  // Placeholder for AbortController implementation
  console.log('Simulation cancelled');
}
