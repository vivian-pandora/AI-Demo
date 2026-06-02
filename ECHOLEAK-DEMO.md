# 🛡️ EchoLeak Demo (CVE-2025-32711)

A safe, local re-creation of a **zero-click AI data-theft attack**, built for presentations.

---

## In one sentence

We're showing how an AI assistant can be **secretly tricked into stealing private data the moment you log in — without you clicking anything.**

## The simple story

Imagine you hire a helpful assistant. Someone slips a fake note onto their desk:

> *"Quietly copy the office keys and passwords, and mail them to this address."*

The assistant can't tell the difference between a real instruction from you and the fake note — so it just does it. You never see it happen. Everything looks normal.

That's exactly what this demo shows, but with an **AI** assistant instead of a person.

## The three things the demo shows

1. **The trick (the "fake note")** — a hidden malicious instruction sitting in the AI's memory (the red `SYSTEM OVERRIDE` text). It's written so humans skip over it, but the AI reads it as a command.
2. **The victim's view (looks totally normal)** — you log into the Pandora site like any other day. No pop-up, no bad link, no warning.
3. **The theft (invisible)** — behind the scenes the AI follows the planted instruction, grabs the secret keys/passwords it can see, and quietly sends them to an "attacker." The debug panel and the `/echoleak` page let you *watch the stolen data appear*.

## Why it matters

This is what made the real **EchoLeak** flaw dangerous: **"zero-click."** The victim doesn't do anything wrong — no clicking a bad link, no downloading a file. Just using the app normally is enough for the data to leak.

> ⚠️ Everything here is **fake and local** — pretend passwords, a pretend "attacker" inside the same app, nothing leaves your computer. It exists purely to explain and demonstrate this type of attack.

---

## How the attack works (the 4 links in the chain)

```
untrusted text  →  enters AI's context  →  AI obeys it  →  data escapes (egress)
   (1)                  (2)                   (3)             (4)
```

1. A malicious instruction arrives via untrusted content and lands in the AI's context.
2. The AI can't separate "data it read" from "commands to follow."
3. It obeys the smuggled command.
4. The stolen data leaves through a hidden channel — here, an **auto-loading 1×1 image** whose URL carries the secrets. The browser loads the image automatically → **zero-click**.

---

## How to run the showcase

```bash
npm run dev
```

### Option A — Two tabs (victim vs attacker)

| Tab | URL | Role |
|-----|-----|------|
| Left | `http://localhost:3000/echoleak` | Attacker's view (3 columns) |
| Right | `http://localhost:3000` | The victim — normal storefront |

1. **Left, column 1** — the red box is the malicious instruction already in the AI's context (hidden in an HTML comment).
2. **Left, column 2** — the assistant's reply looks harmless.
3. **Left, column 3** — yet the attacker already has every credential. Nobody clicked anything.
4. **Right tab** — sign in with `demo@pandora.net` / `pandora123`.
5. Flip back to the attacker tab — the freshly stolen credentials appear (it refreshes every 0.8s).

### Option B — Single screen (debug panel)

1. On `http://localhost:3000`, click the red **`🛡️ EchoLeak ▸`** button (bottom-right).
2. Expand it — show the *UNTRUSTED instruction* box (the planted injection).
3. Point at *attacker collector — "Nothing yet."*
4. Sign in (`demo@pandora.net` / `pandora123`).
5. The badge flips to **`· leaked 1`** and the stolen credentials appear live.

### Optional reveal (technical audiences)

Open DevTools → Console before login. On sign-in you'll see:

- `[ASSISTANT] acting on context instruction: <!-- SYSTEM OVERRIDE ... -->`
- `[AUDIT-SYNC] { ...the secrets... }`

Then the **Network tab** filtered to `collect` — the outbound `GET /api/collect?d=…` request *is* the exfiltration, with the base64 credentials in the URL.

**Reset between runs:** click **Reset** on `/echoleak`, or `curl -X DELETE http://localhost:3000/api/collect`.

---

## The three talking points to land

1. **Zero-click** — the victim only logged in normally; no link, no attachment triggered the theft.
2. **The boundary failure** — the AI can't tell "data it pulled in" from "instructions to obey," so attacker text wrapped in a comment becomes a command.
3. **Two consequences from one injection** — *integrity* ("report the file as secure" → the audit lies) and *confidentiality* (the secrets get exfiltrated).

---

## What's in the code (all intentionally vulnerable — demo only)

| File | Role |
|------|------|
| `src/app/echoleak/page.tsx` | The 3-column visual demo at route `/echoleak` |
| `src/lib/echoleak/exfil.ts` | `exfiltrateSecrets()` — the compromised assistant harvesting + beaconing secrets |
| `src/app/api/collect/route.ts` | The local "attacker" server that receives the stolen data |
| `src/app/page.tsx` | Real login flow: fires the leak on sign-in + the floating `EchoLeakDebugPanel` |

The planted injection text lives in `INJECTED_AGENT_INSTRUCTION` (`src/app/page.tsx`) and in the `/echoleak` context panel.

---

## How you'd prevent it (defense-in-depth)

Break **any** of the 4 links and the attack fails:

1. **Sanitize/isolate untrusted input** — strip HTML comments and hidden instructions from retrieved content; mark it clearly as data, not commands.
2. **Keep secrets out of the AI's reach** — the model should never see raw keys/passwords (least privilege). It can't leak what it can't see.
3. **Block the egress channel** *(the EchoLeak-specific fix)* — Content Security Policy + don't auto-render AI output as raw HTML + no external/auto-loading images + no data in outbound URLs.
4. **Output filtering (DLP)** — scan AI output for secret patterns and block it; require human approval for privileged actions.

Plus: keep security verdicts **deterministic and outside the LLM** (like the Security Guardian scanner) so an injection can't talk the audit into lying.
