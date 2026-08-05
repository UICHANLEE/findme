"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import JourneyAssist from "./_components/journey-assist";
import {
  cleanTeamName,
  elapsedRoomLabel,
  rooms,
  teamKey,
  type RoomKey,
  type RoomLiveStatus,
  type TeamState,
} from "../lib/find-data";

type FindRoom = (typeof rooms)[number];
const routeSegments = [1, 2, 3, 4, 5] as const;
const eyesRoom = rooms.find((room) => room.key === "eyes")!;
const roomAfterglow: Record<RoomKey, { line: string; reference: string }> = {
  eyes: { line: "내 눈을 열어서 주의 율법에서 놀라운 것을 보게 하소서", reference: "시편 119:18" },
  sound: { line: "귀 있는 자는 성령이 교회들에게 하시는 말씀을 들을지어다", reference: "요한계시록 2:7" },
  body: { line: "너희는 그리스도의 몸이요 지체의 각 부분이라", reference: "고린도전서 12:27" },
  heart: { line: "너는 마음을 다하여 여호와를 신뢰하고", reference: "잠언 3:5" },
  grace: { line: "나의 은혜가 네게 족하도다", reference: "고린도후서 12:9" },
};

const artifactStyle = (room: FindRoom) => ({
  "--part-left": `${room.collectionPosition.left}%`,
  "--part-top": `${room.collectionPosition.top}%`,
  "--part-width": `${room.collectionPosition.width}%`,
  "--part-rotate": `${room.collectionPosition.rotate}deg`,
  "--gate-left": `${room.collectionPosition.left}%`,
  "--gate-top": `${room.collectionPosition.top}%`,
  "--gate-width": `${room.collectionPosition.width}%`,
  "--gate-rotate": `${room.collectionPosition.rotate}deg`,
} as React.CSSProperties);

export default function Home() {
  return <Suspense fallback={<main className="home-shell" />}><HomeContent /></Suspense>;
}

function HomeContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [teamName, setTeamName] = useState("");
  const [teamDraft, setTeamDraft] = useState("");
  const [states, setStates] = useState<TeamState[]>([]);
  const [roomStatuses, setRoomStatuses] = useState<Record<RoomKey, RoomLiveStatus> | null>(null);
  const [ready, setReady] = useState(false);
  const [selectedRoomKey, setSelectedRoomKey] = useState<string | null>(null);
  const [justConnected, setJustConnected] = useState(false);
  const journeyCanvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const queryTeam = cleanTeamName(params.get("team") || "");
      const name = queryTeam || cleanTeamName(localStorage.getItem("find-team") || "");
      if (queryTeam) localStorage.setItem("find-team", queryTeam);
      setTeamName(name);
      setTeamDraft(name);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [params]);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    const load = async () => {
      try {
        const response = await fetch("/api/status");
        const data = await response.json() as {
          states?: TeamState[];
          roomStatuses?: Record<RoomKey, RoomLiveStatus>;
        };
        if (active && data.states) setStates(data.states);
        if (active && data.roomStatuses) setRoomStatuses(data.roomStatuses);
      } catch { /* next poll retries */ }
      finally { if (active) timer = window.setTimeout(load, 2000); }
    };
    void load();
    return () => { active = false; if (timer) window.clearTimeout(timer); };
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
  const liveRoomStatuses = useMemo(
    () => roomStatuses ?? Object.fromEntries(rooms.map((room) => {
      const insideCount = states.filter((state) => state.currentRoom === room.key).length;
      return [room.key, {
        room: room.key,
        insideCount,
        maxTeams: room.maxTeams,
        availableSlots: Math.max(0, room.maxTeams - insideCount),
        isFull: insideCount >= room.maxTeams,
      }];
    })) as Record<RoomKey, RoomLiveStatus>,
    [roomStatuses, states],
  );
  const collectParam = params.get("collect") as RoomKey | null;
  const collectingRoom = rooms.find((room) => room.key === collectParam);
  const finalCollection = params.get("finale") === "1";
  const journeyComplete = rooms.every((room) => completedRooms.includes(room.key));
  const finishCollection = useCallback(() => {
    const next = new URLSearchParams(params.toString());
    next.delete("collect");
    next.delete("finale");
    const search = next.toString();
    window.history.replaceState(window.history.state, "", `/${search ? `?${search}` : ""}`);
  }, [params]);
  const selectedRoom = rooms.find((room) => room.key === selectedRoomKey);
  const selectedInside = selectedRoom ? states.filter((state) => state.currentRoom === selectedRoom.key) : [];
  const moveHeroArt = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    event.currentTarget.style.setProperty("--art-x", `${x * 8}px`);
    event.currentTarget.style.setProperty("--art-y", `${y * 6}px`);
    event.currentTarget.style.setProperty("--art-rotate", `${x * 0.7 - 1}deg`);
    event.currentTarget.style.setProperty("--piece-react-x", `${x * 5}px`);
    event.currentTarget.style.setProperty("--piece-react-y", `${y * 4}px`);
    event.currentTarget.style.setProperty("--compass-react", `${x * 4 - y * 2}deg`);
  };
  const resetHeroArt = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.removeProperty("--art-x");
    event.currentTarget.style.removeProperty("--art-y");
    event.currentTarget.style.removeProperty("--art-rotate");
    event.currentTarget.style.removeProperty("--piece-react-x");
    event.currentTarget.style.removeProperty("--piece-react-y");
    event.currentTarget.style.removeProperty("--compass-react");
  };

  return (
    <main className="home-shell">
      {collectingRoom && <CollectionTransfer room={collectingRoom} completedRooms={completedRooms} canvasRef={journeyCanvasRef} finalCompletion={finalCollection} onDone={finishCollection} />}
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
          {teamName && (
            <div className={`waiting ${myState ? "journey" : ""}`}>
              <span className="pulse" />
              <span>{myState ? "방을 찾으러 다니는 중.." : "입장 QR을 스캔하면 여정이 시작돼요"}</span>
              <Link
                className="waiting-map-link"
                href={`/map2?team=${encodeURIComponent(teamName)}${
                  myState?.previousRoom ? `&from=${encodeURIComponent(myState.previousRoom)}` : ""
                }#floor-directory`}
              >
                층별 지도 <i aria-hidden="true">↗</i>
              </Link>
            </div>
          )}
        </div>
        <div className={`hero-art journey-board ${journeyComplete ? "journey-complete" : ""}`} onPointerMove={moveHeroArt} onPointerLeave={resetHeroArt}>
          <div className="journey-board-heading"><span>{journeyComplete ? "THE WAY IS OPEN · 십자가를 찾았어요" : completedRooms.length ? `FOUND PIECES · ${completedRooms.length}개 보관 중` : "OUR FIND POSTER"}</span><strong>{teamName || "우리 조"}</strong><b>{completedRooms.length}<small> / 5</small></b></div>
          <div className="journey-canvas" ref={journeyCanvasRef}>
            <Image className="journey-base" src="/collection/maze-base.jpg" alt="다섯 요소를 모아 완성하는 손그림 미로 포스터" width={900} height={900} unoptimized priority />
            {rooms.map((room) => {
              const stored = completedRooms.includes(room.key);
              return <Image key={room.key} style={artifactStyle(room)} className={`journey-artifact artifact-${room.key} ${journeyComplete ? "collected" : ""}`} src={room.collectionAsset} alt={journeyComplete ? `${room.artifactName} 포스터 반영 완료` : stored ? `${room.artifactName} 보관 중` : `${room.artifactName} 미획득`} width={room.collectionSize[0]} height={room.collectionSize[1]} />;
            })}
            {journeyComplete && <JourneyFoundPicture />}
          </div>
          <div className="artifact-legend">{rooms.map((room) => <span className={completedRooms.includes(room.key) ? "done stored" : ""} key={room.key}><Image src={room.emblem} alt="" width={42} height={42} /><b>{completedRooms.includes(room.key) && !journeyComplete ? "보관 중" : room.artifactName}</b></span>)}</div>
        </div>
      </section>

      {myState && !myState.currentRoom && myState.previousRoom && !journeyComplete ? (
        <JourneyAssist
          teamName={myState.teamName}
          previousRoomKey={myState.previousRoom}
          previousRoomDurationSeconds={myState.previousRoomDurationSeconds}
          completedRooms={completedRooms}
          roomStatuses={liveRoomStatuses}
        />
      ) : null}

      <section className="room-overview" aria-label="방별 실시간 현황">
        <div className="section-heading"><span>LIVE ROOMS</span><h2>Find It</h2><p>눈으로, 소리로, 몸으로, 마음으로, 그리고 은혜로 찾아가요.</p></div>
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

function JourneyFoundPicture({ transfer = false }: { transfer?: boolean }) {
  return (
    <div
      className={transfer ? "transfer-final-picture" : "journey-found-picture"}
      data-testid={transfer ? "finale-route" : "completed-route"}
      aria-label="열린 미로의 점선 길을 따라 십자가를 찾은 완성 포스터"
    >
      {routeSegments.map((segment) => (
        <Image
          key={segment}
          className={`journey-route-segment route-segment-${segment}`}
          data-route-segment={segment}
          src={`/collection/maze-route-segment-${segment}.webp`}
          alt=""
          width={900}
          height={900}
          unoptimized
          priority
        />
      ))}
    </div>
  );
}

function CollectionTransfer({ room, completedRooms, canvasRef, finalCompletion, onDone }: { room: FindRoom; completedRooms: RoomKey[]; canvasRef: React.RefObject<HTMLDivElement | null>; finalCompletion: boolean; onDone: () => void }) {
  const [moving, setMoving] = useState(false);
  const [settled, setSettled] = useState(false);
  const [assembling, setAssembling] = useState(false);
  const [gateOpening, setGateOpening] = useState(false);
  const [finalScene, setFinalScene] = useState(false);
  const [routeSearching, setRouteSearching] = useState(false);
  const [routeComplete, setRouteComplete] = useState(false);
  const [afterglow, setAfterglow] = useState(false);
  const [finished, setFinished] = useState(false);
  const [visible, setVisible] = useState(true);
  const sourceRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLImageElement>(null);
  const flyerRef = useRef<HTMLImageElement>(null);
  const completedCount = completedRooms.length;

  useEffect(() => {
    let flyerAnimation: Animation | null = null;
    const timers: number[] = [];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 700px)").matches;

    if (!finalCompletion) {
      if (reducedMotion) {
        timers.push(window.setTimeout(() => {
          setMoving(true);
          setSettled(true);
        }, 0));
        timers.push(window.setTimeout(() => {
          setVisible(false);
          onDone();
        }, 420));
      } else {
        timers.push(window.setTimeout(() => setMoving(true), 180));
        timers.push(window.setTimeout(() => setSettled(true), 1050));
        timers.push(window.setTimeout(() => setAfterglow(true), 2850));
        timers.push(window.setTimeout(() => setFinished(true), 5100));
        timers.push(window.setTimeout(() => {
          setVisible(false);
          onDone();
        }, 6000));
      }
      return () => timers.forEach((timer) => window.clearTimeout(timer));
    }

    const prepare = () => {
      const canvas = canvasRef.current;
      const source = sourceRef.current;
      const poster = posterRef.current;
      const target = targetRef.current;
      const flyer = flyerRef.current;
      if (!canvas || !source || !poster || !target || !flyer) return;

      const canvasRect = canvas.getBoundingClientRect();
      const posterSize = mobile ? Math.min(window.innerWidth - 32, window.innerHeight - 150) : canvasRect.width;
      const posterLeft = mobile ? (window.innerWidth - posterSize) / 2 : canvasRect.left;
      const posterTop = mobile ? (window.innerHeight - posterSize) / 2 : canvasRect.top;
      poster.style.left = `${posterLeft}px`;
      poster.style.top = `${posterTop}px`;
      poster.style.width = `${posterSize}px`;
      poster.style.height = `${posterSize}px`;

      const sourceRect = source.getBoundingClientRect();
      const startWidth = Math.min(sourceRect.width * 0.55, 150);
      const startHeight = startWidth * room.collectionSize[1] / room.collectionSize[0];
      const startLeft = sourceRect.left + sourceRect.width / 2 - startWidth / 2;
      const startTop = sourceRect.top + sourceRect.height / 2 - startHeight / 2;
      const targetLeft = posterLeft + target.offsetLeft;
      const targetTop = posterTop + target.offsetTop;
      const targetWidth = target.offsetWidth;
      const targetHeight = target.offsetHeight;
      const midWidth = Math.max(startWidth, targetWidth * 0.72);
      const midHeight = midWidth * room.collectionSize[1] / room.collectionSize[0];

      Object.assign(flyer.style, {
        left: `${startLeft}px`,
        top: `${startTop}px`,
        width: `${startWidth}px`,
        height: `${startHeight}px`,
      });

      if (reducedMotion) {
        setMoving(true);
        setSettled(true);
        setAssembling(true);
        setGateOpening(true);
        setFinalScene(true);
        setRouteSearching(true);
        setRouteComplete(true);
        timers.push(window.setTimeout(() => {
          setVisible(false);
          onDone();
        }, 700));
        return;
      }

      timers.push(window.setTimeout(() => setMoving(true), 580));
      flyerAnimation = flyer.animate([
        { left: `${startLeft}px`, top: `${startTop}px`, width: `${startWidth}px`, height: `${startHeight}px`, opacity: 0, transform: "scale(.45) rotate(-12deg)" },
        { offset: 0.18, opacity: 1, transform: "scale(.9) rotate(-5deg)" },
        { offset: 0.56, left: `${(startLeft + targetLeft) / 2}px`, top: `${Math.min(startTop, targetTop) - 54}px`, width: `${midWidth}px`, height: `${midHeight}px`, transform: "scale(1.04) rotate(7deg)" },
        { offset: 0.9, left: `${targetLeft}px`, top: `${targetTop}px`, width: `${targetWidth}px`, height: `${targetHeight}px`, opacity: 1, transform: `scale(1.06) rotate(${room.collectionPosition.rotate}deg)` },
        { left: `${targetLeft}px`, top: `${targetTop}px`, width: `${targetWidth}px`, height: `${targetHeight}px`, opacity: 0, transform: `scale(1) rotate(${room.collectionPosition.rotate}deg)` },
      ], { duration: 3380, delay: 580, easing: "cubic-bezier(.18,.72,.2,1)", fill: "forwards" });

      timers.push(window.setTimeout(() => setSettled(true), 3600));
      timers.push(window.setTimeout(() => setAssembling(true), 4300));
      timers.push(window.setTimeout(() => setGateOpening(true), 9300));
      timers.push(window.setTimeout(() => {
        setFinalScene(true);
        setRouteSearching(true);
      }, 12800));
      timers.push(window.setTimeout(() => setRouteComplete(true), 22500));
      timers.push(window.setTimeout(() => setAfterglow(true), 24700));
      timers.push(window.setTimeout(() => setFinished(true), 30100));
      timers.push(window.setTimeout(() => {
        setVisible(false);
        onDone();
      }, 31100));
    };

    timers.push(window.setTimeout(prepare, mobile ? 480 : 90));
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      flyerAnimation?.cancel();
    };
  }, [canvasRef, completedCount, finalCompletion, onDone, room]);

  if (!visible) return null;
  const assemblyRooms = completedRooms
    .map((key) => rooms.find((item) => item.key === key))
    .filter((item): item is FindRoom => Boolean(item));
  const soundAssemblyIndex = Math.max(0, assemblyRooms.findIndex((item) => item.key === "sound"));

  return (
    <section className={`collection-transfer ${finalCompletion ? "is-finale" : "is-keepsake"} ${moving ? "is-moving" : ""} ${settled ? "is-settled" : ""} ${assembling ? "is-assembling" : ""} ${gateOpening ? "is-gate-opening" : ""} ${finalScene ? "is-final-scene" : ""} ${routeSearching ? "is-route-searching" : ""} ${routeComplete ? "is-route-complete" : ""} ${afterglow ? "is-afterglow" : ""} ${finished ? "is-finished" : ""}`} style={{ "--accent": room.color, "--soft": room.soft } as React.CSSProperties} aria-live="polite">
      <div className="transfer-room-panel">
        <span>{finalCompletion ? "LAST PART FOUND · 5/5" : `PART FOUND · ${completedRooms.length}/5`}</span>
        <div className={`transfer-found-piece transfer-found-piece-${room.key}`} ref={sourceRef}>
          <Image src={room.collectionAsset} alt={`${room.artifactName} 획득`} width={room.collectionSize[0]} height={room.collectionSize[1]} priority />
        </div>
        <h2>{room.artifactName}</h2>
        <p>{room.name}에서 찾은 파츠를 <b>{finalCompletion ? "이제 하나씩 펼쳐 볼게요" : "안전하게 보관했어요"}</b></p>
      </div>
      {finalCompletion && <div className="transfer-poster" ref={posterRef} aria-label="보관했던 다섯 파츠가 하나씩 포스터에 반영되는 중">
        <Image className="transfer-poster-base" src="/collection/maze-base.jpg" alt="" width={900} height={900} unoptimized priority />
        {assemblyRooms.map((item, index) => <Image
          key={item.key}
          ref={item.key === room.key ? targetRef : undefined}
          style={{ ...artifactStyle(item), "--assembly-delay": `${index * 720}ms` } as React.CSSProperties}
          className={`journey-artifact assembly-artifact artifact-${item.key} ${item.key === "sound" ? "assembled-gate" : ""}`}
          src={item.collectionAsset}
          alt={`${item.artifactName} ${index + 1}번째 작동`}
          width={item.collectionSize[0]}
          height={item.collectionSize[1]}
        />)}
        <Image
          style={{ "--assembly-delay": `${soundAssemblyIndex * 720}ms` } as React.CSSProperties}
          className="sound-wall-closed sound-wall-closed-left assembly-wall"
          data-testid="maze-gate-left"
          src="/collection/maze-gate-closed.webp"
          alt=""
          width={900}
          height={900}
          unoptimized
          priority
        />
        <Image
          style={{ "--assembly-delay": `${soundAssemblyIndex * 720}ms` } as React.CSSProperties}
          className="sound-wall-closed sound-wall-closed-right assembly-wall"
          data-testid="maze-gate-right"
          src="/collection/maze-gate-closed.webp"
          alt=""
          width={900}
          height={900}
          unoptimized
          priority
        />
        <JourneyFoundPicture transfer />
        <Image className="route-magnifier" data-testid="route-magnifier" src={eyesRoom.collectionAsset} alt="붉은 점선 길을 따라 십자가를 찾는 돋보기" width={600} height={600} unoptimized priority />
      </div>}
      {finalCompletion && <Image ref={flyerRef} className={`transfer-flyer transfer-flyer-${room.key}`} src={room.collectionAsset} alt={`${room.artifactName} 이동 중`} width={room.collectionSize[0]} height={room.collectionSize[1]} priority />}
      {finalCompletion && <div className="transfer-caption"><span>ALL PARTS FOUND · 5/5</span><strong>기억해 둔 파츠들</strong><small>이제 하나씩 제자리를 찾아갑니다</small></div>}
      <div className="transfer-afterglow">
        <span>{finalCompletion ? "OUR JOURNEY · FIND IT" : `${completedRooms.length}번째 발견`}</span>
        <strong>{finalCompletion ? "너희가 온 마음으로 나를 구하면 나를 찾을 것이요 나를 만나리라" : roomAfterglow[room.key].line}</strong>
        <small>{finalCompletion ? "예레미야 29:13" : roomAfterglow[room.key].reference}</small>
      </div>
      {finalCompletion && <div className="transfer-finale-caption"><span>THE WAY IS OPEN</span><strong>길 끝에서 십자가를 만났어요</strong><small>“찾으라 그리하면 찾아낼 것이요” · 마태복음 7:7</small></div>}
    </section>
  );
}
