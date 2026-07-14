import { ensureTables } from "../../../lib/find-db";

export async function POST() {
  try {
    const db = await ensureTables();
    await db.batch([
      db.prepare("DELETE FROM team_state"),
      db.prepare("DELETE FROM check_events"),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "초기화하지 못했습니다." }, { status: 500 });
  }
}
