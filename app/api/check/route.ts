import { cleanTeamName, getRoom, rooms, teamKey, type TeamState } from "../../../lib/find-data";
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
      if (existing?.currentRoom === room.key) {
        return Response.json({
          ok: true,
          teamId: existing.teamId,
          teamName: existing.teamName,
          room: room.key,
          action: body.action,
          collectedRoom: null,
          completedRooms: existing.completedRooms ?? [],
          journeyComplete: rooms.every((item) => existing.completedRooms?.includes(item.key)),
          state: existing,
          idempotent: true,
        });
      }
      if (existing?.currentRoom) {
        const currentRoom = getRoom(existing.currentRoom);
        return Response.json({
          code: "ALREADY_IN_ROOM",
          error: `${currentRoom?.name ?? "다른 방"}에서 먼저 퇴장한 뒤 입장해 주세요.`,
          room: room.key,
          currentRoom: existing.currentRoom,
        }, { status: 409 });
      }
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
    if (body.action === "exit" && existing?.currentRoom !== room.key) {
      const currentRoom = existing?.currentRoom ? getRoom(existing.currentRoom) : null;
      return Response.json({
        code: "NOT_IN_ROOM",
        error: currentRoom
          ? `현재 ${currentRoom.name}에 입장 중이에요. 해당 방의 출구 QR을 확인해 주세요.`
          : "현재 입장 중인 방이 없어요. 출구 QR을 다시 확인해 주세요.",
        room: room.key,
        currentRoom: existing?.currentRoom ?? null,
      }, { status: 409 });
    }

    const now = new Date().toISOString();
    const previousCompleted = existing?.completedRooms ?? [];
    const collectedNow = body.action === "exit" && !previousCompleted.includes(room.key);
    const completedRooms = collectedNow ? [...previousCompleted, room.key] : previousCompleted;
    const durationSeconds = body.action === "exit" && existing?.enteredAt
      ? Math.max(0, Math.floor((new Date(now).getTime() - new Date(existing.enteredAt).getTime()) / 1000))
      : null;
    const next: TeamState = {
      teamId,
      teamName,
      currentRoom: body.action === "enter" ? room.key : null,
      enteredAt: body.action === "enter" ? now : null,
      updatedAt: now,
      completedRooms,
      previousRoom: body.action === "exit" ? room.key : existing?.previousRoom ?? null,
      previousRoomExitedAt: body.action === "exit" ? now : existing?.previousRoomExitedAt ?? null,
      previousRoomDurationSeconds: body.action === "exit"
        ? durationSeconds
        : existing?.previousRoomDurationSeconds ?? null,
    };
    await saveTeamState(next);
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
      // 같은 방의 출구 QR을 다시 찍어도 수집·완성 모션은 최초 한 번만 재생한다.
      collectedRoom: collectedNow ? room.key : null,
      completedRooms,
      journeyComplete: rooms.every((item) => completedRooms.includes(item.key)),
      state: next,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "처리하지 못했습니다." }, { status: 500 });
  }
}
