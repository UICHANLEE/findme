"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { elapsedRoomLabel, rooms, teamKey, type RoomKey, type TeamState } from "../lib/find-data";

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
  const [selectedRoomKey, setSelectedRoomKey] = useState<string | null>(null);
  const [justConnected, setJustConnected] = useState(false);

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
    setJustConnected(true);
    window.setTimeout(() => setJustConnected(false), 900);
    const next = params.get("next");
    if (next?.startsWith("/scan?")) router.push(next);
  };
  const changeTeam = () => {
    localStorage.removeItem("find-team");
    setTeamName("");
    setTeamDraft("");
  };
  const searching = states.filter((state) => !state.currentRoom);
  const completedRooms = myState?.completedRooms ?? [];
  const collectParam = params.get("collect") as RoomKey | null;
  const collectingRoom = rooms.find((room) => room.key === collectParam);
  const journeyComplete = completedRooms.length === rooms.length;
  const selectedRoom = rooms.find((room) => room.key === selectedRoomKey);
  const selectedInside = selectedRoom ? states.filter((state) => state.currentRoom === selectedRoom.key) : [];
  const moveHeroArt = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    event.currentTarget.style.setProperty("--art-x", `${x * 8}px`);
    event.currentTarget.style.setProperty("--art-y", `${y * 6}px`);
    event.currentTarget.style.setProperty("--art-rotate", `${x * 0.7 - 1}deg`);
  };
  const resetHeroArt = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.removeProperty("--art-x");
    event.currentTarget.style.removeProperty("--art-y");
    event.currentTarget.style.removeProperty("--art-rotate");
  };

  return (
    <main className="home-shell">
      <header className="topbar">
        <Link className="wordmark" href="/"><Image src="/find-it-mark.jpg" alt="" width={52} height={52} priority />FIND <span>IT</span></Link>
        <span className="event-name">2026 재건 청년 하계수련회</span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">2026 FIND JOURNEY</div>
          <h1><span>Find</span> me</h1>
          <div className="scribble-line" aria-hidden="true" />
          <blockquote>“너희가 온 마음으로 나를 구하면<br />나를 찾을 것이요 나를 만나리라”<cite>예레미야 29:13</cite></blockquote>
          <p>처음 한 번만 우리 조 이름을 입력해 주세요.<br className="mobile-break" /> 이후에는 카메라로 QR을 비추면 바로 여정이 시작됩니다.</p>
          {ready && !teamName ? (
            <form className="team-picker" onSubmit={connectTeam}>
              <span>우리 조</span>
              <input value={teamDraft} onChange={(event) => setTeamDraft(event.target.value)} placeholder="같은 조 이름을 입력해 주세요" maxLength={24} aria-label="우리 조 이름" autoFocus />
              <button type="submit">START</button>
            </form>
          ) : teamName ? (
            <div className={`team-connected ${justConnected ? "arrived" : ""}`}>
              <div><span>연결된 조</span><strong>{teamName}</strong><button type="button" onClick={changeTeam}>조 변경</button></div>
              <Link href="/scanner"><span className="camera-icon" aria-hidden="true">SCAN</span><b>QR 스캔하기</b><small>입구·출구 QR을 비춰 주세요</small></Link>
            </div>
          ) : null}
          {teamName && <div className={`waiting ${myState ? "journey" : ""}`}><span className="pulse" /> {myState ? "방을 찾으러 다니는 중.." : "입장 QR을 스캔하면 여정이 시작돼요"}</div>}
        </div>
        <div className={`hero-art journey-board ${journeyComplete ? "journey-complete" : ""}`} onPointerMove={moveHeroArt} onPointerLeave={resetHeroArt}>
          <div className="journey-board-heading"><span>OUR FIND POSTER</span><strong>{teamName || "우리 조"}</strong><b>{completedRooms.length}<small> / 5</small></b></div>
          <div className="journey-canvas">
            <Image className="journey-base" src="/collection/maze-base.jpg" alt="다섯 요소를 모아 완성하는 손그림 미로 포스터" width={900} height={900} unoptimized priority />
            {rooms.map((room) => {
              const collected = completedRooms.includes(room.key) || collectingRoom?.key === room.key;
              return <Image key={room.key} className={`journey-artifact artifact-${room.key} ${collected ? "collected" : ""} ${collectingRoom?.key === room.key ? "arriving" : ""}`} src={room.collectionAsset} alt={collected ? `${room.artifactName} 획득 완료` : `${room.artifactName} 미획득`} width={600} height={600} />;
            })}
            {journeyComplete && <div className="journey-finale"><span>FIND IT!</span><strong>다섯 요소를 모두 찾았어요</strong></div>}
          </div>
          <div className="artifact-legend">{rooms.map((room) => <span className={completedRooms.includes(room.key) || collectingRoom?.key === room.key ? "done" : ""} key={room.key}><Image src={room.emblem} alt="" width={42} height={42} /><b>{room.artifactName}</b></span>)}</div>
          {collectingRoom && <div className="collection-toast" style={{ "--accent": collectingRoom.color } as React.CSSProperties}><span>NEW FIND</span><strong>{collectingRoom.artifactName}</strong><small>{collectingRoom.name}에서 포스터로 이동했어요</small></div>}
        </div>
      </section>

      <section className="room-overview" aria-label="방별 실시간 현황">
        <div className="section-heading"><span>LIVE ROOMS</span><h2>다섯 개의 방을 찾아서</h2><p>눈으로, 소리로, 몸으로, 마음으로, 그리고 은혜로 찾아가요.</p></div>
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
              <button type="button" className={`room-card ${selectedRoomKey === room.key ? "selected" : ""}`} key={room.key} style={{ "--accent": room.color, "--soft": room.soft } as React.CSSProperties} onClick={() => setSelectedRoomKey(selectedRoomKey === room.key ? null : room.key)} aria-pressed={selectedRoomKey === room.key}>
                <div className="card-num">0{index + 1}</div>
                <div className="card-mark"><Image src={room.emblem} alt={`${room.name} 손그림 엠블럼`} width={180} height={180} /></div>
                <h3>{room.name}</h3>
                <p>{room.location}</p>
                <div className="occupancy"><span>{inside.length}</span> / {room.maxTeams}개 조 활동 중</div>
                <div className="team-dots">{inside.length ? inside.map((team) => <span className="active" key={team.teamId}><b>{team.teamName}</b><small>{elapsedRoomLabel(team.enteredAt)}</small></span>) : <em>입장한 조가 없어요</em>}</div>
                <small className="card-action">{selectedRoomKey === room.key ? "접기" : "자세히 보기"}</small>
              </button>
            );
          })}
        </div>
        {selectedRoom && (
          <section className="room-focus" style={{ "--accent": selectedRoom.color, "--soft": selectedRoom.soft } as React.CSSProperties} aria-live="polite">
            <Image className="room-focus-emblem" src={selectedRoom.emblem} alt="" width={150} height={150} />
            <div className="room-focus-copy">
              <span>SELECTED ROOM · {selectedRoom.location}</span>
              <h3>{selectedRoom.name}</h3>
              <p>{selectedRoom.prompt}</p>
            </div>
            <div className="room-focus-status">
              <div><span>현재 현황</span><strong>{selectedInside.length}<small> / {selectedRoom.maxTeams}개 조</small></strong></div>
              <div className="capacity-track" aria-label={`${selectedRoom.maxTeams}개 조 중 ${selectedInside.length}개 조 입장`}><i style={{ width: `${Math.min(100, selectedInside.length / selectedRoom.maxTeams * 100)}%` }} /></div>
              <div className="focus-teams">{selectedInside.length ? selectedInside.map((team) => <b key={team.teamId}>{team.teamName}<small>{elapsedRoomLabel(team.enteredAt)}</small></b>) : <em>지금 바로 입장할 수 있어요</em>}</div>
            </div>
            <div className="room-focus-actions">
              <Link href="/scanner">QR 스캔하기</Link>
              <button type="button" onClick={() => setSelectedRoomKey(null)}>닫기</button>
            </div>
          </section>
        )}
      </section>
      <footer><span>FIND IT</span><p>서로를 발견하는 다섯 개의 방</p><b>LIVE</b></footer>
    </main>
  );
}
