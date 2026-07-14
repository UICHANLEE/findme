import { cleanTeamName, getRoom, teamKey } from "../../../lib/find-data";
import { ensureTables } from "../../../lib/find-db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { teamName?: string; room?: string; action?: string };
    const teamName = cleanTeamName(body.teamName ?? "");
    const teamId = teamKey(teamName);
    const room = getRoom(body.room ?? null);
    if (!room || !["enter", "exit"].includes(body.action ?? "") || teamName.length < 1 || teamName.length > 24) {
      return Response.json({ error: "조 이름은 1~24자로 입력해 주세요." }, { status: 400 });
    }

    const db = await ensureTables();
    const now = new Date().toISOString();
    if (body.action === "enter") {
      await db.batch([
        db.prepare(`INSERT INTO team_state (team_id, team_name, current_room, entered_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(team_id) DO UPDATE SET team_name = excluded.team_name, current_room = excluded.current_room, entered_at = excluded.entered_at, updated_at = excluded.updated_at`)
          .bind(teamId, teamName, room.key, now, now),
        db.prepare("INSERT INTO check_events (team_id, room, action, created_at) VALUES (?, ?, 'enter', ?)").bind(teamId, room.key, now),
      ]);
    } else {
      const existing = await db.prepare("SELECT current_room FROM team_state WHERE team_id = ? AND team_name IS NOT NULL").bind(teamId).first<{ current_room: string | null }>();
      if (!existing) return Response.json({ error: "이 조 이름의 입장 기록을 찾지 못했어요." }, { status: 404 });
      await db.batch([
        db.prepare("UPDATE team_state SET current_room = NULL, entered_at = NULL, updated_at = ? WHERE team_id = ?").bind(now, teamId),
        db.prepare("INSERT INTO check_events (team_id, room, action, created_at) VALUES (?, ?, 'exit', ?)").bind(teamId, room.key, now),
      ]);
    }
    return Response.json({ ok: true, teamId, teamName, room: room.key, action: body.action });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "처리하지 못했습니다." }, { status: 500 });
  }
}
