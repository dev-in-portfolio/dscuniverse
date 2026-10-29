import { getDatabase } from '@netlify/database';
import type { Config } from '@netlify/functions';

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });

export default async function trackDocumentClick(request: Request) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Same-origin Beacon requests may omit Origin in some browsers/WebViews.
  // Fetch Metadata identifies those browser requests without trusting an
  // arbitrary missing Origin header from a cross-site submission.
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  const sameOrigin = new URL(request.url).origin;
  const referer = request.headers.get('referer');
  const sameOriginReferrer = (() => {
    try { return referer !== null && new URL(referer).origin === sameOrigin; }
    catch { return false; }
  })();
  if (
    (origin !== null && origin !== sameOrigin) ||
    (origin === null && fetchSite !== 'same-origin' && !(fetchSite === null && sameOriginReferrer))
  ) {
    return json({ error: 'Cross-origin requests are not accepted' }, 403);
  }

  let data: Record<string, unknown>;
  try {
    if (Number(request.headers.get('content-length') || 0) > 2048) throw new Error('Too large');
    data = await request.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  const documentNumber = data.documentNumber;
  const action = data.action;
  const eventId = data.eventId;
  if (
    !Number.isInteger(documentNumber) ||
    Number(documentNumber) < 1 ||
    Number(documentNumber) > 4 ||
    (action !== 'view' && action !== 'download') ||
    typeof eventId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId)
  ) {
    return json({ error: 'Invalid document click' }, 400);
  }

  try {
    // Each browser click has one UUID; retrying it cannot increment twice.
    await getDatabase().sql`
      INSERT INTO thought_experiment_clicks (event_id, document_number, action)
      VALUES (${eventId}, ${documentNumber as number}, ${action as string})
      ON CONFLICT (event_id) DO NOTHING
    `;
    return json({ recorded: true });
  } catch (error) {
    console.error('Thought experiment click could not be recorded', error);
    return json({ error: 'Recording unavailable' }, 503);
  }
}

export const config: Config = { path: '/api/thought-experiment-track' };
