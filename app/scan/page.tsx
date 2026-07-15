"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
  const [done, setDone] = useState(false);

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
        const data = await response.json() as { code?: string; error?: string; teamName?: string; collectedRoom?: string | null };
        if (data.code === "ROOM_FULL") {
          window.alert(data.error || "현재 입장 가능한 조가 모두 찼어요. 다른 방을 찾아가세요!!");
          router.replace("/");
          return;
        }
        if (!response.ok) throw new Error(data.error || "처리하지 못했습니다.");
        const savedName = data.teamName || name;
        localStorage.setItem("find-team", savedName);
        setDone(true);
        await new Promise((resolve) => window.setTimeout(resolve, 850));
        router.replace(action === "enter"
          ? `/room/${room.key}?team=${encodeURIComponent(savedName)}&welcome=1`
          : `/?team=${encodeURIComponent(savedName)}${data.collectedRoom ? `&collect=${data.collectedRoom}` : ""}`);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "잠시 후 다시 시도해 주세요.");
      }
    };
    submit();
  }, [action, room, router]);

  if (!room) return <main className="scan-error"><h1>유효하지 않은 QR이에요.</h1><Link href="/">처음으로 돌아가기</Link></main>;

  return (
    <main className={`scan-shell scan-${action} ${done ? "scan-success" : ""}`} style={{ "--accent": room.color, "--soft": room.soft } as React.CSSProperties}>
      <div className="scan-orbit"><span><Image src={room.emblem} alt={`${room.name} 엠블럼`} width={640} height={640} priority /></span></div>
      <section className="scan-panel">
        <div className="eyebrow"><i /> QR CHECK {action === "enter" ? "IN" : "OUT"}</div>
        <div className="scan-action">{action === "enter" ? "입장" : "퇴장"}</div>
        <h1>{room.name}</h1>
        <p>{room.location} · {done ? (action === "enter" ? "입장이 완료됐어요!" : "퇴장이 완료됐어요!") : action === "enter" ? "우리 조를 이 방에 배정하고 있어요" : "우리 조의 퇴장을 처리하고 있어요"}</p>
        {error && <div className="form-error">{error}</div>}
        {!error && <div className="scan-processing">{done ? <span>✓</span> : <i />}<strong>{done ? "반영 완료! 이동할게요" : "바로 반영하고 있어요…"}</strong></div>}
        {error && <a className="scan-retry" href={`/scan?room=${room.key}&action=${action}`}>다시 시도하기</a>}
        <small>별도의 입력 없이 저장된 조 이름으로 모든 조원에게 반영됩니다.</small>
      </section>
    </main>
  );
}
