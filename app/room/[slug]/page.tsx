"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getRoom, getTeam, type TeamState } from "../../../lib/find-data";

const messages = {
  eyes: ["천천히 둘러보세요.", "서로의 표정을 발견하세요.", "보이는 것 너머를 상상해 보세요."],
  sound: ["잠시 멈추고 들어보세요.", "가장 가까운 목소리에 귀 기울여요.", "우리의 리듬을 찾아보세요."],
  body: ["몸을 크게 움직여 보세요.", "옆 사람의 속도에 맞춰요.", "하나의 움직임을 만들어 보세요."],
  heart: ["지금 마음의 온도는 어떤가요?", "말하지 못한 마음을 떠올려요.", "서로에게 안전한 자리를 내어주세요."],
  grace: ["오늘 받은 선물을 세어보세요.", "당연하지 않았던 순간을 기억해요.", "감사를 한 문장으로 건네요."],
};

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
        <div className="prompt-list">{messages[room.key].map((message, index) => <div key={message}><b>0{index + 1}</b><span>{message}</span></div>)}</div>
      </section>
      <div className="exit-guide">활동이 끝나면 출구의 <b>퇴장 QR</b>을 스캔해 주세요.</div>
    </main>
  );
}

function roomsIndex(key: string) { return String(["eyes", "sound", "body", "heart", "grace"].indexOf(key) + 1).padStart(2, "0"); }
