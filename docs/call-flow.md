# Call flow — Brightside Dental front-desk voice agent

This diagram covers the full inbound call flow, including the no-match retry loop and every
escalation path. Escalation always goes through the `escalateToHuman` tool, which writes a
structured handoff payload to the mock CRM (`POST /vapi/tool-calls` → `Handoff` record) before
the call ends — that payload is what the human agent sees on the [dashboard](../server/public/dashboard.html).

```mermaid
flowchart TD
    A([Call starts]) --> B["Greeting<br/>+ mention escape phrase:<br/>'you can ask for a person at any time'"]
    B --> C{Intent detection}

    C -->|booking| D1["Collect: name → phone →<br/>new/existing → reason → preferred date"]
    C -->|existing patient question| D2["Collect phone<br/>→ lookupPatient 🔧"]
    C -->|emergency keywords<br/>severe pain / bleeding / swelling| E1
    C -->|out of domain<br/>billing dispute / legal / complaint| E2["escalateToHuman 🔧<br/>reason: out_of_domain"]
    C -->|caller asks for a person<br/>at ANY point in the call| E3["escalateToHuman 🔧<br/>reason: explicit_request"]

    D1 --> F["checkAvailability 🔧"]
    F -->|slots available| G["Offer slots →<br/>confirm all data back to caller"]
    F -->|no slots| D1
    G --> H["bookAppointment 🔧"]
    H -->|booked: true| I["Speak confirmation"]
    H -->|slot taken / error| F

    D2 -->|found| J["Answer question<br/>or createLead 🔧 for follow-up"]
    D2 -->|not found| K

    subgraph RETRY ["No-match retry loop (any question)"]
        K["Didn't understand /<br/>answer doesn't fit"] --> L{"attempt count<br/>on same question"}
        L -->|1st failure| M["Re-ask + remind<br/>escape phrase"]
        M --> K
        L -->|2nd failure| E4["escalateToHuman 🔧<br/>reason: repeated_no_match<br/>noMatchCount: 2"]
    end

    C -->|caller clearly frustrated / angry| E5["escalateToHuman 🔧<br/>reason: negative_sentiment"]

    E1["Collect only name + phone<br/>(skip normal scheduling)"] --> E1b["escalateToHuman 🔧<br/>reason: emergency<br/>urgency: emergency<br/>+ advise 911 if life-threatening"]

    E1b --> P
    E2 --> P
    E3 --> P
    E4 --> P
    E5 --> P

    P["Structured handoff payload written:<br/>caller · intent · reason · urgency ·<br/>data collected · retries · summary · sentiment"] --> Q["Relay handoff message to caller:<br/>'someone will call you back —<br/>you won't need to repeat anything'"]

    I --> R([End call])
    J --> R
    Q --> R
    R --> S["end-of-call-report webhook →<br/>CallLog written (summary, outcome,<br/>escalated flag) — post-call write-back"]

    style E1b fill:#dc2626,color:#fff
    style E2 fill:#d97706,color:#fff
    style E3 fill:#d97706,color:#fff
    style E4 fill:#d97706,color:#fff
    style E5 fill:#d97706,color:#fff
    style P fill:#2563eb,color:#fff
    style S fill:#64748b,color:#fff
```

🔧 = mid-call synchronous tool call (webhook to the backend, `POST /vapi/tool-calls`).

## Walkthrough: happy path (booking)

1. Caller: "Hi, I'd like to book a cleaning."
2. Agent collects name, phone, patient type, reason, preferred date — one question at a time.
3. Agent calls `checkAvailability` (never invents times), offers real open slots.
4. Caller picks a slot; agent confirms **all** collected data back before booking.
5. Agent calls `bookAppointment`; on `booked: true`, speaks the confirmation and ends the call.
6. After hangup, Vapi fires `end-of-call-report` → backend writes a `CallLog` (post-call
   CRM write-back: summary, outcome, call id, escalated=false).

## Walkthrough: escalated path (repeated no-match)

1. Caller answers the "preferred date" question with something unintelligible.
2. Agent: "Sorry, I didn't catch that — could you say the date again? You can also just say
   'talk to a person' at any time." *(retry 1 + escape phrase reminder)*
3. Second unintelligible answer → agent does **not** ask a third time. It calls
   `escalateToHuman` with `reason: repeated_no_match`, `noMatchCount: 2`, plus everything
   already collected (name, phone, reason for visit) and a 1-3 sentence summary written for
   the human agent.
4. Backend validates and stores the structured `Handoff`; the dashboard shows it instantly.
5. Agent tells the caller a human will call back and that **they won't need to repeat
   anything** — that promise is the entire point of the structured payload.

## Design rules encoded in this flow

| Rule | Where it lives |
|---|---|
| Max 2 retries per question, then escalate | System prompt (`assistant/system-prompt.md`) — Vapi has no native retry counter, so this is prompt-enforced (see runbook, "known limitations") |
| Low-confidence transcripts filtered before the LLM | `transcriber.confidenceThreshold: 0.4` in `assistant-config.json` |
| Escape phrase always available | Mentioned at greeting + after first failed retry |
| Emergency skips normal flow | System prompt: collect only name+phone, escalate with `urgency: emergency` |
| Handoff is structured, never free-form | `escalateToHuman` JSON schema (`assistant/tools/escalate-to-human.json`) marks `escalationReason`, `intent`, `urgency`, `transcriptSummary`, `sentiment` as **required**; backend rejects payloads without a summary |
| No invented availability / bookings | System prompt tool rules + backend guards (slot must exist and be unbooked) |
