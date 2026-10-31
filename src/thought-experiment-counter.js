const gate = document.getElementById('pin-gate');
const dashboard = document.getElementById('dashboard');
const form = document.getElementById('pin-form');
const input = document.getElementById('pin-input');
const message = document.getElementById('pin-message');
const unlockButton = document.getElementById('unlock-button');
const refreshButton = document.getElementById('refresh-button');
const lockButton = document.getElementById('lock-button');
const updated = document.getElementById('last-updated');
const summary = document.getElementById('summary');
const histories = new Map();
const easternTime = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric', month: 'short', day: 'numeric',
  hour: 'numeric', minute: '2-digit', second: '2-digit',
  timeZoneName: 'short',
});

let activePin = null;
let refreshing = false;
let refreshTimer = null;

function displayCounts(counts, at) {
  let total = 0;
  for (let number = 1; number <= 5; number += 1) {
    for (const action of ['view', 'download']) {
      if (number === 5 && action === 'view') continue;
      const value = Number(counts?.[String(number)]?.[action]);
      const safeCount = Number.isSafeInteger(value) && value >= 0 ? value : 0;
      document.querySelector(`[data-count="${number}-${action}"]`).textContent = safeCount.toLocaleString();
      const history = histories.get(number + '-' + action);
      if (history) {
        const changed = history.lastCount !== null && history.lastCount !== safeCount;
        history.lastCount = safeCount;
        if (changed && !history.panel.hidden) void loadHistory(history, 'newest');
      }
      total += safeCount;
    }
  }
  summary.replaceChildren(document.createTextNode('Total recorded clicks: '));
  const strong = document.createElement('strong');
  strong.textContent = total.toLocaleString();
  summary.append(strong);
  updated.textContent = `Updated ${new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

async function fetchCounts(pin) {
  const response = await fetch('/api/thought-experiment-stats', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  if (!response.ok) {
    const error = new Error(response.status === 401 ? 'Incorrect PIN. Please try again.' : 'Counters are temporarily unavailable. Please try again.');
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function refresh() {
  if (!activePin || refreshing) return;
  refreshing = true;
  refreshButton.disabled = true;
  try {
    const result = await fetchCounts(activePin);
    displayCounts(result.counts, result.updatedAt);
  } catch (error) {
    updated.textContent = error.status === 401 ? 'Access expired. Lock and enter your PIN again.' : 'Refresh failed · showing last recorded totals';
  } finally {
    refreshing = false;
    refreshButton.disabled = false;
  }
}

function lock() {
  activePin = null;
  clearInterval(refreshTimer);
  refreshTimer = null;
  dashboard.hidden = true;
  gate.hidden = false;
  input.value = '';
  message.textContent = '';
  for (const state of histories.values()) {
    state.generation += 1;
    state.panel.hidden = true;
    state.toggle.setAttribute('aria-expanded', 'false');
    state.toggle.textContent = 'Show click times ↓';
    state.items = [];
    state.cursor = null;
    state.loaded = false;
    state.lastCount = null;
    state.pendingNewest = false;
    state.list.replaceChildren();
    state.status.textContent = '';
  }
  input.focus();
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (refreshing) return;
  const candidate = input.value;
  if (!/^\d{4}$/.test(candidate)) {
    message.textContent = 'Enter a four-digit PIN.';
    return;
  }
  unlockButton.disabled = true;
  message.textContent = 'Checking access…';
  try {
    const result = await fetchCounts(candidate);
    activePin = candidate; // Memory only; never saved to local storage or URL.
    input.value = '';
    displayCounts(result.counts, result.updatedAt);
    gate.hidden = true;
    dashboard.hidden = false;
    refreshButton.focus();
    refreshTimer = setInterval(() => {
      if (!document.hidden) refresh();
    }, 30000);
  } catch (error) {
    message.textContent = error.message;
    input.select();
  } finally {
    unlockButton.disabled = false;
  }
});

refreshButton.addEventListener('click', refresh);
lockButton.addEventListener('click', lock);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refresh();
});

async function fetchHistory(pin, documentNumber, action, cursor) {
  const response = await fetch('/api/thought-experiment-history', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin, documentNumber, action, cursor }),
  });
  if (!response.ok) {
    const error = new Error(response.status === 401
      ? 'Access expired. Lock and enter your PIN again.'
      : 'History could not be loaded. Please try again.');
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function renderHistory(state) {
  const fragment = document.createDocumentFragment();
  for (const click of state.items) {
    const entry = document.createElement('li');
    const time = document.createElement('time');
    time.dateTime = click.at;
    time.title = 'Recorded at ' + click.at + ' (UTC)';
    time.textContent = easternTime.format(new Date(click.at));
    entry.append(time);
    fragment.append(entry);
  }
  state.list.replaceChildren(fragment);
  state.more.hidden = !state.cursor;
  const shown = state.items.length;
  const total = state.lastCount === null ? shown : Math.max(shown, state.lastCount);
  state.status.textContent = shown === 0
    ? 'No clicks have been recorded for this counter yet.'
    : 'Showing ' + shown.toLocaleString() + ' of ' + total.toLocaleString() + ' recorded click times.';
}

async function loadHistory(state, mode = 'first') {
  if (!activePin) return;
  if (state.loading) {
    if (mode === 'newest') state.pendingNewest = true;
    return;
  }
  state.loading = true;
  state.more.disabled = true;
  state.status.textContent = mode === 'older' ? 'Loading earlier clicks…' : 'Loading click times…';
  const pin = activePin;
  const generation = state.generation;
  const cursor = mode === 'older' ? state.cursor : null;

  try {
    const result = await fetchHistory(pin, state.number, state.action, cursor);
    if (generation !== state.generation || activePin !== pin) return;
    if (!Array.isArray(result.entries)) throw new Error('Invalid history response');

    if (mode === 'first') {
      state.items = result.entries;
      state.cursor = result.nextCursor;
    } else if (mode === 'older') {
      const seen = new Set(state.items.map(item => item.eventId));
      for (const entry of result.entries) {
        if (!seen.has(entry.eventId)) state.items.push(entry);
      }
      state.cursor = result.nextCursor;
    } else {
      const seen = new Set(state.items.map(item => item.eventId));
      const added = result.entries.filter(item => !seen.has(item.eventId));
      state.items = added.concat(state.items);
      state.items.sort((a, b) => b.at.localeCompare(a.at) || b.eventId.localeCompare(a.eventId));
    }

    state.loaded = true;
    renderHistory(state);
  } catch (error) {
    if (generation === state.generation && activePin === pin) {
      state.status.textContent = error.message;
    }
  } finally {
    state.loading = false;
    state.more.disabled = false;
    if (state.pendingNewest && !state.panel.hidden && activePin) {
      state.pendingNewest = false;
      void loadHistory(state, 'newest');
    }
  }
}

function initializeHistories() {
  for (const metric of document.querySelectorAll('.metric')) {
    const counter = metric.querySelector('[data-count]');
    if (!counter) continue;
    const match = /^(\d+)-(view|download)$/.exec(counter.dataset.count || '');
    if (!match) continue;
    const number = Number(match[1]);
    const action = match[2];
    const key = number + '-' + action;

    const container = document.createElement('div');
    container.className = 'metric-history';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'history-toggle';
    toggle.textContent = 'Show click times ↓';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'history-' + key);

    const panel = document.createElement('div');
    panel.id = 'history-' + key;
    panel.className = 'history-panel';
    panel.hidden = true;

    const note = document.createElement('p');
    note.className = 'history-note';
    note.textContent = 'Recorded clicks · Newest first · U.S. Eastern Time';

    const list = document.createElement('ol');
    list.className = 'history-list';
    list.setAttribute('aria-label', 'Document ' + number + ' ' + action + ' click times');

    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'history-more';
    more.textContent = 'Load older click times';
    more.hidden = true;

    const status = document.createElement('p');
    status.className = 'history-status';
    status.setAttribute('role', 'status');

    panel.append(note, list, more, status);
    container.append(toggle, panel);
    metric.append(container);

    const state = {
      number, action, toggle, panel, list, more, status,
      items: [], cursor: null, loaded: false, loading: false,
      pendingNewest: false, lastCount: null, generation: 0,
    };
    histories.set(key, state);

    toggle.addEventListener('click', () => {
      const opening = panel.hidden;
      panel.hidden = !opening;
      toggle.setAttribute('aria-expanded', String(opening));
      toggle.textContent = opening ? 'Hide click times ↑' : 'Show click times ↓';
      if (opening) void loadHistory(state, state.loaded ? 'newest' : 'first');
    });
    more.addEventListener('click', () => {
      if (state.cursor) void loadHistory(state, 'older');
    });
  }
}

initializeHistories();
