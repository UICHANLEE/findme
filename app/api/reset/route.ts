import { clearActivityLogs, clearTeamStates } from "../../../lib/find-store";

export const runtime = "nodejs";

export async function POST() {
  try {
    await Promise.all([clearTeamStates(), clearActivityLogs()]);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "초기화하지 못했습니다." }, { status: 500 });
  }
}
