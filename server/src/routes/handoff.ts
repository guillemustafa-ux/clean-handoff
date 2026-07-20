import { Router } from "express";
import { nanoid } from "nanoid";
import { db } from "../db.js";
import type { Handoff } from "../types.js";

export const handoff = Router();

// Direct REST write (curl-testable without Vapi). The voice path writes
// through the escalateToHuman tool instead.
handoff.post("/handoff", async (req, res) => {
  const b = req.body ?? {};
  if (!b.escalationReason || !b.transcriptSummary) {
    res.status(400).json({ error: "escalationReason and transcriptSummary are required" });
    return;
  }
  const record: Handoff = {
    id: `h_${nanoid(8)}`,
    callId: b.callId ?? "manual",
    timestamp: new Date().toISOString(),
    caller: {
      name: b.caller?.name ?? null,
      phone: b.caller?.phone ?? null,
      existingPatient: b.caller?.existingPatient ?? null
    },
    intent: b.intent ?? "other",
    escalationReason: b.escalationReason,
    urgency: b.urgency ?? "normal",
    dataCollectedSoFar: {
      reasonForVisit: b.dataCollectedSoFar?.reasonForVisit ?? null,
      preferredDate: b.dataCollectedSoFar?.preferredDate ?? null,
      insurance: b.dataCollectedSoFar?.insurance ?? null
    },
    attempts: {
      noMatchCount: b.attempts?.noMatchCount ?? 0,
      questionsAsked: b.attempts?.questionsAsked ?? []
    },
    transcriptSummary: b.transcriptSummary,
    sentiment: b.sentiment ?? "neutral"
  };
  db.data.handoffs.push(record);
  await db.write();
  res.status(201).json(record);
});

handoff.get("/handoffs", (_req, res) => {
  res.json([...db.data.handoffs].reverse());
});

handoff.get("/handoffs/:id", (req, res) => {
  const record = db.data.handoffs.find((h) => h.id === req.params.id);
  if (!record) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(record);
});

handoff.get("/calls", (_req, res) => {
  res.json([...db.data.callLogs].reverse());
});
