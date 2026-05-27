# MBOA Health

MBOA Health is a small Next.js app that helps caregivers assess illnesses in children under five. It provides two server endpoints used by the frontend to interact with Anthropic's Claude model: a streaming chat endpoint and a structured summary endpoint.

**Requirements**
- **Node.js** (16+ recommended)
- An Anthropic API key set in the environment as `ANTHROPIC_API_KEY`.

## Install & Run

Install and run the dev server:

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## API Endpoints

- **POST** `/api/chat` — chat streaming endpoint
	- Request body: `{"messages": [{"role": "user|assistant", "content": string, "image?:": string}]}`
	- Images: if a caregiver sends an image, include a data URL in `image` (e.g. `data:image/jpeg;base64,...`). The server splits the data URL at the first comma and submits the base64 payload alongside the text.
	- Response: a `text/plain` streaming response with the assistant's text (the route streams Anthropic `messages.stream`). See [app/api/chat/route.ts](app/api/chat/route.ts) for implementation.

- **POST** `/api/summary` — structured handoff summary
	- Request body: same `messages` array.
	- Response: JSON `{ "summary": "..." }` containing a short, IMCI-based handoff message suitable for sending to a community health worker. See [app/api/summary/route.ts](app/api/summary/route.ts).

## Example requests

Chat (streaming):

```bash
curl -N -X POST http://localhost:3000/api/chat \
	-H "Content-Type: application/json" \
	-d '{"messages":[{"role":"user","content":"My 2-year-old has a fever and a rash"}]}'
```

Summary (single response):

```bash
curl -X POST http://localhost:3000/api/summary \
	-H "Content-Type: application/json" \
	-d '{"messages":[{"role":"user","content":"My baby has had fever for two days"}]}'
```

## Important files
- [app/api/chat/route.ts](app/api/chat/route.ts) — streaming chat integration with Anthropic.
- [app/api/summary/route.ts](app/api/summary/route.ts) — summary generation integration.
- [app/lib/system-prompt.ts](app/lib/system-prompt.ts) — the assistant's system prompt (triage rules, language guidance, and privacy constraints).

## Environment
Set your Anthropic API key before running locally:

```bash
export ANTHROPIC_API_KEY=sk-...    # macOS / Linux
setx ANTHROPIC_API_KEY "sk-..."  # Windows (then restart shell)
```

## Notes
- The service intentionally does not collect names or other identifiers — only the child's age is requested when needed.
- The chat route handles images by accepting base64 data URLs and submitting them to Anthropic alongside the text.

If you'd like, I can also add a short example frontend curl script or a Postman collection for testing.
