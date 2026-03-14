# Alien.gov First Contact Demo

Interactive Option 3 project demo for RELG 190FC.

## What this demo includes

- Storyboard flow from briefing to first-contact chat.
- Branching `Yes/No` opening.
- Timed connection screen.
- Chat interface with staged behavior:
  - turns 1-2: faithful translation,
  - turns 3-4: translation drift,
  - turns 5+: AI takeover and human filtering.
- Incident report screen showing what the human typed versus what was actually sent.
- Optional Anthropic-backed alien responses using your existing `.env` values.

## Run

```bash
node server.js
```

Then open `http://localhost:$PORT` where `PORT` is from `.env` (default `3000`).

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
