# clean-handoff

**A voice-AI agent that hands calls to humans without losing context.**

Most AI voice agents fail at the exact moment they matter most: escalation. They either
transfer cold — the caller repeats everything — or dump a raw transcript nobody reads.
`clean-handoff` is a production-style AI front desk (fictional dental clinic, "Brightside
Dental") built on **Vapi** + **Node.js/TypeScript**, designed around one idea: when the AI
escalates, the human receives a **structured context payload**, not free-form notes.

> 🎙 **Live demo:** `[DEMO-URL]/demo` — browser mic call, no phone number needed
> 📋 **Front-desk dashboard:** `[DEMO-URL]/dashboard` — see structured handoffs land in real time
> *(Free-tier hosting: first load after idle takes ~30-60s to wake up. That's a cold start, not a broken link.)*

## What it demonstrates

| Contact-center pattern | Where |
|---|---|
| Mid-call webhook integration (custom tools, sync, secured) | `server/src/routes/vapiToolCalls.ts` |
| Post-call CRM write-back (`end-of-call-report`) | `server/src/routes/vapiEvents.ts` |
| No-input/no-match handling: confidence threshold + max 2 retries + escape phrase | `assistant/system-prompt.md`, `assistant/assistant-config.json` |
| Five escalation triggers (explicit request, repeated no-match, sentiment, emergency, out-of-domain) | `assistant/system-prompt.md` |
| **Structured warm handoff** (schema-required context, backend-validated) | `assistant/tools/escalate-to-human.json`, `server/src/tools/escalateToHuman.ts` |
| Human-side visibility | `/dashboard` |

## Architecture

```
Caller (browser mic, Vapi Web SDK)
        │
        ▼
   Vapi platform  ──  STT → LLM (system prompt + 5 custom tools) → TTS
        │                                    │
        │ mid-call: POST /vapi/tool-calls    │ post-call: POST /vapi/events
        ▼                                    ▼
   Node/TS Express backend (mock CRM) ── lowdb JSON store
        │
        ├── lookupPatient · checkAvailability · bookAppointment · createLead
        ├── escalateToHuman ──► structured Handoff record
        └── /dashboard ◄── what the human agent sees
```

The web widget stands in for a PSTN number (cost decision for a public demo). Attaching a
Twilio number to the same assistant in Vapi requires **zero backend changes** — the webhook
architecture is identical.

## Docs

- **[Call-flow diagram](docs/call-flow.md)** — full Mermaid flow: intents, retry loop, every escalation path
- **[Runbook](docs/runbook.md)** — diagnostics, resolution, rollback, escalation matrix, comms templates
- **[Case study](docs/case-study.md)** — the write-up, in three paste-ready formats

## Handoff payload (the point of the project)

```json
{
  "callId": "call_demo_3",
  "caller": { "name": "Luis Gomez", "phone": "+15550007777", "existingPatient": false },
  "intent": "emergency",
  "escalationReason": "emergency",
  "urgency": "emergency",
  "dataCollectedSoFar": { "reasonForVisit": "severe tooth pain and swelling", "preferredDate": null, "insurance": null },
  "attempts": { "noMatchCount": 0, "questionsAsked": ["name", "phone"] },
  "transcriptSummary": "New patient Luis Gomez called with severe tooth pain and facial swelling since last night. Name and phone collected; escalated immediately per emergency protocol.",
  "sentiment": "frustrated"
}
```

The tool's JSON schema marks `escalationReason`, `intent`, `urgency`, `transcriptSummary`
and `sentiment` as **required**, and the backend rejects payloads without a summary — a
malformed escalation fails loudly, never silently.

## Local setup

Prereqs: Node 18+, a [Vapi](https://vapi.ai) account (free credit is enough), [ngrok](https://ngrok.com).

```bash
# 1. Backend
cd server
npm install
cp .env.example .env        # set VAPI_SERVER_SECRET to any random string
npm run dev                 # http://localhost:3000

# 2. Tunnel
ngrok http 3000             # note the https URL
```

**3. Vapi assistant** (dashboard → Assistants → Create):
- System prompt: paste [`assistant/system-prompt.md`](assistant/system-prompt.md) (below the `---`)
- Model: GPT-4o (or similar), temperature 0.3
- Transcriber: Deepgram nova-3, confidence threshold 0.4
- Tools: create 5 custom tools from [`assistant/tools/*.json`](assistant/tools/), with
  `server.url` = `https://<ngrok-url>/vapi/tool-calls` and a credential/secret matching your
  `VAPI_SERVER_SECRET`
- Server URL (assistant → Advanced): `https://<ngrok-url>/vapi/events`, server messages:
  `end-of-call-report`
- Reference: [`assistant/assistant-config.json`](assistant/assistant-config.json)

**4. Demo page**: put your Vapi **public** key and assistant ID in
[`server/public/demo.html`](server/public/demo.html) (or pass `?pk=...&assistant=...`),
open `http://localhost:3000/demo`, and call.

## Testing without spending call minutes

Every webhook is curl-testable — the exact payload shapes Vapi sends:

```bash
# Health
curl http://localhost:3000/health

# Simulate a mid-call tool call (availability)
curl -X POST http://localhost:3000/vapi/tool-calls \
  -H "Content-Type: application/json" -H "X-Vapi-Secret: <your-secret>" \
  -d '{"message":{"type":"tool-calls","call":{"id":"test_1"},"toolCallList":[{"id":"t1","name":"checkAvailability","arguments":{}}]}}'

# Simulate an escalation (then check /dashboard)
curl -X POST http://localhost:3000/vapi/tool-calls \
  -H "Content-Type: application/json" -H "X-Vapi-Secret: <your-secret>" \
  -d '{"message":{"type":"tool-calls","call":{"id":"test_1"},"toolCallList":[{"id":"t2","name":"escalateToHuman","arguments":{"escalationReason":"explicit_request","intent":"booking","urgency":"normal","transcriptSummary":"Caller asked for a human while booking a cleaning.","sentiment":"neutral"}}]}}'

# Simulate the post-call report (then check /dashboard call log)
curl -X POST http://localhost:3000/vapi/events \
  -H "Content-Type: application/json" -H "X-Vapi-Secret: <your-secret>" \
  -d '{"message":{"type":"end-of-call-report","call":{"id":"test_1"},"endedReason":"assistant-ended-call","analysis":{"summary":"Booking call, escalated on request."}}}'
```

## Deploy (Render free tier)

1. Push this repo to GitHub, create a Render **Web Service** on it:
   root directory `server`, build `npm install && npm run build`, start `npm start`.
2. Env vars: `VAPI_SERVER_SECRET` (same value as the Vapi credential).
3. Update every tool's `server.url` and the assistant's server URL in Vapi from the ngrok URL
   to `https://<your-app>.onrender.com`.
4. Replace `[DEMO-URL]` in this README with the Render URL.

## Known limitations (deliberate)

- **Web-only demo** — no PSTN number attached (cost). Same architecture works with Twilio via Vapi.
- **Prompt-enforced retry counting** — Vapi has no native no-match counter; the 2-retry rule
  lives in the system prompt, and the backend compensates by validating handoff payloads.
  Documented in the [runbook](docs/runbook.md#7-known-limitations-deliberate-documented).
- **Free-tier cold starts** — ~30-60s wake-up after idle.
- **lowdb JSON store** — right-sized for a demo; swap for a real DB/CRM API in production.

## License

[MIT](LICENSE)
