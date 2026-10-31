import { createHash, timingSafeEqual } from 'node:crypto';
import { getDatabase } from '@netlify/database';
import type { Config } from '@netlify/functions';

// Same access verifier as the existing PIN-protected statistics endpoint.
const pinVerifier = Buffer.from('e60c81f0ea22f76e765c194232b60d0f670adf100239eed350c23e775cbe0d35', 'hex');
const PAGE_SIZE = 25;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const json = (body: unknown, status = 200) => Response.json(body, {
  status,
  headers: {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  },
});

type ClickRow = { event_id: string; created_at: Date | string };

export default async function readDocumentClickHistory(request: Request) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return json({ error: 'Cross-origin requests are not accepted' }, 403);
  }

  let body: Record<string, unknown>;
  try {
    if (Number(request.headers.get('content-length') || 0) > 1024) throw new Error('Too large');
    body = await request.json();
    if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid request');
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  const { pin, documentNumber, action, cursor = null } = body;
  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) return json({ error: 'Incorrect PIN' }, 401);
  const supplied = createHash('sha256').update(`darkstar-counter-v1:${pin}`).digest();
  if (!timingSafeEqual(supplied, pinVerifier)) return json({ error: 'Incorrect PIN' }, 401);

  if (!Number.isInteger(documentNumber) || Number(documentNumber) < 1 || Number(documentNumber) > 5 ||
      (action !== 'view' && action !== 'download') ||
      (Number(documentNumber) === 5 && action !== 'download')) {
    return json({ error: 'Invalid document or action' }, 400);
  }

  let beforeAt: string | null = null;
  let beforeId: string | null = null;
  if (cursor !== null) {
    if (!cursor || typeof cursor !== 'object' || Array.isArray(cursor)) return json({ error: 'Invalid cursor' }, 400);
    const marker = cursor as Record<string, unknown>;
    if (typeof marker.at !== 'string' || typeof marker.eventId !== 'string' ||
        !isoPattern.test(marker.at) || !uuidPattern.test(marker.eventId) ||
        Number.isNaN(Date.parse(marker.at))) {
      return json({ error: 'Invalid cursor' }, 400);
    }
    beforeAt = marker.at;
    beforeId = marker.eventId;
  }

  try {
    const rows = await getDatabase().sql<ClickRow>`
      SELECT event_id, created_at
      FROM thought_experiment_clicks
      WHERE document_number = ${documentNumber as number}
        AND action = ${action as string}
        AND (
          ${beforeAt}::timestamptz IS NULL
          OR created_at < ${beforeAt}::timestamptz
          OR (created_at = ${beforeAt}::timestamptz AND event_id < ${beforeId}::uuid)
        )
      ORDER BY created_at DESC, event_id DESC
      LIMIT ${PAGE_SIZE + 1}
    `;

    const hasMore = rows.length > PAGE_SIZE;
    const entries = rows.slice(0, PAGE_SIZE).map(row => ({
      eventId: String(row.event_id),
      at: new Date(row.created_at).toISOString(),
    }));
    const last = entries[entries.length - 1];
    return json({
      documentNumber,
      action,
      entries,
      nextCursor: hasMore && last ? { at: last.at, eventId: last.eventId } : null,
    });
  } catch (error) {
    console.error('Thought experiment history unavailable', error);
    return json({ error: 'Click history temporarily unavailable' }, 503);
  }
}

export const config: Config = {
  path: '/api/thought-experiment-history',
  rateLimit: { action: 'rate_limit', aggregateBy: 'ip', windowSize: 60, windowLimit: 30 },
};
