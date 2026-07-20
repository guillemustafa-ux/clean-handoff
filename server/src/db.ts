import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { DbData } from "./types.js";
import { seedData } from "./data/seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../data");
const dbFile = path.join(dataDir, "db.json");

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const adapter = new JSONFile<DbData>(dbFile);
export const db = new Low<DbData>(adapter, seedData());

export async function initDb(): Promise<void> {
  await db.read();
  if (!db.data || !db.data.contacts) {
    db.data = seedData();
    await db.write();
  }
}
