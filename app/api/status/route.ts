import { getTeamStates } from "../../../lib/find-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const states = await getTeamStates();
    return Response.json({ states, timestamp: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "현황을 불러오지 못했습니다." }, { status: 500 });
  }
}
