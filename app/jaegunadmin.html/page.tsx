"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { elapsedRoomLabel, rooms, type ActivityLog, type TeamState } from "../../lib/find-data";

type Tab = "status" | "guide" | "qr" | "logs";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("status");
  const [states, setStates] = useState<TeamState[]>([]);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logTeam, setLogTeam] = useState("all");

  const load = async () => {
    try {
      const [statusResponse, logsResponse] = await Promise.all([fetch("/api/status", { cache: "no-store" }), fetch("/api/logs", { cache: "no-store" })]);
      const statusData = await statusResponse.json() as { states?: TeamState[] };
      const logsData = await logsResponse.json() as { logs?: ActivityLog[] };
      if (statusData.states) setStates(statusData.states);
      if (logsData.logs) setLogs(logsData.logs);
      setUpdated(new Date());
    } catch { /* next poll retries */ }
  };
  useEffect(() => { const first = window.setTimeout(load, 0); const timer = setInterval(load, 1000); return () => { clearTimeout(first); clearInterval(timer); }; }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    Promise.all(rooms.flatMap((room) => (["enter", "exit"] as const).map(async (action) => [`${room.key}-${action}`, await QRCode.toDataURL(`${window.location.origin}/scan?room=${room.key}&action=${action}`, { width: 440, margin: 2, color: { dark: "#171713", light: "#ffffff" } })] as const))).then((pairs) => setQrCodes(Object.fromEntries(pairs)));
  }, []);

  const exitTeam = async (teamName: string, room: string) => {
    await fetch("/api/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamName, room, action: "exit" }) });
    load();
  };
  const reset = async () => { if (!confirm("모든 조의 입장 상태와 활동 로그를 초기화할까요? 먼저 필요한 로그를 다운로드해 주세요.")) return; await fetch("/api/reset", { method: "POST" }); load(); };
  const logTeams = Array.from(new Map(logs.map((log) => [log.teamId, log.teamName])).entries()).map(([teamId, teamName]) => ({ teamId, teamName }));
  const filteredLogs = logTeam === "all" ? logs : logs.filter((log) => log.teamId === logTeam);
  const durationLabel = (seconds: number | null) => seconds === null ? "-" : seconds < 60 ? `${seconds}초` : `${Math.floor(seconds / 60)}분 ${seconds % 60}초`;
  const downloadHref = (teamId = logTeam) => `/api/logs?format=csv&team=${encodeURIComponent(teamId)}`;

  return (
    <main className="admin-shell">
      <aside>
        <Link className="wordmark" href="/"><Image src="/find-it-mark.jpg" alt="" width={52} height={52} />FIND <span>IT</span></Link>
        <div className="admin-title"><span>CONTROL ROOM</span><strong>관리자</strong></div>
        <nav><button className={tab === "status" ? "active" : ""} onClick={() => setTab("status")}><span>01</span> 실시간 현황</button><button className={tab === "guide" ? "active" : ""} onClick={() => setTab("guide")}><span>02</span> 운영 Q-sheet</button><button className={tab === "qr" ? "active" : ""} onClick={() => setTab("qr")}><span>03</span> QR 코드</button><button className={tab === "logs" ? "active" : ""} onClick={() => setTab("logs")}><span>04</span> 조별 로그</button></nav>
        <Link className="back-home" href="/">← 참가자 화면</Link>
      </aside>
      <section className="admin-main">
        <header><div><span className="live-badge"><i /> LIVE</span><small>{updated ? `${updated.toLocaleTimeString("ko-KR")} 업데이트` : "연결 중"}</small></div>{tab === "status" ? <button className="reset-button" onClick={reset}>전체 초기화</button> : tab === "logs" ? <a className="reset-button" href={downloadHref("all")} download>전체 CSV 다운로드</a> : null}</header>
        {tab === "status" ? (
          <>
            <div className="admin-heading"><p>각 조의 위치를 한눈에 확인하고 직접 변경할 수 있어요.</p><h1>실시간 방 현황</h1></div>
            <div className="summary-row"><div><span>등록된 조</span><strong>{states.length}</strong></div><div><span>방에서 활동 중</span><strong>{states.filter((s) => s.currentRoom).length}</strong></div><div><span>방을 찾는 중</span><strong>{states.filter((s) => !s.currentRoom).length}</strong></div></div>
            <div className="admin-searching"><div><span>↝</span><h2>방을 찾으러 다니는 중..</h2><b>{states.filter((state) => !state.currentRoom).length}개 조</b></div><div className="admin-searching-list">{states.filter((state) => !state.currentRoom).length ? states.filter((state) => !state.currentRoom).map((state) => <span key={state.teamId}>{state.teamName}</span>) : <em>이동 중인 조가 없어요</em>}</div></div>
            <div className="admin-rooms">{rooms.map((room) => {
              const inRoom = states.filter((state) => state.currentRoom === room.key);
              return <article key={room.key} style={{ "--accent": room.color, "--soft": room.soft } as React.CSSProperties}><div className="admin-room-top"><div className="admin-room-mark"><Image src={room.emblem} alt="" width={80} height={80} /></div><div><h2>{room.name}</h2><p>{room.location}</p></div><strong>{inRoom.length}<span>/{room.maxTeams}</span></strong></div><div className="admin-team-list">{inRoom.length ? inRoom.map((team) => <div key={team.teamId}><span className="status-dot active" /><b>{team.teamName}</b><small>{elapsedRoomLabel(team.enteredAt)}</small><button onClick={() => exitTeam(team.teamName, room.key)}>퇴장</button></div>) : <div className="admin-empty">아직 배정된 조가 없어요</div>}</div></article>;
            })}</div>
          </>
        ) : tab === "guide" ? (
          <>
            <div className="admin-heading"><p>제공해 주신 Find It Q-sheet를 방별로 정리했어요.</p><h1>운영 Q-sheet</h1></div>
            <div className="guide-grid">{rooms.map((room, index) => <article key={room.key} style={{ "--accent": room.color, "--soft": room.soft } as React.CSSProperties}>
              <div className="guide-head"><span>0{index + 1}</span><div><h2>{room.name}</h2><p>{room.location}</p></div><b>{room.capacity}</b></div>
              <dl><div><dt>진행자</dt><dd>{room.hosts}</dd></div><div><dt>달란트</dt><dd>{room.reward}</dd></div><div><dt>준비물</dt><dd>{room.supplies.map((item) => <span key={item}>{item}</span>)}</dd></div><div><dt>진행 내용</dt><dd>{room.steps.map((step, stepIndex) => <span key={step}><i>{stepIndex + 1}</i>{step}</span>)}</dd></div></dl>
            </article>)}</div>
          </>
        ) : tab === "qr" ? (
          <>
            <div className="admin-heading"><p>각 방의 입구와 출구에 해당 QR을 인쇄해 부착하세요.</p><h1>입장 · 퇴장 QR</h1></div>
            <div className="qr-grid">{rooms.map((room) => <article key={room.key} style={{ "--accent": room.color, "--soft": room.soft } as React.CSSProperties}><div className="qr-room-title"><span><Image src={room.emblem} alt="" width={72} height={72} /></span><div><h2>{room.name}</h2><p>{room.location}</p></div></div><div className="qr-pair">{(["enter", "exit"] as const).map((action) => <div className={`qr-box ${action}`} key={action}><div className="qr-label">{action === "enter" ? "입장 QR" : "퇴장 QR"}</div>{qrCodes[`${room.key}-${action}`] ? <img src={qrCodes[`${room.key}-${action}`]} alt={`${room.name} ${action === "enter" ? "입장" : "퇴장"} QR`} /> : <div className="qr-loading" />}<small>{action === "enter" ? "CHECK IN" : "CHECK OUT"}</small></div>)}</div></article>)}</div>
          </>
        ) : (
          <>
            <div className="admin-heading"><p>QR 입장과 퇴장 기록을 조별 타임라인으로 확인하고 CSV로 저장할 수 있어요.</p><h1>조별 활동 로그</h1></div>
            <div className="log-toolbar">
              <label><span>확인할 조</span><select value={logTeam} onChange={(event) => setLogTeam(event.target.value)}><option value="all">전체 조</option>{logTeams.map((team) => <option value={team.teamId} key={team.teamId}>{team.teamName}</option>)}</select></label>
              <div><span>표시 중</span><strong>{filteredLogs.length}<small>건</small></strong></div>
              <a href={downloadHref()} download>{logTeam === "all" ? "전체" : logTeams.find((team) => team.teamId === logTeam)?.teamName} CSV 다운로드</a>
            </div>
            <div className="log-team-chips"><button className={logTeam === "all" ? "active" : ""} onClick={() => setLogTeam("all")}>전체</button>{logTeams.map((team) => <button className={logTeam === team.teamId ? "active" : ""} onClick={() => setLogTeam(team.teamId)} key={team.teamId}>{team.teamName}<small>{logs.filter((log) => log.teamId === team.teamId).length}</small></button>)}</div>
            <div className="activity-log-list">{filteredLogs.length ? filteredLogs.map((log) => {
              const room = rooms.find((item) => item.key === log.room);
              return <article key={log.id} style={{ "--accent": room?.color ?? "#171713", "--soft": room?.soft ?? "#f3f2ee" } as React.CSSProperties}><time>{new Date(log.timestamp).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time><span className={`log-action ${log.action}`}>{log.action === "enter" ? "입장" : "퇴장"}</span><div><strong>{log.teamName}</strong><p>{room?.name ?? log.room} · {room?.location}</p></div><b>{log.action === "exit" ? durationLabel(log.durationSeconds) : "활동 시작"}</b></article>;
            }) : <div className="log-empty"><strong>아직 기록된 활동이 없어요.</strong><p>조장이 입구 또는 출구 QR을 스캔하면 여기에 차곡차곡 기록됩니다.</p></div>}</div>
          </>
        )}
      </section>
    </main>
  );
}
