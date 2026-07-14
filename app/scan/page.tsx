"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cleanTeamName, getRoom } from "../../lib/find-data";

export default function ScanPage() {
  return <Suspense fallback={<main className="scan-shell" />}><ScanContent /></Suspense>;
}

function ScanContent() {
  const params = useSearchParams();
  const router = useRouter();
  const room = getRoom(params.get("room"));
  const action = params.get("action") === "exit" ? "exit" : "enter";
  const started = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!room || started.current) return;
    started.current = true;
    const name = cleanTeamName(localStorage.getItem("find-team") || "");
    if (!name) {
      const next = `/scan?room=${room.key}&action=${action}`;
      router.replace(`/?next=${encodeURIComponent(next)}`);
      return;
    }

    const submit = async () => {
      try {
        const response = await fetch("/api/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamName: name, room: room.key, action }) });
        const data = await response.json() as { error?: string; teamName?: string };
        if (!response.ok) throw new Error(data.error || "처리하지 못했습니다.");
        const savedName = data.teamName || name;
        localStorage.setItem("find-team", savedName);
        router.replace(action === "enter" ? `/room/${room.key}?team=${encodeURIComponent(savedName)}&welcome=1` : `/?team=${encodeURIComponent(savedName)}`);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "잠시 후 다시 시도해 주세요.");
      }
    };
    submit();
  }, [action, room, router]);

  if (!room) return <main className="scan-error"><h1>유효하지 않은 QR이에요.</h1><Link href="/">처음으로 돌아가기</Link></main>;

  return (
    <main className="scan-shell" style={{ "--accent": room.color, "--soft": room.soft } as React.CSSProperties}>
      <div className="scan-orbit"><span>{room.mark}</span></div>
      <section className="scan-panel">
        <div className="eyebrow"><i /> QR CHECK {action === "enter" ? "IN" : "OUT"}</div>
        <div className="scan-action">{action === "enter" ? "입장" : "퇴장"}</div>
        <h1>{room.name}</h1>
        <p>{room.location} · {action === "enter" ? "우리 조를 이 방에 배정하고 있어요" : "우리 조의 퇴장을 처리하고 있어요"}</p>
        {error && <div className="form-error">{error}</div>}
        {!error && <div className="scan-processing"><i /><strong>바로 반영하고 있어요…</strong></div>}
        {error && <a className="scan-retry" href={`/scan?room=${room.key}&action=${action}`}>다시 시도하기</a>}
        <small>별도의 입력 없이 저장된 조 이름으로 모든 조원에게 반영됩니다.</small>
      </section>
    </main>
  );
}
