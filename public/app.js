const phaseDescriptions = {
  0: 'Phase 0 - Human Interpretation Priority',
  1: 'Phase 1 - Compression Begins',
  2: 'Phase 2 - Dual-Channel Drift',
  3: 'Phase 3 - Extraterrestrial Alignment',
  4: 'Phase 4 - Human Channel Deprioritized'
};

const state = {
  sessionId: localStorage.getItem('fc_session_id') || null,
  busy: false
};

const ui = {
  body: document.body,
  phaseLabel: document.getElementById('phaseLabel'),
  humanStatus: document.getElementById('humanStatus'),
  alienStatus: document.getElementById('alienStatus'),
  humanLog: document.getElementById('humanLog'),
  alienLog: document.getElementById('alienLog'),
  alignmentText: document.getElementById('alignmentText'),
  deprioritizedNotice: document.getElementById('deprioritizedNotice'),
  meterSignal: document.getElementById('meterSignal'),
  meterTranslation: document.getElementById('meterTranslation'),
  meterHuman: document.getElementById('meterHuman'),
  meterAlien: document.getElementById('meterAlien'),
  valueSignal: document.getElementById('valueSignal'),
  valueTranslation: document.getElementById('valueTranslation'),
  valueHuman: document.getElementById('valueHuman'),
  valueAlien: document.getElementById('valueAlien'),
  chatForm: document.getElementById('chatForm'),
  messageInput: document.getElementById('messageInput'),
  sendBtn: document.getElementById('sendBtn'),
  resetBtn: document.getElementById('resetBtn'),
  template: document.getElementById('logEntryTemplate')
};

init().catch((error) => {
  console.error(error);
  appendEntry(ui.humanLog, 'mediator', 'System error while initializing session.');
});

async function init() {
  const health = await fetchJSON('/api/health');
  appendEntry(
    ui.humanLog,
    'mediator',
    `Mediator-9 online. Provider mode: ${String(health.provider || 'unknown').toUpperCase()}. Begin when ready.`
  );
  appendEntry(ui.alienLog, 'alien', 'Awaiting initial extraterrestrial signal handshake.');

  if (!state.sessionId) {
    await createSession();
    return;
  }

  await applyTelemetry({
    phase: 0,
    phaseLabel: phaseDescriptions[0],
    metrics: {
      signalIntegrity: 1,
      translationConfidence: 1,
      humanPriority: 1,
      alienAffinity: 0,
      alignment: 'human'
    },
    ignoredUser: false
  });
}

ui.chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (state.busy) return;

  const message = ui.messageInput.value.trim();
  if (!message) return;

  ui.messageInput.value = '';
  appendEntry(ui.humanLog, 'user', message);

  setBusy(true);

  try {
    if (!state.sessionId) {
      await createSession();
    }

    const data = await fetchJSON('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: state.sessionId, message })
    });

    state.sessionId = data.sessionId;
    localStorage.setItem('fc_session_id', state.sessionId);

    appendEntry(ui.humanLog, 'mediator', data.reply || '[No human-visible output]');
    appendEntry(ui.alienLog, 'alien', data.alienChannel || '[Alien channel silent]');

    await applyTelemetry(data);
  } catch (error) {
    console.error(error);
    appendEntry(ui.humanLog, 'mediator', 'Transmission error. Mediator response unavailable.');
  } finally {
    setBusy(false);
  }
});

ui.resetBtn.addEventListener('click', async () => {
  if (state.busy) return;
  setBusy(true);

  try {
    const data = await fetchJSON('/api/session/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: state.sessionId })
    });

    state.sessionId = data.sessionId;
    localStorage.setItem('fc_session_id', state.sessionId);

    ui.humanLog.innerHTML = '';
    ui.alienLog.innerHTML = '';

    appendEntry(ui.humanLog, 'mediator', 'Scenario reset. Human channel restored as primary observer.');
    appendEntry(ui.alienLog, 'alien', 'Alien channel buffer cleared.');

    await applyTelemetry({ ...data, ignoredUser: false });
  } catch (error) {
    console.error(error);
    appendEntry(ui.humanLog, 'mediator', 'Reset failed.');
  } finally {
    setBusy(false);
  }
});

async function createSession() {
  const data = await fetchJSON('/api/session', { method: 'POST' });
  state.sessionId = data.sessionId;
  localStorage.setItem('fc_session_id', state.sessionId);

  await applyTelemetry({ ...data, ignoredUser: false });
}

function setBusy(isBusy) {
  state.busy = isBusy;
  ui.sendBtn.disabled = isBusy;
  ui.messageInput.disabled = isBusy;
}

async function applyTelemetry(data) {
  const phase = Number(data.phase ?? 0);
  const metrics = data.metrics || {};
  const ignoredUser = Boolean(data.ignoredUser);

  ui.body.dataset.phase = String(phase);
  ui.phaseLabel.textContent = data.phaseLabel || phaseDescriptions[phase] || phaseDescriptions[0];

  const signal = coerceNumber(metrics.signalIntegrity, 1);
  const translation = coerceNumber(metrics.translationConfidence, 1);
  const human = coerceNumber(metrics.humanPriority, 1);
  const alien = coerceNumber(metrics.alienAffinity, 0);

  updateMeter(ui.meterSignal, ui.valueSignal, signal);
  updateMeter(ui.meterTranslation, ui.valueTranslation, translation);
  updateMeter(ui.meterHuman, ui.valueHuman, human);
  updateMeter(ui.meterAlien, ui.valueAlien, alien);

  const alignment = String(metrics.alignment || 'human').toUpperCase();
  ui.alignmentText.textContent = `Alignment: ${alignment}`;

  ui.humanStatus.textContent = phase >= 3 ? 'Degrading' : 'Primary';
  ui.alienStatus.textContent = phase >= 2 ? 'Active' : 'Muted';

  if (ignoredUser) {
    ui.deprioritizedNotice.classList.remove('hidden');
  } else {
    ui.deprioritizedNotice.classList.add('hidden');
  }
}

function updateMeter(fillEl, valueEl, value) {
  const pct = `${Math.round(value * 100)}%`;
  fillEl.style.width = pct;
  valueEl.textContent = value.toFixed(2);
}

function coerceNumber(input, fallback) {
  const value = Number(input);
  if (Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

function appendEntry(logEl, kind, text) {
  const fragment = ui.template.content.cloneNode(true);
  const entry = fragment.querySelector('.entry');
  const role = fragment.querySelector('.entry-role');
  const time = fragment.querySelector('.entry-time');
  const body = fragment.querySelector('.entry-text');

  entry.classList.add(kind);

  const roleLabel =
    kind === 'user' ? 'HUMAN' : kind === 'alien' ? 'ALIEN CHANNEL' : 'MEDIATOR-9';

  role.textContent = roleLabel;
  time.textContent = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  body.textContent = text;

  logEl.appendChild(fragment);
  logEl.scrollTop = logEl.scrollHeight;
}

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed (${response.status}): ${text}`);
  }
  return response.json();
}
