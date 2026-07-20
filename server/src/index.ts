import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PORT } from "./config.js";
import { initDb } from "./db.js";
import { crm } from "./routes/crm.js";
import { handoff } from "./routes/handoff.js";
import { vapiToolCalls } from "./routes/vapiToolCalls.js";
import { vapiEvents } from "./routes/vapiEvents.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true, service: "clean-handoff" }));

app.use(crm);
app.use(handoff);
app.use(vapiToolCalls);
app.use(vapiEvents);

app.get("/demo", (_req, res) => res.sendFile(path.join(publicDir, "demo.html")));
app.get("/dashboard", (_req, res) => res.sendFile(path.join(publicDir, "dashboard.html")));
app.get("/", (_req, res) => res.redirect("/demo"));

await initDb();
app.listen(PORT, () => {
  console.log(`clean-handoff server listening on http://localhost:${PORT}`);
});
