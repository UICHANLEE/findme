import { cleanTeamName, getRoom, rooms, teamKey } from "../../../lib/find-data";
import { transitionTeam } from "../../../lib/find-store";

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

    const action = body.action as "enter" | "exit";
    const result = await transitionTeam({ teamId, teamName, room: room.key, action, maxTeams: room.maxTeams });
    const existing = result.state;

    if (result.code === "TEAM_NOT_FOUND") {
      return Response.json({ error: "이 조 이름의 입장 기록을 찾지 못했어요." }, { status: 404 });
    }
    if (result.code === "IDEMPOTENT" && existing) {
      return Response.json({
        ok: true,
        teamId: existing.teamId,
        teamName: existing.teamName,
        room: room.key,
        action,
        collectedRoom: null,
        completedRooms: existing.completedRooms ?? [],
        journeyComplete: rooms.every((item) => existing.completedRooms?.includes(item.key)),
        state: existing,
        idempotent: true,
      });
    }
    if (result.code === "ALREADY_IN_ROOM" && existing?.currentRoom) {
      const currentRoom = getRoom(existing.currentRoom);
      return Response.json({
        code: "ALREADY_IN_ROOM",
        error: `${currentRoom?.name ?? "다른 방"}에서 먼저 퇴장한 뒤 입장해 주세요.`,
        room: room.key,
        currentRoom: existing.currentRoom,
      }, { status: 409 });
    }
    if (result.code === "ROOM_FULL") {
      return Response.json({
        code: "ROOM_FULL",
        error: `${room.name}은 현재 입장 가능한 조가 모두 찼어요. 다른 방을 찾아가세요!!`,
        room: room.key,
        maxTeams: room.maxTeams,
      }, { status: 409 });
    }
    if (result.code === "NOT_IN_ROOM") {
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
    if (result.code !== "OK" || !existing) throw new Error(`알 수 없는 입·퇴장 처리 결과: ${result.code}`);

    const completedRooms = existing.completedRooms ?? [];
    return Response.json({
      ok: true,
      teamId,
      teamName,
      room: room.key,
      action,
      // 같은 방의 출구 QR을 다시 찍어도 수집·완성 모션은 최초 한 번만 재생한다.
      collectedRoom: result.collectedRoom,
      completedRooms,
      journeyComplete: rooms.every((item) => completedRooms.includes(item.key)),
      state: existing,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "처리하지 못했습니다." }, { status: 500 });
  }
}
