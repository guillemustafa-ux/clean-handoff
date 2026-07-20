import { Router } from "express";
import { nanoid } from "nanoid";
import { verifyVapiSecret } from "../middleware/verifyVapiSecret.js";
import { db } from "../db.js";

export const vapiEvents = Router();

// Vapi server events (post-call write-back path).
// Handles "end-of-call-report"; other event types are logged and acked.
vapiEvents.post("/vapi/events", verifyVapiSecret, async (req, res) => {
  const message = req.body?.message;
  if (!message?.type) {
    res.status(400).json({ error: "expected message.type" });
    return;
  }

  if (message.type === "end-of-call-report") {
    const callId: string = message.call?.id ?? "unknown-call";
    const existing = db.data.callLogs.find((l) => l.callId === callId);
    const summary: string | null = message.analysis?.summary ?? message.summary ?? null;
    const endedReason: string | null = message.endedReason ?? null;
    const escalated = db.data.handoffs.some((h) => h.callId === callId);

    if (existing) {
      existing.endedAt = message.endedAt ?? new Date().toISOString();
      existing.summary = summary;
      existing.outcome = endedReason;
      existing.escalated = existing.escalated || escalated;
    } else {
      db.data.callLogs.push({
        id: `l_${nanoid(8)}`,
        callId,
        startedAt: message.startedAt ?? null,
        endedAt: message.endedAt ?? new Date().toISOString(),
        summary,
        outcome: endedReason,
        escalated
      });
    }
    await db.write();
    console.log(`[event:end-of-call-report] call=${callId} escalated=${escalated}`);
  } else {
    console.log(`[event:${message.type}] received`);
  }

  res.json({ received: true });
});
