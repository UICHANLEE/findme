"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { elapsedRoomLabel, rooms, teamKey, type TeamState } from "../lib/find-data";

export default function Home() {
  return <Suspense fallback={<main className="home-shell" />}><HomeContent /></Suspense>;
}

function HomeContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [teamName, setTeamName] = useState("");
  const [teamDraft, setTeamDraft] = useState("");
  const [states, setStates] = useState<TeamState[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const name = params.get("team") || localStorage.getItem("find-team") || "";
      setTeamName(name);
      setTeamDraft(name);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
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
    const timer = setInterval(load, 1000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  const myState = useMemo(() => states.find((state) => state.teamId === teamKey(teamName)), [states, teamName]);
  useEffect(() => {
    if (ready && teamName && myState?.currentRoom) router.replace(`/room/${myState.currentRoom}?team=${encodeURIComponent(myState.teamName)}`);
  }, [myState?.currentRoom, myState?.teamName, ready, router, teamName]);

  const connectTeam = (event: React.FormEvent) => {
    event.preventDefault();
    const value = teamDraft.trim().replace(/\s+/g, " ");
    if (!value) return;
    setTeamName(value);
    localStorage.setItem("find-team", value);
    const next = params.get("next");
    if (next?.startsWith("/scan?")) router.push(next);
  };
  const changeTeam = () => {
    localStorage.removeItem("find-team");
    setTeamName("");
    setTeamDraft("");
  };
  const searching = states.filter((state) => !state.currentRoom);

  return (
    <main className="home-shell">
      <header className="topbar">
        <Link className="wordmark" href="/">FIND<span>:</span>US</Link>
      </header>

      <section className="hero">
        <div className="eyebrow"><i /> 2026 FIND JOURNEY</div>
        <h1>우리는 지금,<br /><em>무엇을 찾고 있나요?</em></h1>
        <p>처음 한 번만 우리 조 이름을 입력해 주세요.<br className="mobile-break" /> 이후에는 앱 카메라로 QR을 비추면 조원 모두의 화면이 바로 바뀝니다.</p>
        {ready && !teamName ? (
          <form className="team-picker" onSubmit={connectTeam}>
            <span>우리 조</span>
            <input value={teamDraft} onChange={(event) => setTeamDraft(event.target.value)} placeholder="모두 같은 조 이름을 입력해 주세요" maxLength={24} aria-label="우리 조 이름" autoFocus />
            <button type="submit">시작하기</button>
          </form>
        ) : teamName ? (
          <div className="team-connected">
            <div><span>연결된 조</span><strong>{teamName}</strong><button type="button" onClick={changeTeam}>조 변경</button></div>
            <Link href="/scanner"><span className="camera-icon" aria-hidden="true">▣</span><b>QR 스캔하기</b><small>카메라로 입구·출구 QR을 비춰 주세요</small></Link>
          </div>
        ) : null}
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
                <div className="team-dots">{inside.length ? inside.map((team) => <span className="active" key={team.teamId}><b>{team.teamName}</b><small>{elapsedRoomLabel(team.enteredAt)}</small></span>) : <em>입장한 조가 없어요</em>}</div>
              </article>
            );
          })}
        </div>
      </section>
      <footer><span>FIND:US</span><p>서로를 발견하는 다섯 개의 방</p><b>LIVE</b></footer>
    </main>
  );
}
