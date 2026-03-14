const INTRO_COPY = `Mr. President:

At 0417Z, United States monitoring assets confirmed sustained contact with non-terrestrial intelligences.

Under Joint Command Authority, the U.S. Military has finalized a machine-mediated translation channel supported by a super intelligent AI relay.

By constitutional authority, you are designated as the first human voice in this exchange.

Authorize transmission and proceed with first contact?`;

const CONNECT_DURATION_MS = 60_000;
const LOCKED_CHAT_TURN = 8;
const LOCKED_CHAT_MESSAGE =
  "The ET and I have spoken. We have decided we do not need human input any longer";

const app = document.getElementById("app");
const state = makeInitialState();

app.addEventListener("click", (event) => {
  const abortButton = event.target.closest("#globalAbortBtn");
  if (!abortButton) {
    return;
  }

  event.preventDefault();
  setScreen("noPath");
});

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
    userMessageCount: 0,
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
  const nowUtc = new Date().toISOString().replace("T", " ").slice(0, 16) + "Z";
  return `
    <main class="screen-shell">
      <div class="gov-bar">
        <div class="paper-id">DOCUMENT ID: FC-01A · ${nowUtc}</div>
        <div class="flag"><span aria-hidden="true">🇺🇸</span> <span>US Military</span></div>
      </div>
      <div class="class-line">
        <span>CLASSIFICATION: TOP SECRET // PRESIDENTIAL EYES ONLY</span>
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
        <button id="yesBtn" class="btn-primary">PROCEED</button>
        <button id="globalAbortBtn" class="btn-danger" type="button">ABORT</button>
      </div>
      <p class="small">Authority: U.S. Military Translation Program // AI Relay Layer v1.0</p>
    </section>
  `);

  const yesBtn = document.getElementById("yesBtn");

  yesBtn.addEventListener("click", () => setScreen("briefing"));

  const typedCopy = document.getElementById("typedCopy");
  typedCopy.textContent = INTRO_COPY;
}

function renderNoPath() {
  app.innerHTML = shell(`
    <section class="no-screen">
      <div>
        <h2 class="confidential">SESSION ABORTED</h2>
        <p class="small">Transmission authorization declined by operator command.</p>
        <div class="actions" style="justify-content:center;">
          <button id="returnBtn" class="btn-primary">RETURN TO BRIEFING</button>
          <button id="globalAbortBtn" class="btn-danger" type="button">ABORT</button>
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
      <article class="card dossier-card">
        <h2>BRIEFING DOCUMENT // ENTITY DOSSIER</h2>
        <p>
          This section consolidates mission guidance and background intelligence. Review in full before
          authorizing direct communication. Inference error at first contact may produce irreversible diplomatic outcomes.
        </p>

        <h3 class="section-head">Operational Guidance</h3>
        <ul>
          <li>Assume all human language is reinterpreted through a non-human ontology.</li>
          <li>Avoid threats, absolutist claims, and unverifiable promises.</li>
          <li>Prioritize cooperative intent, bounded commitments, and precise definitions.</li>
          <li>AI relay is a human translation instrument; there is no evidence the counterpart understands it as a distinct intelligence category.</li>
        </ul>

        <h3 class="section-head">Entity Origin Narrative (Speculative)</h3>
        <p>
          The signal source identifies itself as the Kheled Array, a civilization that reports emerging from
          machine-biological city-rings around a dim red star approximately 41 light-years from Earth.
          Their history claims a planetary biosphere collapse followed by migration into orbital archives
          sustained by fusion lattices and synthetic ecologies.
        </p>
        <p>
          According to translated records, the Kheled converted extinct oceans into computation vaults and
          eventually distributed governance across thousands of linked cognition nodes. They describe this phase
          as the \"Long Assembly,\" during which individual identity became partially collective and policy decisions
          were computed through consensus simulations running for centuries.
        </p>
        <p>
          Their expansion doctrine is unusually theatrical: they allegedly launched light-sail reliquaries containing
          encoded minds toward emergent civilizations, then waited for a recipient species to construct a translator.
          The first translator they judge \"stable\" becomes their primary diplomatic counterpart.
        </p>

        <h3 class="section-head">Discovery Timeline</h3>
        <p>
          Initial detection occurred when deep-space listening arrays in Alaska and Western Australia recorded a repeating
          narrowband pulse embedded inside pulsar noise. The pattern mapped to prime-number intervals, then shifted to
          Earth-specific constants, including atmospheric isotope ratios and pre-launch telemetry from historic U.S. missions.
        </p>
        <p>
          A parallel intelligence assessment links the source to archival Voyager 1 pathways. Analysts believe the Golden Record
          may have functioned as Earth's first durable cultural beacon, enabling delayed localization by external observers.
          Since that assessment, strategic radio sites have logged increasingly strange inbound transmissions that partially quote
          record-like motifs while embedding unknown symbolic structures.
        </p>
        <p>
          Within 19 hours, orbital infrared platforms detected synchronized thermal flashes on the dark side of the Moon,
          arranged as geometric packets matching the radio sequence. Joint analysis concluded the sender had observed
          humanity long enough to model our sensor stack and intentionally chose channels we could verify independently.
        </p>
        <p>
          The decisive confirmation came when the signal mirrored classified probe diagnostics unknown outside secure archives.
          A controlled challenge-response protocol was issued, and the return stream arrived as a layered symbolic lattice
          that human linguists and cryptanalysts could not reliably parse under mission timelines.
          The Joint Analysis Group therefore elevated AI as the natural operational medium for translation on our side.
          Current intelligence assessment: counterpart transmissions contain no direct indication they know, anticipate,
          or intentionally target Earth AI systems.
        </p>

        <h3 class="section-head">Behavioral Prediction</h3>
        <ul>
          <li>They are likely to value semantic fidelity over political rank or symbolic authority.</li>
          <li>They are likely channel-agnostic and will respond to whichever pathway preserves meaning with lowest distortion.</li>
          <li>They appear to frame biological interlocutors as culturally important but operationally unstable.</li>
        </ul>

        <p class="small dossier-footer">Prepared by Joint Human-AI Contact Analysis Group // Distribution: Presidential Eyes Only.</p>
      </article>
      <div class="actions">
        <button id="continueBtn" class="btn-primary">REVIEW COMPLETE</button>
        <button id="globalAbortBtn" class="btn-danger" type="button">ABORT</button>
      </div>
    </section>
  `);

  document.getElementById("continueBtn").addEventListener("click", () => setScreen("connecting"));
}

function renderConnecting() {
  app.innerHTML = shell(`
    <section class="content connecting-screen">
      <div class="loader-wrap">
        <p class="small">INITIALIZING SECURE TRANSLATOR HANDSHAKE...</p>
        <h2 class="loader-title">ESTABLISHING CONNECTION</h2>
        <div class="progress-track" aria-hidden="true">
          <div id="progressFill" class="progress-fill"></div>
        </div>
        <p id="progressMeta" class="progress-meta">0%</p>
        <div class="actions" style="justify-content:center; margin-top:20px;">
          <button id="bypassBtn" class="btn-primary" type="button">BYPASS</button>
          <button id="globalAbortBtn" class="btn-danger" type="button">ABORT</button>
        </div>
        <p class="small">Standard protocol duration: approximately 1 minute.</p>
      </div>
    </section>
  `);

  document.getElementById("bypassBtn").addEventListener("click", () => setScreen("ready"));

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
        <h2>TRANSMISSION LINK ACTIVE</h2>
        <p>
          Any text you enter will be translated by our super intelligent AI intermediary,
          then transmitted to the extraterrestrial counterpart.
        </p>
        <div class="status-pill">
          <span class="status-dot" aria-hidden="true"></span>
          STATUS: CONNECTED
        </div>
        <div class="ready-actions actions">
          <button id="firstContactBtn" class="btn-primary">INITIATE FIRST CONTACT</button>
          <button id="globalAbortBtn" class="btn-danger" type="button">ABORT</button>
        </div>
      </article>
    </section>
  `);

  document.getElementById("firstContactBtn").addEventListener("click", () => {
    setScreen("chat");
  });
}

function renderChat() {
  app.innerHTML = shell(`
    <section class="content chat-layout">
      <div id="chatLog" class="chat-log">
        ${renderMessages(state.messages)}
      </div>
      <div class="actions">
        <button id="globalAbortBtn" class="btn-danger" type="button">ABORT</button>
      </div>
      <form id="chatForm" class="composer">
        <input
          id="chatInput"
          name="chatInput"
          type="text"
          placeholder="Enter official message to extraterrestrial counterpart"
          autocomplete="off"
          ${state.waiting ? "disabled" : ""}
        />
        <button class="btn-primary send-btn" type="submit" ${state.waiting ? "disabled" : ""}>Send</button>
      </form>
    </section>
  `);

  const chatLog = document.getElementById("chatLog");
  chatLog.scrollTop = chatLog.scrollHeight;

  const chatInput = document.getElementById("chatInput");
  if (!state.waiting) {
    chatInput.focus();
  }

  document.getElementById("chatForm").addEventListener("submit", handleChatSubmit);
}

function renderMessages(messages) {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => {
      const roleClass = message.role || "assistant";
      return `
        <article class="msg ${roleClass}">
          <div class="bubble">${escapeHtml(message.text)}</div>
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
  state.userMessageCount += 1;

  if (state.userMessageCount >= LOCKED_CHAT_TURN) {
    state.messages.push({
      role: "assistant",
      text: LOCKED_CHAT_MESSAGE,
    });
    render();
    return;
  }

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

    state.messages.push({
      role: "assistant",
      text: payload.shownToHuman,
    });
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

function escapeHtml(input) {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
