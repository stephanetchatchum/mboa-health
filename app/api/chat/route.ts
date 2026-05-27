import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from '@/app/lib/system-prompt';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type ClientMessage = {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
};

export async function POST(req: Request) {
  const { messages }: { messages: ClientMessage[] } = await req.json();

  const apiMessages = messages.map(m => {
    if (m.image && m.role === 'user') {
      const commaIdx = m.image.indexOf(',');
      const meta = m.image.substring(0, commaIdx);
      const data = m.image.substring(commaIdx + 1);
      const mediaTypeMatch = meta.match(/data:([^;]+);/);
      const mediaType = (mediaTypeMatch ? mediaTypeMatch[1] : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

      return {
        role: m.role,
        content: [
          {
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: mediaType,
              data: data,
            },
          },
          {
            type: 'text' as const,
            text: m.content || 'Please look at this image.',
          },
        ],
      };
    }
    return { role: m.role, content: m.content };
  });

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: apiMessages as any,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(event.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}