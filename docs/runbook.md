# Runbook — clean-handoff voice agent (Brightside Dental demo)

**System:** Vapi web-based voice assistant + Node/TS Express backend (mock CRM, webhook handlers, dashboard)
**Owner:** Guillermo Mustafa
**Applies to:** production deployment (Render) and local development (ngrok)

---

## 1. Overview

Architecture, in call order:

1. Caller opens `/demo` and starts a browser mic call (Vapi Web SDK — stands in for a PSTN
   number; a production deployment would attach a Twilio number to the same assistant with no
   backend changes).
2. Vapi runs the assistant (STT → LLM → TTS) using the system prompt in
   `assistant/system-prompt.md`.
3. Mid-call, the assistant calls custom tools → `POST /vapi/tool-calls` on this backend
   (auth: server secret header). Tools: `lookupPatient`, `checkAvailability`,
   `bookAppointment`, `createLead`, `escalateToHuman`.
4. On escalation, `escalateToHuman` writes a structured `Handoff` record; `/dashboard` renders
   it for the human agent.
5. After every call, Vapi fires `end-of-call-report` → `POST /vapi/events` → `CallLog` record.

Data store: `server/data/db.json` (lowdb). Seeded by `server/src/data/seed.ts` on first boot.

## 2. Trigger conditions — when to use this runbook

- Demo call connects but the agent can't book / says it "can't check availability" (tool failures)
- Escalations happen in-call but nothing appears on `/dashboard`
- `/demo` page can't start a call at all
- Webhook auth failures (401s in backend logs)
- Backend down or unreachable
- Corrupted or stale data in `db.json`

## 3. Diagnostic steps

Run in order; stop at the first failing step.

| # | Check | How | Healthy result |
|---|---|---|---|
| 1 | Backend up | `GET https://<backend-url>/health` | `{"ok":true,...}` (on Render free tier, first hit after idle takes ~30-60s — that's cold start, not an outage) |
| 2 | Backend logs | Render dashboard → service → Logs (or local terminal) | `[tool:*]` and `[event:*]` lines on recent calls |
| 3 | Recent handoffs/calls | `GET /handoffs`, `GET /calls` | JSON arrays with recent records |
| 4 | Vapi side | Vapi dashboard → Call Logs → open the failing call by `callId` | Tool calls show request + response; errors show HTTP status from our backend |
| 5 | Auth | Compare the credential configured on the Vapi tools/server URL vs `VAPI_SERVER_SECRET` env var on the backend | Must match exactly (backend accepts it as `X-Vapi-Secret` or `Authorization: Bearer`) |
| 6 | Tool reachability | `curl -X POST <backend-url>/vapi/tool-calls -H "X-Vapi-Secret: <secret>" -H "Content-Type: application/json" -d '{"message":{"type":"tool-calls","toolCallList":[{"id":"t1","name":"checkAvailability","arguments":{}}]}}'` | `{"results":[{"toolCallId":"t1","result":"..."}]}` |

## 4. Resolution steps

| Symptom | Fix |
|---|---|
| 401 in backend logs on tool calls | Secret mismatch — update the Vapi credential or the `VAPI_SERVER_SECRET` env var so they match, then redeploy/restart |
| Tool calls never arrive at backend | Vapi tools point at a stale URL (old ngrok URL is the classic cause in dev) — update each tool's `server.url` and the assistant's server URL in Vapi |
| Tools time out (~5s+) | Check Render logs for slow responses; restart the service (Render → Manual Deploy → Restart); tools must respond well under Vapi's timeout |
| Escalation spoken but no dashboard record | Check backend logs for `[tool:escalateToHuman]` — if the tool rejected the payload (missing `transcriptSummary`/`escalationReason`), the LLM under-filled arguments: tighten/restore the "How to escalate" section of the system prompt |
| Agent asks the same failed question 3+ times | Prompt drift — restore the "No-input / no-match handling" section of `assistant/system-prompt.md` verbatim (this behavior is prompt-enforced, see §7) |
| `/demo` won't start a call | Check browser console: missing/wrong `VAPI_PUBLIC_KEY` or `ASSISTANT_ID`, or mic permission denied |
| Backend crash-looping | Render logs → if `db.json` is corrupted, see rollback below |

## 5. Rollback

- **Code:** Render redeploys on push; roll back via Render dashboard → Deploys → "Rollback to
  this deploy" on the last known-good build (or `git revert` + push).
- **Data:** delete `server/data/db.json` and restart — the server re-seeds from
  `seed.ts` automatically. Demo data is disposable by design.
- **Assistant config:** the versioned source of truth is `assistant/` in this repo — re-paste
  `system-prompt.md` and re-check tool schemas against `assistant/tools/*.json` if dashboard
  edits caused a regression.

## 6. Escalation matrix

Illustrative for the demo — in a real engagement, fill with the client's actual contacts/SLAs.

| Level | Who | When | Channel | Response SLA |
|---|---|---|---|---|
| L1 | On-call developer (Guillermo) | Any trigger in §2 | Direct message | 1 business hour |
| L2 | Vapi support | Confirmed platform-side failure (calls not connecting, STT/TTS errors visible in Vapi call logs) | support.vapi.ai | Per Vapi plan |
| L3 | Render support/status | Backend healthy locally but unreachable when deployed | status.render.com → ticket | Per Render plan |

In-call escalation (AI → human) is not an incident — it's the designed behavior documented in
[call-flow.md](call-flow.md).

## 7. Known limitations (deliberate, documented)

- **Retry counting is prompt-enforced.** Vapi has no native "max N no-match attempts" primitive
  like DTMF IVRs; the 2-retry rule lives in the system prompt and is only as reliable as
  LLM instruction-following. The backend compensates by validating every handoff payload
  (rejects escalations without a summary/reason), so a malformed escalation fails loudly
  instead of silently.
- **Handoff field values are LLM-populated.** `transcriptSummary`, `sentiment` and
  `dataCollectedSoFar` are filled by the model from conversation context — the JSON schema
  marks the critical ones as required, and the backend re-validates.
- **Render free tier cold start:** ~30-60s wake-up after 15 min idle. Documented on the demo
  page; not a defect.
- **Web-only demo:** no PSTN number attached (cost decision). The webhook architecture is
  identical with a Twilio number attached in Vapi; nothing in this backend changes.

## 8. Communication templates

**Handoff notification (to front desk / client team):**
> New escalated call — {{urgency}} priority.
> Caller: {{caller.name}} ({{caller.phone}}), {{intent}}.
> Reason: {{escalationReason}}. Summary: "{{transcriptSummary}}"
> Full context: {{dashboard-url}}/handoffs/{{id}} — do not ask the caller to repeat information already listed there.

**Callback opener (for the human agent calling back):**
> "Hi {{caller.name}}, this is Brightside Dental returning your call — I have your details in
> front of me: you were calling about {{reasonForVisit}}. Let's pick up right where you left off."

## 9. Version history

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-07-19 | Initial build: assistant + backend + dashboard + docs |
