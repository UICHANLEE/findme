"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { rooms, teamKey, type TeamState } from "../lib/find-data";

export default function Home() {
  const router = useRouter();
  const params = useSearchParams();
  const [teamName, setTeamName] = useState("");
  const [states, setStates] = useState<TeamState[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const name = params.get("team") || localStorage.getItem("find-team") || "";
    setTeamName(name);
    setReady(true);
  }, [params]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/status", { cache: "no-store" });
        const data = await response.json() as { states?: TeamState[] };
        if (active && data.states) setStates(data.states);
      } catch { /* next poll retries */ }
    };
    load();
    const timer = setInterval(load, 2000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  const myState = useMemo(() => states.find((state) => state.teamId === teamKey(teamName)), [states, teamName]);
  useEffect(() => {
    if (ready && teamName && myState?.currentRoom) router.replace(`/room/${myState.currentRoom}?team=${encodeURIComponent(myState.teamName)}`);
  }, [myState?.currentRoom, myState?.teamName, ready, router, teamName]);

  const saveTeam = (value: string) => {
    setTeamName(value);
    if (value.trim()) localStorage.setItem("find-team", value.trim());
    else localStorage.removeItem("find-team");
  };
  const searching = states.filter((state) => !state.currentRoom);

  return (
    <main className="home-shell">
      <header className="topbar">
        <a className="wordmark" href="/">FIND<span>:</span>US</a>
        <a className="admin-link" href="/admin">관리자</a>
      </header>

      <section className="hero">
        <div className="eyebrow"><i /> 2026 FIND JOURNEY</div>
        <h1>우리는 지금,<br /><em>무엇을 찾고 있나요?</em></h1>
        <p>우리 조 이름을 입력해 두세요. 조장이 QR을 스캔하면<br className="mobile-break" /> 조원 모두의 화면이 함께 바뀝니다.</p>
        <label className="team-picker">
          <span>우리 조</span>
          <input value={teamName} onChange={(event) => saveTeam(event.target.value)} placeholder="조 이름을 입력해 주세요" maxLength={24} aria-label="우리 조 이름" />
        </label>
        {teamName && <div className={`waiting ${myState ? "journey" : ""}`}><span className="pulse" /> {myState ? "방을 찾으러 다니는 중.." : "입장 QR을 스캔하면 여정이 시작돼요"}</div>}
      </section>

      <section className="room-overview" aria-label="방별 실시간 현황">
        <div className="section-heading"><span>LIVE ROOMS</span><h2>지금, 각 방에서는</h2></div>
        <div className="searching-zone">
          <div className="searching-icon">↝</div>
          <div><span>ON THE WAY</span><h3>방을 찾으러 다니는 중..</h3></div>
          <strong>{searching.length}<small>개 조</small></strong>
          <div className="searching-teams">{searching.length ? searching.map((team) => <b key={team.teamId}>{team.teamName}</b>) : <em>아직 이동 중인 조가 없어요</em>}</div>
        </div>
        <div className="room-grid">
          {rooms.map((room, index) => {
            const inside = states.filter((state) => state.currentRoom === room.key);
            return (
              <article className="room-card" key={room.key} style={{ "--accent": room.color, "--soft": room.soft } as React.CSSProperties}>
                <div className="card-num">0{index + 1}</div>
                <div className="card-mark">{room.mark}</div>
                <h3>{room.name}</h3>
                <p>{room.location}</p>
                <div className="occupancy"><span>{inside.length}</span> / {room.maxTeams}개 조 활동 중</div>
                <div className="team-dots">{inside.length ? inside.map((team) => <span className="active" key={team.teamId}>{team.teamName}</span>) : <em>입장한 조가 없어요</em>}</div>
              </article>
            );
          })}
        </div>
      </section>
      <footer><span>FIND:US</span><p>서로를 발견하는 다섯 개의 방</p><b>LIVE</b></footer>
    </main>
  );
}
