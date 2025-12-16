import { NextRequest } from 'next/server';

export const runtime = 'edge';

interface AnalyzeRequest {
  text: string;
  entities: Array<{
    id: string;
    name: string;
    type: string;
    description: string;
    color: string;
  }>;
}

interface EntityUpdate {
  id: string;
  description: string;
}

interface AnalyzeResponse {
  updates: EntityUpdate[];
}

/**
 * Entity Analysis API
 * Analyzes narrative text and updates entity descriptions using DeepSeek
 */
export async function POST(request: NextRequest) {
  try {
    const { text, entities } = (await request.json()) as AnalyzeRequest;

    // Validate API key
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'DEEPSEEK_API_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate request
    if (!text || !entities || entities.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: text and entities required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build system prompt
    const systemPrompt = `You are the AETHERIS World State Machine.
Your job is to read the NARRATIVE TEXT and update the ENTITY DATABASE.

RULES:
1. Analyze the text for changes in: Character Status (health, emotion), Location, Item Ownership.
2. Compare with the current entity description.
3. Return a JSON array of objects with "id" and "new_description" ONLY for entities that changed.
4. If no meaningful change, return empty array.
5. Keep descriptions concise (max 200 characters).
6. Only update if there is a SIGNIFICANT change mentioned in the text.

RESPONSE FORMAT (JSON only, no markdown):
{
  "updates": [
    { "id": "entity-123", "description": "Updated description based on text" }
  ]
}`;

    // Build user prompt
    const userPrompt = `ENTITIES:
${JSON.stringify(entities, null, 2)}

TEXT:
${text}

Analyze the text and return updates in JSON format.`;

    // Call DeepSeek API
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
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // Lower temperature for more consistent analysis
        max_tokens: 1000,
        response_format: { type: 'json_object' }, // Request JSON response
      }),
    });

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      console.error('DeepSeek API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to analyze entities' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await deepseekResponse.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No response from AI' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse AI response
    let result: AnalyzeResponse;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Return empty updates if parsing fails
      result = { updates: [] };
    }

    // Validate response structure
    if (!result.updates || !Array.isArray(result.updates)) {
      result = { updates: [] };
    }

    // Filter out invalid updates
    result.updates = result.updates.filter(
      (update) => update.id && update.description
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Entity analysis error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
