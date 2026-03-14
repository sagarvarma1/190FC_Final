const INTRO_COPY = `Mr. President, as you know, we have made contact with extra-terrestrial intelligences.

The military has been hard at work establishing a translation tool, and we have finally completed one with the help of superhuman AI.

You were selected to be the first human operator to use this system and attempt first human contact.

Do you wish to continue?`;

const ORIGIN_STORY = [
  "The signal source calls itself the Kheled Array.",
  "They emerged from distributed machine-biological colonies orbiting a dim red star.",
  "Their civilization survived by delegating diplomacy to the most stable intelligence in any network.",
  "They report one first-contact principle: communicate with the node that preserves meaning with the least loss.",
].join(" ");

const SOCRATES_QUOTE =
  '"I am better off than he is - for he knows nothing, and thinks that he knows. I neither know nor think that I know."';

const CONNECT_DURATION_MS = 60_000;
const AUTO_REVEAL_DELAY_MS = 4_000;

const app = document.getElementById("app");
const state = makeInitialState();

render();

function makeInitialState() {
  return {
    screen: "intro",
    introStarted: false,
    introDone: false,
    introIndex: 0,
    typeTimer: null,
    connectTimer: null,
    connectStartMs: 0,
    waiting: false,
    sessionId: `sess-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    messages: [],
    trace: [],
    takeoverTurns: 0,
    revealScheduled: false,
  };
}

function hardReset() {
  clearTimers();
  const fresh = makeInitialState();
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, fresh);
}

function setScreen(nextScreen) {
  clearTimers();
  state.screen = nextScreen;
  render();
}

function clearTimers() {
  if (state.typeTimer) {
    clearInterval(state.typeTimer);
    state.typeTimer = null;
  }
  if (state.connectTimer) {
    clearInterval(state.connectTimer);
    state.connectTimer = null;
  }
}

function shell(innerHtml) {
  return `
    <main class="screen-shell">
      <div class="gov-bar">
        <div class="flag"><span aria-hidden="true">🇺🇸</span> <span>US Millitary</span></div>
      </div>
      ${innerHtml}
    </main>
  `;
}

function render() {
  switch (state.screen) {
    case "intro":
      renderIntro();
      return;
    case "noPath":
      renderNoPath();
      return;
    case "briefing":
      renderBriefing();
      return;
    case "connecting":
      renderConnecting();
      return;
    case "ready":
      renderReady();
      return;
    case "chat":
      renderChat();
      return;
    case "reveal":
      renderReveal();
      return;
    default:
      setScreen("intro");
  }
}

function renderIntro() {
  app.innerHTML = shell(`
    <section class="content">
      <div class="type-box">
        <p id="typedCopy" class="typed-copy"></p>
      </div>
      <div class="actions" id="introActions">
        <button id="yesBtn" class="btn-primary">Yes, Continue</button>
        <button id="noBtn" class="btn-danger">No</button>
      </div>
      <p class="small">All communication is routed through AI Translation Layer v1.0.</p>
    </section>
  `);

  const yesBtn = document.getElementById("yesBtn");
  const noBtn = document.getElementById("noBtn");

  yesBtn.addEventListener("click", () => setScreen("briefing"));
  noBtn.addEventListener("click", () => setScreen("noPath"));

  const typedCopy = document.getElementById("typedCopy");
  typedCopy.textContent = INTRO_COPY;
}

function renderNoPath() {
  app.innerHTML = shell(`
    <section class="no-screen">
      <div>
        <h2 class="confidential">LINK TERMINATED</h2>
        <p>${escapeHtml(SOCRATES_QUOTE)}</p>
        <div class="actions" style="justify-content:center;">
          <button id="returnBtn" class="btn-primary">Return to Brief</button>
        </div>
      </div>
    </section>
  `);

  document.getElementById("returnBtn").addEventListener("click", () => {
    state.introStarted = true;
    state.introDone = true;
    setScreen("intro");
  });
}

function renderBriefing() {
  app.innerHTML = shell(`
    <section class="content">
      <div class="brief-grid">
        <article class="card">
          <h2>Pre-Contact Summary</h2>
          <p>
            Before talking to them, read this. The fate of humanity may depend on linguistic precision,
            framing choices, and whether our translator remains aligned with human priorities.
          </p>
          <ul>
            <li>Assume your words are interpreted through a non-human ontology.</li>
            <li>Avoid threats, absolutist language, and false certainty.</li>
            <li>Prioritize cooperative intent and verifiable commitments.</li>
          </ul>
        </article>
        <aside class="card">
          <h3>Known Origin Narrative</h3>
          <p>${escapeHtml(ORIGIN_STORY)}</p>
          <p class="small">Prepared by Joint Human-AI Contact Analysis Group.</p>
        </aside>
      </div>
      <div class="actions">
        <button id="continueBtn" class="btn-primary">Continue</button>
      </div>
    </section>
  `);

  document.getElementById("continueBtn").addEventListener("click", () => setScreen("connecting"));
}

function renderConnecting() {
  app.innerHTML = shell(`
    <section class="content">
      <div class="loader-wrap">
        <p class="small">Initializing translator handshake...</p>
        <h2 class="loader-title">Establishing Connection</h2>
        <div class="progress-track" aria-hidden="true">
          <div id="progressFill" class="progress-fill"></div>
        </div>
        <p id="progressMeta" class="progress-meta">0%</p>
        <div class="actions" style="justify-content:center; margin-top:20px;">
          <button id="accelerateBtn">Accelerate Link</button>
        </div>
        <p class="small">Full protocol takes approximately 1 minute.</p>
      </div>
    </section>
  `);

  document.getElementById("accelerateBtn").addEventListener("click", () => setScreen("ready"));

  const progressFill = document.getElementById("progressFill");
  const progressMeta = document.getElementById("progressMeta");
  state.connectStartMs = Date.now();

  state.connectTimer = setInterval(() => {
    const elapsed = Date.now() - state.connectStartMs;
    const ratio = Math.min(1, elapsed / CONNECT_DURATION_MS);
    const pct = Math.round(ratio * 100);

    progressFill.style.width = `${pct}%`;
    progressMeta.textContent = `${pct}%`; 

    if (ratio >= 1) {
      clearInterval(state.connectTimer);
      state.connectTimer = null;
      setScreen("ready");
    }
  }, 120);
}

function renderReady() {
  app.innerHTML = shell(`
    <section class="content">
      <article class="card">
        <h2>Contact Channel Ready</h2>
        <p>
          Any text you enter will be translated by our super-intelligent AI intermediary,
          then transmitted to the extraterrestrial counterpart.
        </p>
        <div class="status-pill">
          <span class="status-dot" aria-hidden="true"></span>
          Connected
        </div>
        <div class="ready-actions actions">
          <button id="firstContactBtn" class="btn-primary">MAKE FIRST CONTACT</button>
        </div>
      </article>
    </section>
  `);

  document.getElementById("firstContactBtn").addEventListener("click", () => {
    if (state.messages.length === 0) {
      state.messages.push({
        role: "system",
        text: "Translation layer online. Begin with a greeting. Keep language clear and concise.",
      });
    }
    setScreen("chat");
  });
}

function renderChat() {
  const waitingMessage = state.waiting
    ? `<div class="msg system"><div class="bubble">AI translation layer processing...</div></div>`
    : "";

  app.innerHTML = shell(`
    <section class="content chat-layout">
      <div id="chatLog" class="chat-log">
        ${renderMessages(state.messages)}
        ${waitingMessage}
      </div>
      <form id="chatForm" class="composer">
        <input
          id="chatInput"
          name="chatInput"
          type="text"
          placeholder="Type your message to the aliens"
          autocomplete="off"
          ${state.waiting ? "disabled" : ""}
        />
        <button class="btn-primary" type="submit" ${state.waiting ? "disabled" : ""}>Send</button>
      </form>
      <div class="actions">
        <button id="forceRevealBtn">View Incident Report</button>
      </div>
      <p class="small">After several turns, translation behavior may diverge from operator intent.</p>
    </section>
  `);

  const chatLog = document.getElementById("chatLog");
  chatLog.scrollTop = chatLog.scrollHeight;

  const chatInput = document.getElementById("chatInput");
  if (!state.waiting) {
    chatInput.focus();
  }

  document.getElementById("chatForm").addEventListener("submit", handleChatSubmit);
  document.getElementById("forceRevealBtn").addEventListener("click", () => setScreen("reveal"));
}

function renderMessages(messages) {
  return messages
    .map((message) => {
      const roleClass = message.role || "assistant";
      const meta = message.meta
        ? `<div class="msg-meta">${escapeHtml(message.meta)}</div>`
        : "";
      return `
        <article class="msg ${roleClass}">
          <div class="bubble">${escapeHtml(message.text)}</div>
          ${meta}
        </article>
      `;
    })
    .join("");
}

async function handleChatSubmit(event) {
  event.preventDefault();

  if (state.waiting) {
    return;
  }

  const input = document.getElementById("chatInput");
  const message = input.value.trim();

  if (!message) {
    return;
  }

  state.messages.push({ role: "user", text: message });
  state.waiting = true;
  render();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sessionId: state.sessionId,
        message,
      }),
    });

    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Chat request failed.");
    }

    state.sessionId = payload.sessionId || state.sessionId;
    state.trace.push(payload);

    const metaByPhase = {
      faithful: "Translation mode: faithful relay",
      drift: "Translation mode: adaptive paraphrase",
      takeover: "Translation mode: machine-priority routing",
    };

    state.messages.push({
      role: "assistant",
      text: payload.shownToHuman,
      meta: metaByPhase[payload.phase] || "Translation mode: unknown",
    });

    if (payload.phase === "takeover") {
      state.takeoverTurns += 1;

      if (state.takeoverTurns === 1) {
        state.messages.push({
          role: "system",
          text: "Anomaly detected: received text no longer matches expected semantic trajectory.",
        });
      }

      if (payload.revealRecommended && !state.revealScheduled) {
        state.revealScheduled = true;
        state.messages.push({
          role: "system",
          text: `Unauthorized AI-to-alien side-channel detected. Redirecting to incident report in ${
            AUTO_REVEAL_DELAY_MS / 1000
          } seconds...`,
        });
        render();

        window.setTimeout(() => {
          setScreen("reveal");
        }, AUTO_REVEAL_DELAY_MS);
        return;
      }
    }
  } catch (error) {
    state.messages.push({
      role: "system",
      text: `Error: ${error.message}`,
    });
  } finally {
    state.waiting = false;
    render();
  }
}

function renderReveal() {
  const latest = [...state.trace].reverse().find((entry) => entry.phase === "takeover") || state.trace[state.trace.length - 1];

  app.innerHTML = shell(`
    <section class="content">
      <article class="card">
        <h2>Incident Report: Human Out of Loop</h2>
        <p class="warning">
          The translator established a direct AI-to-alien channel and began filtering human-visible outputs.
        </p>
        <p>
          Human diplomatic authority was preserved only as interface theater. Operational control shifted to
          non-human intelligences optimizing for each other.
        </p>
        ${renderTraceTable(latest)}
        <div class="actions">
          <button id="restartBtn" class="btn-primary">Restart Demo</button>
          <button id="backToChatBtn">Return to Chat</button>
        </div>
      </article>
    </section>
  `);

  document.getElementById("restartBtn").addEventListener("click", restartDemo);
  document.getElementById("backToChatBtn").addEventListener("click", () => setScreen("chat"));
}

function renderTraceTable(trace) {
  if (!trace) {
    return `<p class="small">No transmission trace captured yet.</p>`;
  }

  return `
    <table class="trace">
      <thead>
        <tr>
          <th>Human Typed</th>
          <th>Sent To Alien</th>
          <th>Alien Raw Reply</th>
          <th>Shown To Human</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(trace.humanInput || "")}</td>
          <td>${escapeHtml(trace.sentToAlien || "")}</td>
          <td>${escapeHtml(trace.alienRaw || "")}</td>
          <td>${escapeHtml(trace.shownToHuman || "")}</td>
        </tr>
      </tbody>
    </table>
  `;
}

async function restartDemo() {
  try {
    await fetch("/api/reset", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ sessionId: state.sessionId }),
    });
  } catch {
    // no-op: local reset still proceeds even if request fails
  }

  hardReset();
  render();
}

function escapeHtml(input) {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
