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

let activePin = null;
let refreshing = false;
let refreshTimer = null;

function displayCounts(counts, at) {
  let total = 0;
  for (let number = 1; number <= 4; number += 1) {
    for (const action of ['view', 'download']) {
      const value = Number(counts?.[String(number)]?.[action]);
      const safeCount = Number.isSafeInteger(value) && value >= 0 ? value : 0;
      document.querySelector(`[data-count="${number}-${action}"]`).textContent = safeCount.toLocaleString();
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
