"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getRoom, teams } from "../../lib/find-data";

export default function ScanPage() {
  const params = useSearchParams();
  const router = useRouter();
  const room = getRoom(params.get("room"));
  const action = params.get("action") === "exit" ? "exit" : "enter";
  const [teamId, setTeamId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setTeamId(localStorage.getItem("find-team") || ""), []);

  if (!room) return <main className="scan-error"><h1>유효하지 않은 QR이에요.</h1><a href="/">처음으로 돌아가기</a></main>;

  const submit = async () => {
    if (!teamId) return setError("먼저 조를 선택해 주세요.");
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamId, room: room.key, action }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "처리하지 못했습니다.");
      localStorage.setItem("find-team", teamId);
      router.replace(action === "enter" ? `/room/${room.key}?team=${teamId}&welcome=1` : `/?team=${teamId}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "잠시 후 다시 시도해 주세요."); setBusy(false); }
  };

  return (
    <main className="scan-shell" style={{ "--accent": room.color, "--soft": room.soft } as React.CSSProperties}>
      <div className="scan-orbit"><span>{room.mark}</span></div>
      <section className="scan-panel">
        <div className="eyebrow"><i /> QR CHECK {action === "enter" ? "IN" : "OUT"}</div>
        <div className="scan-action">{action === "enter" ? "입장" : "퇴장"}</div>
        <h1>{room.name}</h1>
        <p>{room.location} · {action === "enter" ? "새로운 발견을 시작해요" : "다음 발견을 향해 이동해요"}</p>
        <label className="scan-select"><span>우리 조를 확인해 주세요</span><select value={teamId} onChange={(event) => setTeamId(event.target.value)}><option value="">조 선택</option>{teams.map((team) => <option value={team.id} key={team.id}>{team.label}</option>)}</select></label>
        {error && <div className="form-error">{error}</div>}
        <button onClick={submit} disabled={busy}>{busy ? "확인하고 있어요…" : `${action === "enter" ? "함께 입장하기" : "함께 퇴장하기"} →`}</button>
        <small>조장 한 명만 진행하면 조원 모두에게 반영됩니다.</small>
      </section>
    </main>
  );
}
