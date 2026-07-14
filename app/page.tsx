"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getRoom, rooms, teams, type TeamState } from "../lib/find-data";

export default function Home() {
  const router = useRouter();
  const params = useSearchParams();
  const [selectedTeam, setSelectedTeam] = useState("");
  const [states, setStates] = useState<TeamState[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const team = params.get("team") || localStorage.getItem("find-team") || "";
    setSelectedTeam(team);
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

  const myState = useMemo(() => states.find((state) => state.teamId === selectedTeam), [states, selectedTeam]);
  useEffect(() => {
    if (ready && selectedTeam && myState?.currentRoom) router.replace(`/room/${myState.currentRoom}?team=${selectedTeam}`);
  }, [myState?.currentRoom, ready, router, selectedTeam]);

  const chooseTeam = (value: string) => {
    setSelectedTeam(value);
    if (value) localStorage.setItem("find-team", value);
    else localStorage.removeItem("find-team");
  };

  return (
    <main className="home-shell">
      <header className="topbar">
        <a className="wordmark" href="/">FIND<span>:</span>US</a>
        <a className="admin-link" href="/admin">관리자</a>
      </header>

      <section className="hero">
        <div className="eyebrow"><i /> 2026 FIND JOURNEY</div>
        <h1>우리는 지금,<br /><em>무엇을 찾고 있나요?</em></h1>
        <p>조를 선택해 주세요. 조장이 QR을 스캔하면<br className="mobile-break" /> 우리 조 모두의 화면이 함께 바뀝니다.</p>
        <label className="team-picker">
          <span>나의 조</span>
          <select value={selectedTeam} onChange={(event) => chooseTeam(event.target.value)} aria-label="나의 조 선택">
            <option value="">조를 선택해 주세요</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.label}</option>)}
          </select>
        </label>
        {selectedTeam && <div className="waiting"><span className="pulse" /> QR 입장을 기다리고 있어요</div>}
      </section>

      <section className="room-overview" aria-label="방별 실시간 현황">
        <div className="section-heading"><span>LIVE ROOMS</span><h2>지금, 각 방에서는</h2></div>
        <div className="room-grid">
          {rooms.map((room, index) => {
            const inside = states.filter((state) => state.currentRoom === room.key);
            return (
              <article className="room-card" key={room.key} style={{ "--accent": room.color, "--soft": room.soft } as React.CSSProperties}>
                <div className="card-num">0{index + 1}</div>
                <div className="card-mark">{room.mark}</div>
                <h3>{room.name}</h3>
                <p>{room.location}</p>
                <div className="occupancy"><span>{inside.length}</span> / {teams.filter((team) => team.room === room.key).length}개 조 활동 중</div>
                <div className="team-dots">
                  {teams.filter((team) => team.room === room.key).map((team) => {
                    const current = states.find((state) => state.teamId === team.id);
                    return <span className={current?.currentRoom === room.key ? "active" : ""} key={team.id}>{team.label.replace(room.name.split("로")[0] + "로 ", "")}</span>;
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <footer><span>FIND:US</span><p>서로를 발견하는 다섯 개의 방</p><b>LIVE</b></footer>
    </main>
  );
}
