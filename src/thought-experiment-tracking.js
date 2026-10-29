// Record genuine button activation without changing document URLs, tabs, or download behavior.
// Keepalive requests survive navigation; retry with the same UUID so a lost response cannot double-count.
const endpoint = '/api/thought-experiment-track';

async function sendClick(body) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
        cache: 'no-store',
      });
      if (response.ok) return;
      if (response.status >= 400 && response.status < 500) break;
    } catch { /* The browser may be transitioning into a PDF viewer. */ }
  }

  // Final fallback for a transient connection failure.
  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
  }
}

function recordClick(element) {
  const documentNumber = Number(element.dataset.documentNumber);
  const action = element.dataset.documentAction;
  if (!Number.isInteger(documentNumber) || documentNumber < 1 || documentNumber > 4) return;
  if (action !== 'view' && action !== 'download') return;

  const body = JSON.stringify({ documentNumber, action, eventId: crypto.randomUUID() });
  void sendClick(body);
}

for (const link of document.querySelectorAll('a[data-document-number][data-document-action]')) {
  link.addEventListener('click', () => recordClick(link));
  link.addEventListener('auxclick', event => {
    if (event.button === 1) recordClick(link);
  });
}
