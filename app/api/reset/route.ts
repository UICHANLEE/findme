import { ensureTables } from "../../../lib/find-db";

export async function POST() {
  try {
    const db = await ensureTables();
    await db.prepare("UPDATE team_state SET current_room = NULL, entered_at = NULL, updated_at = ?").bind(new Date().toISOString()).run();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "초기화하지 못했습니다." }, { status: 500 });
  }
}
