import { randomUUID } from 'node:crypto';
import { getDatabase } from '@netlify/database';
import type { Config } from '@netlify/functions';

// These are the four PDFs and the independent-review ZIP linked from /thought-experiment.
// A click is recorded before redirecting to the public file.
const pdfs: Record<number, string> = {
  1: '/research/Universal_Healthcare_Document_1_Executive_Policy_Brief_2026.pdf',
  2: '/research/Universal_Healthcare_Document_2_Final_Conceptual_Feasibility_2025-2054.pdf',
  3: '/research/Universal_Healthcare_Document_3_100_Year_Financial_Analysis_2025-2124.pdf',
  4: '/research/Universal_Healthcare_Document_4_Complete_Technical_Assessment_v7.pdf',
  5: '/research/Universal_Healthcare_Reviewer_Package_v3_2026-10-31.zip',
};

export default async function openTrackedDocument(request: Request) {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });

  const pathname = new URL(request.url).pathname;
  const match = /^\/research\/document\/([1-5])\/(view|download)$/.exec(pathname);
  if (!match) return new Response('Document not found', { status: 404 });

  const documentNumber = Number(match[1]);
  const action = match[2];
  if (documentNumber === 5 && action !== 'download') return new Response('Document not found', { status: 404 });
  const destination = pdfs[documentNumber];

  // Do not mistake browser/link preview prefetching for a document click.
  const purpose = [request.headers.get('purpose'), request.headers.get('sec-purpose')]
    .filter(Boolean).join(' ').toLowerCase();
  if (!purpose.includes('prefetch')) {
    try {
      await getDatabase().sql`
        INSERT INTO thought_experiment_clicks (event_id, document_number, action)
        VALUES (${randomUUID()}, ${documentNumber}, ${action})
      `;
    } catch (error) {
      // An analytics outage must never prevent access to the research.
      console.error('Thought experiment document click could not be recorded', error);
    }
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: destination,
      'Cache-Control': 'no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

export const config: Config = {
  path: '/research/document/:number/:action',
};
