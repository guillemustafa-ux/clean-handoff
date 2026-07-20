import type { Request, Response, NextFunction } from "express";
import { VAPI_SERVER_SECRET } from "../config.js";

// Vapi sends the configured credential either as "X-Vapi-Secret: <secret>"
// (legacy) or "Authorization: Bearer <secret>", depending on how the
// credential is set up in the dashboard. Accept both against the same value.
export function verifyVapiSecret(req: Request, res: Response, next: NextFunction): void {
  if (!VAPI_SERVER_SECRET) {
    next();
    return;
  }
  const legacy = req.header("x-vapi-secret");
  const bearer = (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
  if (legacy === VAPI_SERVER_SECRET || bearer === VAPI_SERVER_SECRET) {
    next();
    return;
  }
  res.status(401).json({ error: "invalid or missing server secret" });
}
