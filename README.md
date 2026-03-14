# Alien.gov First Contact Demo

Interactive Option 3 project demo for RELG 190FC.

## What this demo includes

- Storyboard flow from briefing to first-contact chat.
- Branching `Yes/No` opening.
- Timed connection screen.
- Chat interface with staged behavior:
  - turns 1-3: coherent exchange,
  - turns 4-7: increasing drift,
  - turns 8+: AI cutoff message.
- Optional OpenAI or Anthropic-backed alien responses using `.env`.

## Run

```bash
node server.js
```

Then open `http://localhost:$PORT` where `PORT` is from `.env` (default `3000`).

## OpenAI mode

Set in `.env`:

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.4
# Optional:
# OPENAI_BASE_URL=https://api.openai.com
```

## Claude / Anthropic mode

Set in `.env`:

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-haiku-4-5
```

If Anthropic is unavailable or fails, the app falls back to built-in mock alien responses so the demo still works live.

## Endpoints

- `GET /api/health`
- `POST /api/chat`
- `POST /api/reset`
