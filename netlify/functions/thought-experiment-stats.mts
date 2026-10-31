import { createHash, timingSafeEqual } from 'node:crypto';
import { getDatabase } from '@netlify/database';
import type { Config } from '@netlify/functions';

// Salted SHA-256 verifier of the requested four-digit PIN, not the PIN itself.
// This is a low-security shared PIN gate, not individual user authentication.
const pinVerifier = Buffer.from('e60c81f0ea22f76e765c194232b60d0f670adf100239eed350c23e775cbe0d35', 'hex');

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });

type CountRow = { document_number: number; action: 'view' | 'download'; clicks: number | string };

export default async function readDocumentCounts(request: Request) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const origin = request.headers.get('origin');
  if (origin !== new URL(request.url).origin) {
    return json({ error: 'Cross-origin requests are not accepted' }, 403);
  }

  let pin: unknown;
  try {
    if (Number(request.headers.get('content-length') || 0) > 512) throw new Error('Too large');
    ({ pin } = await request.json());
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
    return json({ error: 'Incorrect PIN' }, 401);
  }
  const supplied = createHash('sha256').update(`darkstar-counter-v1:${pin}`).digest();
  if (!timingSafeEqual(supplied, pinVerifier)) return json({ error: 'Incorrect PIN' }, 401);

  try {
    const rows = await getDatabase().sql<CountRow>`
      SELECT document_number, action, COUNT(*)::integer AS clicks
      FROM thought_experiment_clicks
      GROUP BY document_number, action
    `;
    const counts: Record<string, { view: number; download: number }> = {
      '1': { view: 0, download: 0 },
      '2': { view: 0, download: 0 },
      '3': { view: 0, download: 0 },
      '4': { view: 0, download: 0 },
      '5': { view: 0, download: 0 },
    };
    for (const row of rows) {
      if (counts[String(row.document_number)] && (row.action === 'view' || row.action === 'download')) {
        counts[String(row.document_number)][row.action] = Number(row.clicks);
      }
    }
    return json({ counts, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Thought experiment counts unavailable', error);
    return json({ error: 'Counts temporarily unavailable' }, 503);
  }
}

export const config: Config = {
  path: '/api/thought-experiment-stats',
  rateLimit: { action: 'rate_limit', aggregateBy: 'ip', windowSize: 60, windowLimit: 15 },
};
