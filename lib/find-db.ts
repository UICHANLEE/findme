import { env } from "cloudflare:workers";

export async function ensureTables() {
  const db = env.DB;
  if (!db) throw new Error("DB binding is unavailable");
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS team_state (
      team_id TEXT PRIMARY KEY,
      current_room TEXT,
      entered_at TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS check_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id TEXT NOT NULL,
      room TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
  ]);
  return db;
}
