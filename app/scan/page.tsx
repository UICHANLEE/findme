"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cleanTeamName, getRoom } from "../../lib/find-data";

export default function ScanPage() {
  return <Suspense fallback={<main className="scan-shell" />}><ScanContent /></Suspense>;
}

function ScanContent() {
  const params = useSearchParams();
  const router = useRouter();
  const room = getRoom(params.get("room"));
  const action = params.get("action") === "exit" ? "exit" : "enter";
  const [teamName, setTeamName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setTeamName(localStorage.getItem("find-team") || ""), []);

  if (!room) return <main className="scan-error"><h1>유효하지 않은 QR이에요.</h1><a href="/">처음으로 돌아가기</a></main>;

  const submit = async () => {
    const name = cleanTeamName(teamName);
    if (!name) return setError("우리 조 이름을 적어 주세요.");
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamName: name, room: room.key, action }) });
      const data = await response.json() as { error?: string; teamName?: string };
      if (!response.ok) throw new Error(data.error || "처리하지 못했습니다.");
      localStorage.setItem("find-team", data.teamName || name);
      router.replace(action === "enter" ? `/room/${room.key}?team=${encodeURIComponent(data.teamName || name)}&welcome=1` : `/?team=${encodeURIComponent(data.teamName || name)}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "잠시 후 다시 시도해 주세요."); setBusy(false); }
  };

  return (
    <main className="scan-shell" style={{ "--accent": room.color, "--soft": room.soft } as React.CSSProperties}>
      <div className="scan-orbit"><span>{room.mark}</span></div>
      <section className="scan-panel">
        <div className="eyebrow"><i /> QR CHECK {action === "enter" ? "IN" : "OUT"}</div>
        <div className="scan-action">{action === "enter" ? "입장" : "퇴장"}</div>
        <h1>{room.name}</h1>
        <p>{room.location} · {action === "enter" ? "조 이름이 이 방에 배정돼요" : "방을 찾으러 다시 이동해요"}</p>
        <label className="scan-select"><span>{action === "enter" ? "입장할 조 이름을 적어 주세요" : "퇴장할 조 이름을 확인해 주세요"}</span><input value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="예: 무지개조" maxLength={24} autoFocus /></label>
        {error && <div className="form-error">{error}</div>}
        <button onClick={submit} disabled={busy}>{busy ? "확인하고 있어요…" : `${action === "enter" ? "우리 조 배정하기" : "함께 퇴장하기"} →`}</button>
        <small>조장 한 명만 진행하면 같은 조 이름을 입력한 조원 모두에게 반영됩니다.</small>
      </section>
    </main>
  );
}
