import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error("DATABASE_URL이 없습니다. Neon 연결 문자열을 .env.local 또는 Vercel 환경변수에 설정해 주세요.");
}

const migrationUrl = new URL("../migrations/001_find_it.sql", import.meta.url);
const source = await readFile(fileURLToPath(migrationUrl), "utf8");
const statements = source
  .split("-- statement-breakpoint")
  .map((statement) => statement.trim())
  .filter(Boolean);

const sql = neon(databaseUrl);
await sql.transaction((transaction) => statements.map((statement) => transaction.query(statement)));

console.log(`FIND IT Neon migration complete (${statements.length} statements)`);
