import { cleanTeamName, rooms, teamKey, type RoomKey, type TalentRecord } from "../../../lib/find-data";
import { getTalentRecords, saveTalentRecord } from "../../../lib/find-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emptyAmounts = () => Object.fromEntries(rooms.map((room) => [room.key, 0])) as Record<RoomKey, number>;

const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

export async function GET(request: Request) {
  try {
    const records = await getTalentRecords();
    const url = new URL(request.url);

    if (url.searchParams.get("format") === "csv") {
      const header = ["조 이름", ...rooms.map((room) => room.name), "합계", "수정 시간"];
      const rows = records
        .slice()
        .sort((a, b) => a.teamName.localeCompare(b.teamName, "ko"))
        .map((record) => {
          const amounts = rooms.map((room) => record.amounts?.[room.key] ?? 0);
          return [record.teamName, ...amounts, amounts.reduce((sum, amount) => sum + amount, 0), record.updatedAt];
        });
      const csv = `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}`;
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="FIND-IT-talents.csv"',
        },
      });
    }

    return Response.json({ records, timestamp: new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "달란트 현황을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { teamName?: string; amounts?: Partial<Record<RoomKey, number>> };
    const teamName = cleanTeamName(body.teamName ?? "");
    if (!teamName) return Response.json({ error: "조 이름이 필요합니다." }, { status: 400 });

    const amounts = emptyAmounts();
    for (const room of rooms) {
      const value = body.amounts?.[room.key] ?? 0;
      if (!Number.isInteger(value) || value < 0 || value > 999) {
        return Response.json({ error: "달란트는 방마다 0~999 사이의 정수로 입력해 주세요." }, { status: 400 });
      }
      amounts[room.key] = value;
    }

    const record: TalentRecord = {
      teamId: teamKey(teamName),
      teamName,
      amounts,
      updatedAt: new Date().toISOString(),
    };
    await saveTalentRecord(record);
    return Response.json({ ok: true, record });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "달란트 현황을 저장하지 못했습니다." }, { status: 500 });
  }
}
