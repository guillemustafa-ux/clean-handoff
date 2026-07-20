import { nanoid } from "nanoid";
import { db } from "../db.js";
import type { Handoff, EscalationReason } from "../types.js";

interface EscalateArgs {
  callerName?: string;
  callerPhone?: string;
  existingPatient?: boolean;
  intent?: Handoff["intent"];
  escalationReason?: EscalationReason;
  urgency?: Handoff["urgency"];
  reasonForVisit?: string;
  preferredDate?: string;
  insurance?: string;
  noMatchCount?: number;
  questionsAsked?: string[];
  transcriptSummary?: string;
  sentiment?: Handoff["sentiment"];
}

const VALID_REASONS: EscalationReason[] = [
  "explicit_request",
  "repeated_no_match",
  "negative_sentiment",
  "out_of_domain",
  "emergency"
];

export async function escalateToHuman(args: EscalateArgs, callId: string) {
  if (!args.transcriptSummary || !args.escalationReason) {
    return {
      escalated: false,
      message:
        "escalationReason and transcriptSummary are required. Summarize the call in 1-3 sentences and retry."
    };
  }
  if (!VALID_REASONS.includes(args.escalationReason)) {
    return {
      escalated: false,
      message: `Invalid escalationReason. Use one of: ${VALID_REASONS.join(", ")}.`
    };
  }

  const handoff: Handoff = {
    id: `h_${nanoid(8)}`,
    callId,
    timestamp: new Date().toISOString(),
    caller: {
      name: args.callerName ?? null,
      phone: args.callerPhone ?? null,
      existingPatient: args.existingPatient ?? null
    },
    intent: args.intent ?? "other",
    escalationReason: args.escalationReason,
    urgency: args.urgency ?? (args.escalationReason === "emergency" ? "emergency" : "normal"),
    dataCollectedSoFar: {
      reasonForVisit: args.reasonForVisit ?? null,
      preferredDate: args.preferredDate ?? null,
      insurance: args.insurance ?? null
    },
    attempts: {
      noMatchCount: args.noMatchCount ?? 0,
      questionsAsked: args.questionsAsked ?? []
    },
    transcriptSummary: args.transcriptSummary,
    sentiment: args.sentiment ?? "neutral"
  };

  db.data.handoffs.push(handoff);
  const log = db.data.callLogs.find((l) => l.callId === callId);
  if (log) log.escalated = true;
  await db.write();

  return {
    escalated: true,
    handoffId: handoff.id,
    message:
      handoff.urgency === "emergency"
        ? "Tell the caller: our front desk has been notified as an emergency and will call back within minutes. If it is life-threatening, advise calling 911."
        : "Tell the caller: their request and full context have been passed to the front desk, and someone will call them back shortly. They will not need to repeat anything."
  };
}
