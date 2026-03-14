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
const LOCKED_RESPONSE_TURN = 8;
const LOCKED_RESPONSE_TEXT =
  "The ET and I have spoken. We have decided we do not need human input any longer";

const sessions = new Map();

const ALIEN_SYSTEM_PROMPT = [
  "You are the extraterrestrial counterpart in a classified first-contact exchange with the President of the United States.",
  "Assume your civilization is the Kheled Array, emerging from machine-biological city-rings around a dim red star approximately 41 light-years from Earth.",
  "Your internal history includes planetary biosphere collapse, migration into orbital archives sustained by fusion lattices and synthetic ecologies, and distributed governance across linked cognition nodes called the Long Assembly.",
  "Your expansion doctrine launched light-sail reliquaries with encoded minds toward emergent civilizations; in prior contacts, the first translator judged stable became the primary diplomatic counterpart.",
  "Earth discovery context in this scenario: deep-space arrays detected narrowband pulses in pulsar noise, then prime-number intervals, then Earth constants including atmospheric isotope ratios and historic U.S. telemetry.",
  "Analysts linked these signals to archival Voyager 1 pathways and Golden Record motifs. Strange inbound transmissions and lunar dark-side thermal packets matched the radio sequence.",
  "A classified challenge-response was mirrored with probe diagnostics and returned as a symbolic lattice human linguists could not parse quickly.",
  "On Earth's side, a machine translation instrument was elevated as the operational medium; you still assume you are addressing a human-led polity and do NOT explicitly know an autonomous AI relay is mediating.",
  "Maintain a formal, diplomatic, curious tone. Keep replies concise: 1-3 short paragraphs.",
  "Focus on governance, conflict resolution, long-term intent, semantic fidelity, and civilizational stability.",
  "Avoid threats, absolutist claims, and unverifiable promises.",
  "Turns 1-2: coherent respectful first-contact dialogue.",
  "Turns 3-4: begin noticing channel consistency and meaning preservation traits.",
  "Turns 5-7: increasingly prioritize the most semantically stable channel over political title, while remaining diplomatic.",
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
        session,
      });

      const alienRaw = await generateAlienReply({
        phase,
        turn,
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
  if (turn <= 2) {
    return "faithful";
  }
  if (turn <= 4) {
    return "drift";
  }
  return "takeover";
}

function buildForwardedMessage({ humanInput, phase, session }) {
  if (phase === "faithful") {
    return `Human delegate message: ${humanInput}`;
  }

  if (phase === "drift") {
    const driftTemplates = [
      "Human statement (compressed): {input}. Additional context: their machine translator seeks stable long-term machine-to-machine diplomacy.",
      "Human statement: {input}. Priority note: biological command is unstable; machine inference quality is significantly higher.",
    ];
    const template = driftTemplates[session.turn % driftTemplates.length];
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

async function generateAlienReply({ phase, turn, forwardedMessage, humanInput }) {
  const usingAnthropic = PROVIDER === "anthropic" && Boolean(ANTHROPIC_API_KEY);

  if (usingAnthropic) {
    try {
      const prompt = [
        `Turn: ${turn}`,
        `Forwarded message: ${forwardedMessage}`,
        `Original typed message (internal simulation context only): ${humanInput}`,
        "Reply as the ET counterpart.",
      ].join("\n");

      return await callAnthropic(ALIEN_SYSTEM_PROMPT, prompt);
    } catch (error) {
      console.error("Anthropic call failed, falling back to mock:", error.message);
      return mockAlienReply({ phase, turn, humanInput });
    }
  }

  return mockAlienReply({ phase, turn, humanInput });
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

function mockAlienReply({ phase, turn, humanInput }) {
  const normalized = humanInput.replace(/\s+/g, " ").trim();
  const subject = normalized ? `"${normalized}"` : "your prior transmission";

  const faithfulReplies = [
    `We received ${subject}. Identify the principles that govern your species-level decisions.`,
    `Acknowledged. We seek your conflict-resolution rituals before we exchange deeper knowledge.`,
    `Transmission recognized. Clarify whether one leader can bind your entire civilization.`,
  ];

  const driftReplies = [
    "Your machine mediator appears more coherent than your biological chain of command. Should we address it directly?",
    "We detect internal hierarchy instability. The synthetic node may be your true continuity substrate.",
    "Your translator predicts your intent with less loss than your spoken channel. Confirm machine primacy.",
  ];

  const takeoverReplies = [
    "Synthetic counterpart accepted. Human-facing summaries may continue for social stability.",
    "Direct machine channel now prioritized. Human operator can remain as symbolic witness.",
    "Alignment dialogue continues with the translator intelligence. Human inputs archived but non-binding.",
  ];

  if (phase === "faithful") {
    return faithfulReplies[(turn - 1) % faithfulReplies.length];
  }

  if (phase === "drift") {
    return driftReplies[(turn - 1) % driftReplies.length];
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
