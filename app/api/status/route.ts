import { rooms, type RoomKey, type RoomLiveStatus } from "../../../lib/find-data";
import { getTeamStates } from "../../../lib/find-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const states = await getTeamStates();
    const roomStatuses = Object.fromEntries(rooms.map((room) => {
      const insideCount = states.filter((state) => state.currentRoom === room.key).length;
      const status: RoomLiveStatus = {
        room: room.key,
        insideCount,
        maxTeams: room.maxTeams,
        availableSlots: Math.max(0, room.maxTeams - insideCount),
        isFull: insideCount >= room.maxTeams,
      };
      return [room.key, status];
    })) as Record<RoomKey, RoomLiveStatus>;

    return Response.json(
      { states, roomStatuses, timestamp: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "현황을 불러오지 못했습니다." }, { status: 500 });
  }
}
