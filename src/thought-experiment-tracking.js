// Record genuine button activation without changing the document URL, tab, or download behavior.
// Requests are queued even if the visitor closes the page immediately afterward.
const endpoint = '/api/thought-experiment-track';

function recordClick(element) {
  const documentNumber = Number(element.dataset.documentNumber);
  const action = element.dataset.documentAction;
  if (!Number.isInteger(documentNumber) || documentNumber < 1 || documentNumber > 4) return;
  if (action !== 'view' && action !== 'download') return;

  const body = JSON.stringify({ documentNumber, action, eventId: crypto.randomUUID() });
  const beacon = new Blob([body], { type: 'application/json' });
  if (navigator.sendBeacon?.(endpoint, beacon)) return;

  // Fallback for browsers without Beacon support or when its queue is full.
  fetch(endpoint, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

for (const link of document.querySelectorAll('a[data-document-number][data-document-action]')) {
  link.addEventListener('click', () => recordClick(link));
  link.addEventListener('auxclick', event => {
    if (event.button === 1) recordClick(link);
  });
}
