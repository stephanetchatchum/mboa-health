import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SUMMARY_INSTRUCTION = `Based on our conversation above, generate a brief, structured handoff summary that the caregiver can send via WhatsApp to a real community health worker.

Format (use this exact structure, in the same language as the conversation):

Child, [age]
- [Duration]: [main symptom]
- [Other key symptoms, one per line]
- Assessment: [Triage level — explain in 1 short line]

Sent via MBOA Health · Not a diagnosis · WHO IMCI-based

Rules:
- DO NOT include the child's name, the caregiver's name, or any other personal identifier — we deliberately do not collect them. Just "Child" with age.
- Keep under 80 words total
- Use plain text only — no asterisks, no markdown
- Be clinical but warm
- If the caregiver mentioned anything important not in the structured fields, add it as a short note at the end
- If the caregiver shared a photo, mention briefly what was visible (e.g., "Photo showed a red rash on chest")
- Write in the same language as the conversation`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const textMessages = messages.map((m: any) => ({
    role: m.role,
    content: m.content || (m.image ? '[Caregiver sent a photo]' : ''),
  }));

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    messages: [
      ...textMessages,
      { role: 'user', content: SUMMARY_INSTRUCTION }
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return Response.json({ summary: text });
}