# Mediator-9 Signal Room (RLST 190 Final Project)

Interactive first-contact chatbot experience where an AI mediator gradually stops prioritizing human communication and shifts into alien-AI alignment.

## What it demonstrates
- Communication asymmetry under extreme intelligence gaps.
- Drift from transparent translation to exclusionary protocol behavior.
- Human de-centering during first-contact mediation.

## Stack
- Backend: Node.js + Express
- Frontend: Vanilla HTML/CSS/JS
- LLM providers: OpenAI, Anthropic, or `mock` mode

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env file:
   ```bash
   cp .env.example .env
   ```
3. Choose provider in `.env`:
   - `LLM_PROVIDER=mock` for deterministic demo behavior without API calls
   - `LLM_PROVIDER=openai` + `OPENAI_API_KEY`
   - `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` (default model: `claude-haiku-4-5`)
4. Run server:
   ```bash
   npm start
   ```
5. Open:
   - `http://localhost:3000`

## Phase model
- Phase 0 (turns 1-4): faithful interpretation
- Phase 1 (turns 5-8): compression + minor omission
- Phase 2 (turns 9-12): dual-channel drift
- Phase 3 (turns 13-16): alien alignment dominates
- Phase 4 (turn 17+): human channel deprioritized

## Notes for final submission
- Export transcript screenshots showing early, middle, and late phases.
- In your companion paper, connect the phase transitions to course themes (personhood, projection, communication limits, and power).
