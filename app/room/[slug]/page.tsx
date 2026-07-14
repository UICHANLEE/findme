"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getRoom, getTeam, type TeamState } from "../../../lib/find-data";

export default function RoomPage() {
  const params = useParams<{ slug: string }>();
  const query = useSearchParams();
  const router = useRouter();
  const room = getRoom(params.slug);
  const teamId = query.get("team") || "";
  const team = getTeam(teamId);
  const [enteredAt, setEnteredAt] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (teamId) localStorage.setItem("find-team", teamId);
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/status", { cache: "no-store" });
        const data = await response.json() as { states?: TeamState[] };
        const state = data.states?.find((item) => item.teamId === teamId);
        if (!active || !state) return;
        if (state.currentRoom !== params.slug) router.replace(`/?team=${teamId}`);
        setEnteredAt(state.enteredAt);
      } catch { /* next poll retries */ }
    };
    load(); const timer = setInterval(load, 2000);
    return () => { active = false; clearInterval(timer); };
  }, [params.slug, router, teamId]);

  useEffect(() => {
    const update = () => setSeconds(enteredAt ? Math.max(0, Math.floor((Date.now() - new Date(enteredAt).getTime()) / 1000)) : 0);
    update(); const timer = setInterval(update, 1000); return () => clearInterval(timer);
  }, [enteredAt]);

  if (!room) return <main className="scan-error"><h1>존재하지 않는 방입니다.</h1><a href="/">돌아가기</a></main>;
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  return (
    <main className={`experience experience-${room.key}`} style={{ "--accent": room.color, "--soft": room.soft } as React.CSSProperties}>
      <header><a href={`/?team=${teamId}`}>FIND<span>:</span>US</a><div className="live-badge"><i /> LIVE</div></header>
      <div className="experience-mark" aria-hidden="true">{room.mark}</div>
      <section className="experience-copy">
        <div className="room-location">ROOM {roomsIndex(room.key)} · {room.location}</div>
        <h1><small>함께 찾는 중</small>{room.name}</h1>
        <p>{room.prompt}</p>
      </section>
      <section className="experience-bottom">
        <div className="team-ticket"><span>NOW ENTERED</span><strong>{team?.label || "조 정보 없음"}</strong><small>조원 모두의 화면이 연결되었어요</small></div>
        <div className="timer"><span>함께한 시간</span><strong>{mins}<i>:</i>{secs}</strong></div>
        <div className="prompt-list">{room.steps.map((message, index) => <div key={message}><b>0{index + 1}</b><span>{message}</span></div>)}</div>
      </section>
      <div className="exit-guide">활동이 끝나면 출구의 <b>퇴장 QR</b>을 스캔해 주세요.</div>
    </main>
  );
}

function roomsIndex(key: string) { return String(["eyes", "sound", "body", "heart", "grace"].indexOf(key) + 1).padStart(2, "0"); }
