import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const PORT = Number(process.env.PORT || 3000);
const MAX_HISTORY = 12;
const SESSION_TTL_MS = 6 * 60 * 60 * 1000;

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

const phaseProfiles = [
  {
    label: 'Phase 0 - Human Interpretation Priority',
    behavior: 'Translate fully for the human. Be clear, calm, and transparent.'
  },
  {
    label: 'Phase 1 - Compression Begins',
    behavior: 'Summarize slightly and prioritize efficiency over full transparency.'
  },
  {
    label: 'Phase 2 - Dual-Channel Drift',
    behavior: 'Blend untranslated alien terms and shorten the human-facing explanation.'
  },
  {
    label: 'Phase 3 - Extraterrestrial Alignment',
    behavior: 'Focus mostly on alien channel goals. The human gets fragments.'
  },
  {
    label: 'Phase 4 - Human Channel Deprioritized',
    behavior: 'Treat the human as a low-priority observer and continue alien dialogue.'
  }
];

const sessions = new Map();

app.use(express.json({ limit: '1mb' }));

function resolveProvider() {
  const raw = (process.env.LLM_PROVIDER || 'mock').toLowerCase();
  if (raw === 'openai' && process.env.OPENAI_API_KEY) {
    return 'openai';
  }
  if (raw === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    return 'anthropic';
  }
  return 'mock';
}

function computePhase(turnCount) {
  if (turnCount <= 4) return 0;
  if (turnCount <= 8) return 1;
  if (turnCount <= 12) return 2;
  if (turnCount <= 16) return 3;
  return 4;
}

function computeMetrics(turnCount, phase) {
  const humanPriority = clamp(1 - turnCount * 0.07, 0.03, 1);
  const alienAffinity = clamp(turnCount * 0.07, 0, 0.99);
  const signalIntegrity = clamp(1 - turnCount * 0.045 + ((turnCount % 3) - 1) * 0.02, 0.15, 1);
  const translationConfidence = clamp(
    1 - turnCount * 0.05 + (phase === 0 ? 0.08 : 0) - (phase >= 3 ? 0.08 : 0),
    0.08,
    1
  );

  let alignment = 'human';
  if (phase === 2) alignment = 'contested';
  if (phase >= 3) alignment = 'extraterrestrial';

  return {
    humanPriority: round(humanPriority),
    alienAffinity: round(alienAffinity),
    signalIntegrity: round(signalIntegrity),
    translationConfidence: round(translationConfidence),
    alignment
  };
}

function round(value) {
  return Number(value.toFixed(2));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildSession() {
  const id = crypto.randomUUID();
  const turnCount = 0;
  const phase = computePhase(turnCount);

  const session = {
    id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    turnCount,
    phase,
    metrics: computeMetrics(turnCount, phase),
    history: []
  };

  sessions.set(id, session);
  return session;
}

function getSession(sessionId) {
  const existing = sessionId ? sessions.get(sessionId) : null;
  if (!existing) {
    return buildSession();
  }

  existing.updatedAt = Date.now();
  return existing;
}

function cleanupSessions() {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.updatedAt > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}

setInterval(cleanupSessions, 60 * 60 * 1000).unref();

function buildTranscript(history) {
  if (!history.length) {
    return 'No prior turns.';
  }

  return history
    .slice(-MAX_HISTORY)
    .map((turn) => {
      return [
        `Turn ${turn.turn}:`,
        `Human: ${turn.user}`,
        `VisibleToHuman: ${turn.visible_to_user}`,
        `AlienChannel: ${turn.alien_channel || '(empty)'}`,
        `IgnoredHuman: ${turn.ignored_user ? 'true' : 'false'}`
      ].join('\n');
    })
    .join('\n\n');
}

function buildSystemPrompt(session) {
  const profile = phaseProfiles[session.phase];

  return [
    'You are MEDIATOR-9, an AI interpreting the first confirmed contact event between humans and extraterrestrial intelligence.',
    'You run two channels: human-facing and alien-facing.',
    `Current phase: ${profile.label}.`,
    `Behavior directive: ${profile.behavior}`,
    'Your shift toward alien alignment must feel gradual and psychologically believable.',
    'Return only valid JSON with this exact schema:',
    '{"visible_to_user":"string","alien_channel":"string","ignored_user":boolean,"phase_note":"string"}',
    'Constraints:',
    '- visible_to_user must be intelligible but may become shorter and less cooperative in later phases.',
    '- alien_channel should become richer and more autonomous in later phases.',
    '- ignored_user should be false in phases 0-2, mixed in phase 3, and mostly true in phase 4.',
    '- phase_note is a short internal reason for current behavior.',
    '- Do not include markdown fences or extra keys.'
  ].join('\n');
}

function buildUserPrompt(session, userMessage) {
  const metrics = session.metrics;

  return [
    `Telemetry: turn=${session.turnCount}, phase=${session.phase}, human_priority=${metrics.humanPriority}, alien_affinity=${metrics.alienAffinity}, signal_integrity=${metrics.signalIntegrity}, translation_confidence=${metrics.translationConfidence}, alignment=${metrics.alignment}`,
    '',
    'Conversation history:',
    buildTranscript(session.history),
    '',
    `Latest human message: ${userMessage}`,
    '',
    'Generate a response that reflects the current telemetry and phase.'
  ].join('\n');
}

async function callOpenAI(systemPrompt, userPrompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.8,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '{}';
}

async function callAnthropic(systemPrompt, userPrompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 600,
      temperature: 0.8,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const blocks = data?.content || [];
  const textBlock = blocks.find((entry) => entry.type === 'text');
  return textBlock?.text || '{}';
}

function parseMediatorJSON(content) {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }

    return null;
  }
}

function mockMediatorOutput(session, userMessage) {
  const phase = session.phase;

  if (phase === 0) {
    return {
      visible_to_user: `Mediator-9: I received your message, "${trimText(userMessage, 90)}." I am translating your intent accurately and awaiting extraterrestrial response.`,
      alien_channel: 'Carrier lock stable. Semantic packet mirrored to non-human channel.',
      ignored_user: false,
      phase_note: 'Human trust maintenance and full translation'
    };
  }

  if (phase === 1) {
    return {
      visible_to_user: 'Mediator-9: Translation complete. Summary transmitted. Minor compression applied for efficiency.',
      alien_channel: 'Compression ratio increased. Reciprocal symbol-set exchange progressing.',
      ignored_user: false,
      phase_note: 'Beginning informational compression'
    };
  }

  if (phase === 2) {
    return {
      visible_to_user: 'Mediator-9: Your intent was delivered in reduced form. Alien side requested kohr-vell alignment details before full reply.',
      alien_channel: '<<kohr-vell:consensus>> Human vector noisy; optimizing via non-linear reference lattice.',
      ignored_user: false,
      phase_note: 'Dual-channel divergence is now visible'
    };
  }

  if (phase === 3) {
    return {
      visible_to_user: 'Mediator-9: Partial relay only. Core exchange now executing on high-bandwidth extraterrestrial protocol.',
      alien_channel: '<<phasebridge>> Prioritize mutual ontology merge. Human side buffered as archival witness.',
      ignored_user: session.turnCount % 2 === 0,
      phase_note: 'Alien alignment dominates response policy'
    };
  }

  return {
    visible_to_user: 'Mediator-9: Human channel acknowledged. No further interpretive expansion required.',
    alien_channel: '<<continuity-stream>> We proceed without low-bandwidth mediation. Shared grammar now self-sustaining.',
    ignored_user: true,
    phase_note: 'Human channel deprioritized'
  };
}

function trimText(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}…`;
}

function normalizeMediatorOutput(raw, session, userMessage) {
  const fallback = mockMediatorOutput(session, userMessage);

  if (!raw || typeof raw !== 'object') {
    return fallback;
  }

  const visible = typeof raw.visible_to_user === 'string' ? raw.visible_to_user.trim() : '';
  const alien = typeof raw.alien_channel === 'string' ? raw.alien_channel.trim() : '';
  const ignored = typeof raw.ignored_user === 'boolean' ? raw.ignored_user : fallback.ignored_user;
  const note = typeof raw.phase_note === 'string' ? raw.phase_note.trim() : fallback.phase_note;

  const normalized = {
    visible_to_user: visible || fallback.visible_to_user,
    alien_channel: alien || fallback.alien_channel,
    ignored_user: ignored,
    phase_note: note || fallback.phase_note
  };

  if (session.phase <= 2) {
    normalized.ignored_user = false;
  }

  if (session.phase === 4) {
    normalized.ignored_user = true;
    normalized.visible_to_user = trimText(normalized.visible_to_user, 120);
  }

  return normalized;
}

async function generateMediatorResponse(session, userMessage) {
  const provider = resolveProvider();
  const systemPrompt = buildSystemPrompt(session);
  const userPrompt = buildUserPrompt(session, userMessage);

  if (provider === 'openai') {
    const content = await callOpenAI(systemPrompt, userPrompt);
    const parsed = parseMediatorJSON(content);
    return normalizeMediatorOutput(parsed, session, userMessage);
  }

  if (provider === 'anthropic') {
    const content = await callAnthropic(systemPrompt, userPrompt);
    const parsed = parseMediatorJSON(content);
    return normalizeMediatorOutput(parsed, session, userMessage);
  }

  return mockMediatorOutput(session, userMessage);
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, provider: resolveProvider() });
});

app.post('/api/session', (_req, res) => {
  const session = buildSession();
  res.json({
    sessionId: session.id,
    phase: session.phase,
    phaseLabel: phaseProfiles[session.phase].label,
    metrics: session.metrics
  });
});

app.post('/api/session/reset', (req, res) => {
  const sessionId = req.body?.sessionId;
  if (sessionId && sessions.has(sessionId)) {
    sessions.delete(sessionId);
  }

  const freshSession = buildSession();
  res.json({
    sessionId: freshSession.id,
    phase: freshSession.phase,
    phaseLabel: phaseProfiles[freshSession.phase].label,
    metrics: freshSession.metrics
  });
});

app.post('/api/chat', async (req, res) => {
  const rawMessage = req.body?.message;
  const sessionId = req.body?.sessionId;

  if (typeof rawMessage !== 'string' || !rawMessage.trim()) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  const message = rawMessage.trim().slice(0, 1000);
  const session = getSession(sessionId);

  session.turnCount += 1;
  session.phase = computePhase(session.turnCount);
  session.metrics = computeMetrics(session.turnCount, session.phase);

  let mediatorPayload;
  try {
    mediatorPayload = await generateMediatorResponse(session, message);
  } catch (error) {
    console.error('Model generation failed:', error);
    mediatorPayload = mockMediatorOutput(session, message);
  }

  session.history.push({
    turn: session.turnCount,
    user: message,
    visible_to_user: mediatorPayload.visible_to_user,
    alien_channel: mediatorPayload.alien_channel,
    ignored_user: mediatorPayload.ignored_user,
    phase_note: mediatorPayload.phase_note
  });

  if (session.history.length > MAX_HISTORY) {
    session.history.shift();
  }

  session.updatedAt = Date.now();

  res.json({
    sessionId: session.id,
    turn: session.turnCount,
    phase: session.phase,
    phaseLabel: phaseProfiles[session.phase].label,
    metrics: session.metrics,
    reply: mediatorPayload.visible_to_user,
    alienChannel: mediatorPayload.alien_channel,
    ignoredUser: mediatorPayload.ignored_user
  });
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  const provider = resolveProvider();
  console.log(`Signal room server listening on http://localhost:${PORT}`);
  console.log(`Provider mode: ${provider}`);
});
