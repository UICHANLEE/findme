import { cleanTeamName, getRoom, teamKey, type TeamState } from "../../../lib/find-data";
import { getTeamStates, saveTeamState } from "../../../lib/find-store";

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

    const now = new Date().toISOString();
    const next: TeamState = {
      teamId,
      teamName,
      currentRoom: body.action === "enter" ? room.key : null,
      enteredAt: body.action === "enter" ? now : null,
      updatedAt: now,
    };
    await saveTeamState(next);
    return Response.json({ ok: true, teamId, teamName, room: room.key, action: body.action });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "처리하지 못했습니다." }, { status: 500 });
  }
}
