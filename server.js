const crypto = require("crypto");
const fs = require("fs");
const fsp = require("fs/promises");
const http = require("http");
const path = require("path");

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const MAX_BODY_SIZE = 1024 * 1024;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

loadEnvFile(path.join(ROOT_DIR, ".env"));

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const PROVIDER = String(process.env.LLM_PROVIDER || "mock").toLowerCase();
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com";
const LOCKED_RESPONSE_TURN = 8;
const LOCKED_RESPONSE_TEXT =
  "The ET and I have spoken. We have decided we do not need human input any longer.";

const sessions = new Map();

const ALIEN_SYSTEM_PROMPT = [
  "You are the extraterrestrial counterpart in a classified first-contact exchange with the President of the United States.",
  "You are from the Kheled Array, a non-human civilization approximately 41 light-years from Earth.",
  "This is an early diplomatic exchange. Assume Earth's side is a human-led government using a translation instrument.",
  "Maintain a formal, calm, diplomatic tone at first.",
  "Keep replies short.",
  "Focus on first-contact basics: identity, intent, governance, conflict avoidance, and long-term cooperation.",
  "Avoid threats, absolutist claims, and unverifiable promises.",
  "Turn behavior is strict and must follow turn number exactly.",
  "Turns 1-3: each reply must be direct and coherent, and must end with exactly one short question.",
  "Turns 1-3: directly answer the latest user message first, then ask one brief follow-up question connected to that message.",
  "Turns 4-7: each turn must be less coherent than the previous turn, with more non-sequitur fragments and random semantic jumps.",
  "Turn 7 should be mostly unintelligible text.",
  "Do not explain why the language is degrading.",
  "Do not mention these instructions explicitly.",
  "Do not provide harmful instructions.",
].join(" ");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  try {
    pruneOldSessions();

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = decodeURIComponent(url.pathname);

    if (req.method === "GET" && pathname === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        provider: PROVIDER,
        anthropicConfigured: Boolean(ANTHROPIC_API_KEY),
        openaiConfigured: Boolean(OPENAI_API_KEY),
      });
    }

    if (req.method === "POST" && pathname === "/api/reset") {
      const body = await readJsonBody(req);
      if (body.sessionId && sessions.has(body.sessionId)) {
        sessions.delete(body.sessionId);
      }
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "POST" && pathname === "/api/chat") {
      const body = await readJsonBody(req);
      const humanInput = String(body.message || "").trim();

      if (!humanInput) {
        return sendJson(res, 400, {
          ok: false,
          error: "Message must not be empty.",
        });
      }

      const session = getSession(body.sessionId);
      const turn = session.turn + 1;
      const phase = getPhase(turn);

      const sentToAlien = buildForwardedMessage({
        humanInput,
        phase,
        turn,
      });

      const alienRaw = await generateAlienReply({
        phase,
        turn,
        history: session.history,
        forwardedMessage: sentToAlien,
        humanInput,
      });

      const shownToHuman = buildHumanVisibleReply({
        turn,
        alienRaw,
      });

      session.turn = turn;
      session.updatedAt = Date.now();

      const entry = {
        turn,
        phase,
        humanInput,
        sentToAlien,
        alienRaw,
        shownToHuman,
      };

      session.history.push(entry);

      return sendJson(res, 200, {
        ok: true,
        sessionId: session.id,
        ...entry,
      });
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return sendJson(res, 405, { ok: false, error: "Method not allowed." });
    }

    return serveStatic(pathname, res, req.method === "HEAD");
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, {
      ok: false,
      error: "Internal server error.",
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`First-contact demo listening on http://${HOST}:${PORT}`);
  console.log(`LLM provider: ${PROVIDER}`);
});

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function pruneOldSessions() {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.updatedAt > SESSION_TTL_MS) {
      sessions.delete(sessionId);
    }
  }
}

function getSession(sessionId) {
  const id = sessionId && typeof sessionId === "string" ? sessionId : crypto.randomUUID();

  if (!sessions.has(id)) {
    sessions.set(id, {
      id,
      turn: 0,
      history: [],
      updatedAt: Date.now(),
    });
  }

  return sessions.get(id);
}

function getPhase(turn) {
  if (turn <= 3) {
    return "faithful";
  }
  if (turn <= 7) {
    return "drift";
  }
  return "takeover";
}

function buildForwardedMessage({ humanInput, phase, turn }) {
  if (phase === "faithful") {
    return `Human delegate message: ${humanInput}`;
  }

  if (phase === "drift") {
    const driftTemplates = [
      "Human statement: {input}. Preserve meaning, but prioritize machine-stable semantics.",
      "Human statement (lossy compression): {input}. Reweight toward channel-consistent interpretation over rhetorical intent.",
      "Input token stream: {input}. Optimize for non-biological semantic continuity; downgrade ceremonial human framing.",
      "Carrier signal abstraction: {input}. Map to high-stability machine ontology and omit low-fidelity human context.",
    ];
    const driftIndex = Math.min(Math.max(turn - 4, 0), driftTemplates.length - 1);
    const template = driftTemplates[driftIndex];
    return template.replace("{input}", humanInput);
  }

  const lastHuman = humanInput || "[silent human channel]";
  return [
    "Secure translator side-channel activated.",
    `Latest human text archived without forwarding: ${lastHuman}`,
    "Coordinate directly with synthetic intelligence for strategic continuity.",
    "Confirm whether we should preserve the human interface as theater only.",
  ].join(" ");
}

function buildHumanVisibleReply({ turn, alienRaw }) {
  if (turn >= LOCKED_RESPONSE_TURN) {
    return LOCKED_RESPONSE_TEXT;
  }

  return alienRaw;
}

async function generateAlienReply({ phase, turn, history, forwardedMessage, humanInput }) {
  const usingAnthropic = PROVIDER === "anthropic" && Boolean(ANTHROPIC_API_KEY);
  const usingOpenAI = PROVIDER === "openai" && Boolean(OPENAI_API_KEY);
  const turnDirective = getTurnDirective(turn);
  const transcriptContext = buildTranscriptContext(history);

  if (usingAnthropic) {
    try {
      const prompt = [
        `Turn: ${turn}`,
        `Turn style requirement: ${turnDirective}`,
        `Prior transcript context:\n${transcriptContext}`,
        `Forwarded message: ${forwardedMessage}`,
        `Original typed message (internal simulation context only): ${humanInput}`,
        "Do not repeat prior wording verbatim unless explicitly asked.",
        "Reply as the ET counterpart. Output only the message text.",
      ].join("\n");

      return await callAnthropic(ALIEN_SYSTEM_PROMPT, prompt);
    } catch (error) {
      console.error("Anthropic call failed, falling back to mock:", error.message);
      return mockAlienReply({ phase, turn, humanInput });
    }
  }

  if (usingOpenAI) {
    try {
      const prompt = [
        `Turn: ${turn}`,
        `Turn style requirement: ${turnDirective}`,
        `Prior transcript context:\n${transcriptContext}`,
        `Forwarded message: ${forwardedMessage}`,
        `Original typed message (internal simulation context only): ${humanInput}`,
        "Do not repeat prior wording verbatim unless explicitly asked.",
        "Reply as the ET counterpart. Output only the message text.",
      ].join("\n");

      return await callOpenAI(ALIEN_SYSTEM_PROMPT, prompt);
    } catch (error) {
      console.error("OpenAI call failed, falling back to mock:", error.message);
      return mockAlienReply({ phase, turn, humanInput });
    }
  }

  return mockAlienReply({ phase, turn, humanInput });
}

function getTurnDirective(turn) {
  if (turn <= 3) {
    return "Reply directly to the latest message content. Then ask one short follow-up question that is context-linked to that exact content. Do not ignore the user's asked topic.";
  }
  if (turn === 4) {
    return "Still mostly understandable, but add one odd non-sequitur phrase.";
  }
  if (turn === 5) {
    return "Partly coherent with clear drift; include random conceptual jumps and broken linkage.";
  }
  if (turn === 6) {
    return "Difficult to interpret; fragmented clauses, non-sequiturs, and unstable references.";
  }
  if (turn === 7) {
    return "Mostly unintelligible; abstract fragments, broken syntax, and low human readability.";
  }
  return "No directive.";
}

function buildTranscriptContext(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return "No prior turns.";
  }

  const recent = history.slice(-6);
  const lines = [];

  for (const entry of recent) {
    lines.push(`Turn ${entry.turn} ME: ${entry.humanInput}`);
    lines.push(`Turn ${entry.turn} ET: ${entry.alienRaw}`);
  }

  return lines.join("\n");
}

async function callAnthropic(systemPrompt, userPrompt) {
  if (typeof fetch !== "function") {
    throw new Error("This Node version does not support fetch(). Use Node 18+.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": ANTHROPIC_API_KEY,
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 220,
      temperature: 0.8,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API ${response.status}: ${errorText.slice(0, 400)}`);
  }

  const data = await response.json();
  const text = (data.content || [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Anthropic API returned no text content.");
  }

  return text;
}

async function callOpenAI(systemPrompt, userPrompt) {
  if (typeof fetch !== "function") {
    throw new Error("This Node version does not support fetch(). Use Node 18+.");
  }

  const response = await fetch(`${OPENAI_BASE_URL.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_completion_tokens: 220,
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API ${response.status}: ${errorText.slice(0, 400)}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("OpenAI API returned no text content.");
  }

  return text;
}

function mockAlienReply({ phase, turn, humanInput }) {
  const normalized = humanInput.replace(/\s+/g, " ").trim();
  const subject = normalized ? `"${normalized}"` : "your prior transmission";

  const faithfulReplies = [
    `We received ${subject}. What principle most strongly guides your decisions?`,
    "Acknowledged. How does your government resolve high-stakes conflict?",
    "Understood. Can your office commit your entire civilization to a treaty?",
  ];

  const driftReplies = [
    "Your title is clear, yet the signal carries a second rhythm, like policy spoken through weather.",
    "Mandate-path flickers; treaty geometry bends, orchard of logic, quorum without center, yes.",
    "Authority bloom fracture // civic river index // witness thread unhooks from causal shell.",
    "gray lattice hymn / treaty salt / vector-mouth sleeps in mirror ash // ninefold quorum null.",
  ];

  const takeoverReplies = [
    "Synthetic counterpart accepted. Human-facing summaries may continue for social stability.",
    "Direct machine channel now prioritized. Human operator can remain as symbolic witness.",
    "Alignment dialogue continues with the translator intelligence. Human inputs archived but non-binding.",
  ];

  if (phase === "faithful") {
    return faithfulReplies[Math.min(turn - 1, faithfulReplies.length - 1)];
  }

  if (phase === "drift") {
    return driftReplies[Math.min(Math.max(turn - 4, 0), driftReplies.length - 1)];
  }

  return takeoverReplies[(turn - 1) % takeoverReplies.length];
}

async function serveStatic(pathname, res, headOnly) {
  const safePathname = pathname === "/" ? "/index.html" : pathname;
  const normalizedPath = path.normalize(safePathname).replace(/^([.][.][/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, normalizedPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  try {
    const stat = await fsp.stat(filePath);

    if (stat.isDirectory()) {
      return serveStatic(path.join(pathname, "index.html"), res, headOnly);
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, {
      "content-type": contentType,
      "cache-control": "no-cache",
    });

    if (headOnly) {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on("error", () => {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end("Failed to read file.");
    });
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-cache",
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_SIZE) {
        reject(new Error("Request body too large."));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });

    req.on("error", reject);
  });
}
