import { Router } from "express";
import { verifyVapiSecret } from "../middleware/verifyVapiSecret.js";
import { lookupPatient } from "../tools/lookupPatient.js";
import { checkAvailability } from "../tools/checkAvailability.js";
import { bookAppointment } from "../tools/bookAppointment.js";
import { createLead } from "../tools/createLead.js";
import { escalateToHuman } from "../tools/escalateToHuman.js";

export const vapiToolCalls = Router();

// Vapi mid-call custom tool webhook.
// Request:  { message: { type: "tool-calls", toolCallList: [{ id, name, arguments }], call?: { id } } }
// Response: { results: [{ toolCallId, result }] }
vapiToolCalls.post("/vapi/tool-calls", verifyVapiSecret, async (req, res) => {
  const message = req.body?.message;
  if (message?.type !== "tool-calls" || !Array.isArray(message.toolCallList)) {
    res.status(400).json({ error: "expected message.type 'tool-calls' with toolCallList" });
    return;
  }

  const callId: string = message.call?.id ?? "unknown-call";
  const results = [];

  for (const toolCall of message.toolCallList) {
    // Vapi has sent arguments both as an object and as a JSON string across versions.
    let args = toolCall.arguments ?? toolCall.function?.arguments ?? {};
    if (typeof args === "string") {
      try {
        args = JSON.parse(args);
      } catch {
        args = {};
      }
    }
    const name: string = toolCall.name ?? toolCall.function?.name ?? "";

    let result: unknown;
    try {
      switch (name) {
        case "lookupPatient":
          result = await lookupPatient(args);
          break;
        case "checkAvailability":
          result = await checkAvailability(args);
          break;
        case "bookAppointment":
          result = await bookAppointment(args);
          break;
        case "createLead":
          result = await createLead(args);
          break;
        case "escalateToHuman":
          result = await escalateToHuman(args, callId);
          break;
        default:
          result = { error: `Unknown tool: ${name}` };
      }
    } catch (err) {
      console.error(`[tool:${name}]`, err);
      result = { error: "Internal error handling the tool call. Apologize and offer to escalate." };
    }

    console.log(`[tool:${name}] call=${callId}`, JSON.stringify(result));
    results.push({ toolCallId: toolCall.id, result: JSON.stringify(result) });
  }

  res.json({ results });
});
