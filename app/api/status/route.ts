import { teams, type RoomKey, type TeamState } from "../../../lib/find-data";
import { ensureTables } from "../../../lib/find-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await ensureTables();
    const result = await db.prepare("SELECT team_id, current_room, entered_at, updated_at FROM team_state").all<{
      team_id: string; current_room: RoomKey | null; entered_at: string | null; updated_at: string;
    }>();
    const byTeam = new Map(result.results.map((row) => [row.team_id, row]));
    const states: TeamState[] = teams.map((team) => {
      const row = byTeam.get(team.id);
      return { teamId: team.id, currentRoom: row?.current_room ?? null, enteredAt: row?.entered_at ?? null, updatedAt: row?.updated_at ?? null };
    });
    return Response.json({ states, timestamp: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "현황을 불러오지 못했습니다." }, { status: 500 });
  }
}
