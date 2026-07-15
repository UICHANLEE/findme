import { getActivityLogs } from "../../../lib/find-store";
import { rooms } from "../../../lib/find-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const logs = await getActivityLogs();
    const url = new URL(request.url);
    if (url.searchParams.get("format") === "csv") {
      const teamId = url.searchParams.get("team") ?? "all";
      const target = teamId === "all" ? logs : logs.filter((log) => log.teamId === teamId);
      const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
      const durationLabel = (seconds: number | null) => seconds === null ? "-" : seconds < 60 ? `${seconds}초` : `${Math.floor(seconds / 60)}분 ${seconds % 60}초`;
      const rows = [
        ["조 이름", "동작", "방", "장소", "시간", "체류시간(초)", "체류시간"],
        ...target.map((log) => {
          const room = rooms.find((item) => item.key === log.room);
          return [log.teamName, log.action === "enter" ? "입장" : "퇴장", room?.name ?? log.room, room?.location ?? "", new Date(log.timestamp).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }), log.durationSeconds ?? "", durationLabel(log.durationSeconds)];
        }),
      ];
      const csv = `\uFEFF${rows.map((row) => row.map(escape).join(",")).join("\r\n")}`;
      return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=FIND-IT-activity-logs.csv", "Cache-Control": "no-store" } });
    }
    return Response.json({ logs, timestamp: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "활동 로그를 불러오지 못했습니다." }, { status: 500 });
  }
}
