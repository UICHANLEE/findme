"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getRoom, teamKey, type TeamState } from "../../../lib/find-data";

export default function RoomPage() {
  return <Suspense fallback={<main className="experience" />}><RoomContent /></Suspense>;
}

function RoomContent() {
  const params = useParams<{ slug: string }>();
  const query = useSearchParams();
  const router = useRouter();
  const room = getRoom(params.slug);
  const teamName = query.get("team") || "";
  const teamId = teamKey(teamName);
  const [enteredAt, setEnteredAt] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (teamName) localStorage.setItem("find-team", teamName);
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/status", { cache: "no-store" });
        const data = await response.json() as { states?: TeamState[] };
        const state = data.states?.find((item) => item.teamId === teamId);
        if (!active || !state) return;
        if (state.currentRoom !== params.slug) router.replace(`/?team=${encodeURIComponent(state.teamName)}`);
        setEnteredAt(state.enteredAt);
      } catch { /* next poll retries */ }
    };
    load(); const timer = setInterval(load, 1000);
    return () => { active = false; clearInterval(timer); };
  }, [params.slug, router, teamId, teamName]);

  useEffect(() => {
    const update = () => setSeconds(enteredAt ? Math.max(0, Math.floor((Date.now() - new Date(enteredAt).getTime()) / 1000)) : 0);
    update(); const timer = setInterval(update, 1000); return () => clearInterval(timer);
  }, [enteredAt]);

  if (!room) return <main className="scan-error"><h1>존재하지 않는 방입니다.</h1><Link href="/">돌아가기</Link></main>;
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  return (
    <main className={`experience experience-${room.key}`} style={{ "--accent": room.color, "--soft": room.soft } as React.CSSProperties}>
      <header><Link href={`/?team=${encodeURIComponent(teamName)}`}>FIND<span>:</span>US</Link><div className="room-header-actions"><Link className="room-scan-button" href="/scanner">▣ QR 스캔</Link><div className="live-badge"><i /> LIVE</div></div></header>
      <div className="experience-mark" aria-hidden="true">{room.mark}</div>
      <section className="experience-copy">
        <div className="room-location">ROOM {roomsIndex(room.key)} · {room.location}</div>
        <h1><small>함께 찾는 중</small>{room.name}</h1>
        <p>{room.prompt}</p>
      </section>
      <section className="experience-bottom">
        <div className="team-ticket"><span>NOW ENTERED</span><strong>{teamName || "조 정보 없음"}</strong><small>우리 조 이름이 이 방에 배정되었어요</small></div>
        <div className="timer"><span>함께한 시간</span><strong>{mins}<i>:</i>{secs}</strong></div>
        <div className="prompt-list">{room.steps.map((message, index) => <div key={message}><b>0{index + 1}</b><span>{message}</span></div>)}</div>
      </section>
      <div className="exit-guide">활동이 끝나면 <Link href="/scanner">카메라를 열어</Link> 출구의 <b>퇴장 QR</b>을 스캔해 주세요.</div>
    </main>
  );
}

function roomsIndex(key: string) { return String(["eyes", "sound", "body", "heart", "grace"].indexOf(key) + 1).padStart(2, "0"); }
