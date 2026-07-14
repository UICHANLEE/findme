import { getRoom, getTeam } from "../../../lib/find-data";
import { ensureTables } from "../../../lib/find-db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { teamId?: string; room?: string; action?: string };
    const team = getTeam(body.teamId ?? null);
    const room = getRoom(body.room ?? null);
    if (!team || !room || !["enter", "exit"].includes(body.action ?? "")) {
      return Response.json({ error: "올바르지 않은 QR 또는 조입니다." }, { status: 400 });
    }

    const db = await ensureTables();
    const now = new Date().toISOString();
    if (body.action === "enter") {
      await db.batch([
        db.prepare(`INSERT INTO team_state (team_id, current_room, entered_at, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(team_id) DO UPDATE SET current_room = excluded.current_room, entered_at = excluded.entered_at, updated_at = excluded.updated_at`)
          .bind(team.id, room.key, now, now),
        db.prepare("INSERT INTO check_events (team_id, room, action, created_at) VALUES (?, ?, 'enter', ?)").bind(team.id, room.key, now),
      ]);
    } else {
      await db.batch([
        db.prepare(`INSERT INTO team_state (team_id, current_room, entered_at, updated_at)
          VALUES (?, NULL, NULL, ?)
          ON CONFLICT(team_id) DO UPDATE SET current_room = NULL, entered_at = NULL, updated_at = excluded.updated_at`)
          .bind(team.id, now),
        db.prepare("INSERT INTO check_events (team_id, room, action, created_at) VALUES (?, ?, 'exit', ?)").bind(team.id, room.key, now),
      ]);
    }
    return Response.json({ ok: true, teamId: team.id, room: room.key, action: body.action });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "처리하지 못했습니다." }, { status: 500 });
  }
}
