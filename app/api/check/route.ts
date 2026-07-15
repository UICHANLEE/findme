import { cleanTeamName, getRoom, teamKey, type TeamState } from "../../../lib/find-data";
import { appendActivityLog, getTeamStates, saveTeamState } from "../../../lib/find-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { teamName?: string; room?: string; action?: string };
    const teamName = cleanTeamName(body.teamName ?? "");
    const teamId = teamKey(teamName);
    const room = getRoom(body.room ?? null);
    if (!room || !["enter", "exit"].includes(body.action ?? "") || teamName.length < 1 || teamName.length > 24) {
      return Response.json({ error: "조 이름은 1~24자로 입력해 주세요." }, { status: 400 });
    }

    const states = await getTeamStates();
    const existing = states.find((state) => state.teamId === teamId);
    if (body.action === "exit" && !existing) {
      return Response.json({ error: "이 조 이름의 입장 기록을 찾지 못했어요." }, { status: 404 });
    }
    if (body.action === "enter") {
      const otherTeamsInside = states.filter((state) => state.currentRoom === room.key && state.teamId !== teamId).length;
      if (otherTeamsInside >= room.maxTeams) {
        return Response.json({
          code: "ROOM_FULL",
          error: `${room.name}은 현재 입장 가능한 조가 모두 찼어요. 다른 방을 찾아가세요!!`,
          room: room.key,
          maxTeams: room.maxTeams,
        }, { status: 409 });
      }
    }

    const now = new Date().toISOString();
    const previousCompleted = existing?.completedRooms ?? [];
    const collectedNow = body.action === "exit" && !previousCompleted.includes(room.key);
    const completedRooms = collectedNow ? [...previousCompleted, room.key] : previousCompleted;
    const next: TeamState = {
      teamId,
      teamName,
      currentRoom: body.action === "enter" ? room.key : null,
      enteredAt: body.action === "enter" ? now : null,
      updatedAt: now,
      completedRooms,
    };
    await saveTeamState(next);
    const durationSeconds = body.action === "exit" && existing?.enteredAt
      ? Math.max(0, Math.floor((new Date(now).getTime() - new Date(existing.enteredAt).getTime()) / 1000))
      : null;
    try {
      await appendActivityLog({
        id: crypto.randomUUID(),
        teamId,
        teamName,
        room: room.key,
        action: body.action as "enter" | "exit",
        timestamp: now,
        durationSeconds,
      });
    } catch { /* live room state remains the priority if log persistence is temporarily unavailable */ }
    return Response.json({
      ok: true,
      teamId,
      teamName,
      room: room.key,
      action: body.action,
      collectedRoom: collectedNow ? room.key : null,
      completedRooms,
      journeyComplete: completedRooms.length === 5,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "처리하지 못했습니다." }, { status: 500 });
  }
}
