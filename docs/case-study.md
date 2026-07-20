# Case study — clean-handoff

> Reusable copy for Upwork. Three formats below: full case study (repo/README/interviews),
> cover-letter block (paste into proposals, target ~1000-1500 chars, hard limit 5000),
> and portfolio item (title ≤70 chars, description ≤600 chars). Replace `[DEMO-URL]`
> with the live Render URL after deploy.

---

## Full case study

**Problem.** Voice-AI agents fail hardest at the moment they hand a call to a human: most
builds either transfer cold (the caller repeats everything) or dump an unstructured transcript
the human never reads. Contact-center clients on Upwork explicitly ask for fallback handling,
escalation logic, and "warm handoff" — and for proof: call-flow diagrams, runbooks, working
demos.

**What I built.** `clean-handoff` is a production-style AI front desk for a dental clinic,
built hands-on on **Vapi** with a **Node.js/TypeScript/Express** backend acting as the CRM:

- **Mid-call webhook integration (custom tools):** the agent checks real availability, books
  appointments, looks up existing patients and writes leads back to the CRM live during the
  call — never inventing data. Synchronous tool calls under Vapi's timeout budget, secured
  with a server secret.
- **Post-call write-back:** Vapi's `end-of-call-report` webhook logs every call's summary,
  outcome and call ID — the standard CRM write-back pattern, demonstrated even for calls that
  never escalate.
- **Layered fallback:** low-confidence transcripts filtered at the platform layer
  (`confidenceThreshold`), max 2 retries per question enforced in the prompt layer, and an
  escape phrase ("talk to a person") honored at any point.
- **The core feature — structured warm handoff:** on any of five escalation triggers
  (explicit request, repeated no-match, negative sentiment, emergency, out-of-domain), the
  agent calls an `escalateToHuman` tool whose JSON schema *requires* structured context:
  caller identity, intent, escalation reason, urgency, every field collected so far, retry
  count, sentiment, and a 1-3 sentence summary written for the receiving agent. The backend
  validates and rejects under-filled payloads. A live dashboard renders each handoff as a
  card — the human picks up the call without asking the caller to repeat anything.

**Deliverables.** Live browser demo (no phone number needed), front-desk dashboard,
[call-flow diagram](call-flow.md) (Mermaid, all escalation paths), [operational
runbook](runbook.md) (diagnostics, resolution, rollback, escalation matrix, comms templates),
and full setup docs. Web-only by cost decision; the same assistant attaches to a Twilio
number with zero backend changes.

**Stack.** Vapi (assistant, custom tools, server events) · Node.js · TypeScript · Express ·
lowdb · Vapi Web SDK · Render.

---

## Cover-letter block (paste-ready)

```text
A concrete example of my hands-on voice-AI work: clean-handoff
(github.com/guillemustafa-ux/clean-handoff) — a production-style AI receptionist
for a dental clinic, built on Vapi with a Node/TypeScript backend.

The agent handles scheduling, new-patient intake and triage over voice. Mid-call
it hits my backend through webhook custom tools (availability lookup, booking,
patient lookup, CRM lead write-back), and a post-call webhook logs every call's
summary and outcome. The part most voice builds get wrong — and the reason for
the project's name — is escalation: when a caller asks for a human, fails the
same question twice, gets frustrated, or reports an emergency, the agent hands
off a structured context payload (caller identity, intent, escalation reason,
urgency, data collected so far, retry count, sentiment, and a short summary
written for the receiving agent) instead of free-form notes. The human picks up
without asking the caller to repeat anything, and a live dashboard shows every
handoff. The repo includes the call-flow diagram, an operational runbook, and
full setup docs.

Live demo (browser mic, no phone needed): [DEMO-URL]
```

Character count: **1.149** (con el placeholder `[DEMO-URL]` incluido; la URL real de Render
suma ~30 más) — dentro de la meta de 1000-1500 y lejos del tope de 5000. Ojo: repo + demo
son 2 links — el máximo permitido por propuesta.

---

## Portfolio item

**Título** (≤70):

```text
Voice AI Agent with Structured Human Handoff — Vapi + Node/TS
```

Character count: **61** ✓

**Descripción** (≤600):

```text
AI voice receptionist for a dental clinic, built on Vapi with a Node/TypeScript
backend. Handles scheduling, new-patient intake and triage; integrates with a
CRM mid-call via webhook tools (availability, booking, lead write-back) plus
post-call reporting. Core feature: clean escalation to humans — on explicit
request, repeated no-match, frustration or emergency, the agent hands off a
structured context payload (intent, urgency, data collected, sentiment, summary)
so callers never repeat themselves. Includes live demo, dashboard, call-flow
diagram and operational runbook.
```

Character count: **577** ✓
