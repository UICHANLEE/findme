import { type RoomKey, type TeamState } from "../../../lib/find-data";
import { ensureTables } from "../../../lib/find-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await ensureTables();
    const result = await db.prepare(`SELECT team_id, team_name, current_room, entered_at, updated_at
      FROM team_state WHERE team_name IS NOT NULL ORDER BY updated_at DESC`).all<{
      team_id: string; team_name: string; current_room: RoomKey | null; entered_at: string | null; updated_at: string;
    }>();
    const states: TeamState[] = result.results.map((row) => ({
      teamId: row.team_id,
      teamName: row.team_name,
      currentRoom: row.current_room,
      enteredAt: row.entered_at,
      updatedAt: row.updated_at,
    }));
    return Response.json({ states, timestamp: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "현황을 불러오지 못했습니다." }, { status: 500 });
  }
}
