"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { rooms, teams, type RoomKey, type TeamState } from "../../lib/find-data";

type Tab = "status" | "guide" | "qr";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("status");
  const [states, setStates] = useState<TeamState[]>([]);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});

  const load = async () => {
    try { const response = await fetch("/api/status", { cache: "no-store" }); const data = await response.json() as { states?: TeamState[] }; if (data.states) { setStates(data.states); setUpdated(new Date()); } } catch { /* next poll retries */ }
  };
  useEffect(() => { load(); const timer = setInterval(load, 2000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    Promise.all(rooms.flatMap((room) => (["enter", "exit"] as const).map(async (action) => [`${room.key}-${action}`, await QRCode.toDataURL(`${window.location.origin}/scan?room=${room.key}&action=${action}`, { width: 440, margin: 2, color: { dark: "#171713", light: "#ffffff" } })] as const))).then((pairs) => setQrCodes(Object.fromEntries(pairs)));
  }, []);

  const updateTeam = async (teamId: string, room: RoomKey | null) => {
    const team = teams.find((item) => item.id === teamId)!;
    await fetch("/api/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamId, room: room || team.room, action: room ? "enter" : "exit" }) });
    load();
  };
  const reset = async () => { if (!confirm("모든 조의 입장 상태를 초기화할까요?")) return; await fetch("/api/reset", { method: "POST" }); load(); };

  return (
    <main className="admin-shell">
      <aside>
        <a className="wordmark" href="/">FIND<span>:</span>US</a>
        <div className="admin-title"><span>CONTROL ROOM</span><strong>관리자</strong></div>
        <nav><button className={tab === "status" ? "active" : ""} onClick={() => setTab("status")}><span>01</span> 실시간 현황</button><button className={tab === "guide" ? "active" : ""} onClick={() => setTab("guide")}><span>02</span> 운영 Q-sheet</button><button className={tab === "qr" ? "active" : ""} onClick={() => setTab("qr")}><span>03</span> QR 코드</button></nav>
        <a className="back-home" href="/">← 참가자 화면</a>
      </aside>
      <section className="admin-main">
        <header><div><span className="live-badge"><i /> LIVE</span><small>{updated ? `${updated.toLocaleTimeString("ko-KR")} 업데이트` : "연결 중"}</small></div>{tab === "status" && <button className="reset-button" onClick={reset}>전체 초기화</button>}</header>
        {tab === "status" ? (
          <>
            <div className="admin-heading"><p>각 조의 위치를 한눈에 확인하고 직접 변경할 수 있어요.</p><h1>실시간 방 현황</h1></div>
            <div className="summary-row"><div><span>전체 조</span><strong>{teams.length}</strong></div><div><span>활동 중</span><strong>{states.filter((s) => s.currentRoom).length}</strong></div><div><span>대기 중</span><strong>{states.filter((s) => !s.currentRoom).length}</strong></div></div>
            <div className="admin-rooms">{rooms.map((room) => {
              const assignedTeams = teams.filter((team) => team.room === room.key);
              const inRoom = assignedTeams.filter((team) => states.find((state) => state.teamId === team.id)?.currentRoom === room.key);
              return <article key={room.key} style={{ "--accent": room.color, "--soft": room.soft } as React.CSSProperties}><div className="admin-room-top"><div className="admin-room-mark">{room.mark}</div><div><h2>{room.name}</h2><p>{room.location}</p></div><strong>{inRoom.length}<span>/{assignedTeams.length}</span></strong></div><div className="admin-team-list">{assignedTeams.map((team) => { const state = states.find((item) => item.teamId === team.id); const active = state?.currentRoom === room.key; return <div key={team.id}><span className={active ? "status-dot active" : "status-dot"} /><b>{team.label}</b><small>{active ? "활동 중" : "대기 중"}</small><button onClick={() => updateTeam(team.id, active ? null : room.key)}>{active ? "퇴장" : "입장"}</button></div>; })}</div></article>;
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
        ) : (
          <>
            <div className="admin-heading"><p>각 방의 입구와 출구에 해당 QR을 인쇄해 부착하세요.</p><h1>입장 · 퇴장 QR</h1></div>
            <div className="qr-grid">{rooms.map((room) => <article key={room.key} style={{ "--accent": room.color, "--soft": room.soft } as React.CSSProperties}><div className="qr-room-title"><span>{room.mark}</span><div><h2>{room.name}</h2><p>{room.location}</p></div></div><div className="qr-pair">{(["enter", "exit"] as const).map((action) => <div className={`qr-box ${action}`} key={action}><div className="qr-label">{action === "enter" ? "입장 QR" : "퇴장 QR"}</div>{qrCodes[`${room.key}-${action}`] ? <img src={qrCodes[`${room.key}-${action}`]} alt={`${room.name} ${action === "enter" ? "입장" : "퇴장"} QR`} /> : <div className="qr-loading" />}<small>{action === "enter" ? "CHECK IN" : "CHECK OUT"}</small></div>)}</div></article>)}</div>
          </>
        )}
      </section>
    </main>
  );
}
