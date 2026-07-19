"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { cleanTeamName, getRoom, type RoomKey } from "../../lib/find-data";

type CameraState = "starting" | "scanning" | "processing" | "success" | "error";

const pause = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export default function ScannerPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const busyRef = useRef(false);
  const [teamName, setTeamName] = useState("");
  const [cameraState, setCameraState] = useState<CameraState>("starting");
  const [message, setMessage] = useState("카메라를 준비하고 있어요…");
  const [attempt, setAttempt] = useState(0);
  const [transition, setTransition] = useState<{ action: "enter" | "exit"; color: string; roomKey: RoomKey } | null>(null);
  const transitionRoom = getRoom(transition?.roomKey ?? null);

  const handleCode = useCallback(async (rawValue: string) => {
    if (busyRef.current) return;

    let url: URL;
    try {
      url = new URL(rawValue);
      if (url.origin !== window.location.origin || url.pathname !== "/scan") throw new Error("invalid");
    } catch {
      setMessage("FIND IT 입장·퇴장 QR을 비춰 주세요.");
      return;
    }

    const room = getRoom(url.searchParams.get("room"));
    const action = url.searchParams.get("action");
    if (!room || (action !== "enter" && action !== "exit")) {
      setMessage("사용할 수 없는 QR이에요. 문에 붙은 QR을 확인해 주세요.");
      return;
    }

    const savedTeam = cleanTeamName(localStorage.getItem("find-team") || "");
    if (!savedTeam) {
      router.replace("/");
      return;
    }

    busyRef.current = true;
    setTransition({ action, color: room.color, roomKey: room.key });
    setCameraState("processing");
    setMessage(action === "enter" ? `${room.name} 입장 처리 중…` : `${room.name} 퇴장 처리 중…`);
    controlsRef.current?.stop();

    try {
      const response = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName: savedTeam, room: room.key, action }),
      });
      const data = await response.json() as { code?: string; error?: string; teamName?: string; collectedRoom?: string | null };
      if (data.code === "ROOM_FULL") {
        window.alert(data.error || "현재 입장 가능한 조가 모두 찼어요. 다른 방을 찾아가세요!!");
        router.replace("/");
        return;
      }
      if (!response.ok) throw new Error(data.error || "처리하지 못했습니다.");
      const confirmedTeam = data.teamName || savedTeam;
      localStorage.setItem("find-team", confirmedTeam);
      setCameraState("success");
      setMessage(action === "enter" ? `${room.name} 입장이 완료됐어요!` : "퇴장이 완료됐어요. 다음 방을 찾아볼까요?");
      await pause(action === "exit" ? 1050 : 850);
      router.replace(action === "enter"
        ? `/room/${room.key}?team=${encodeURIComponent(confirmedTeam)}&welcome=1`
        : `/?team=${encodeURIComponent(confirmedTeam)}${data.collectedRoom ? `&collect=${data.collectedRoom}` : ""}`);
    } catch (caught) {
      busyRef.current = false;
      setCameraState("error");
      setMessage(caught instanceof Error ? caught.message : "처리하지 못했어요. 다시 시도해 주세요.");
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      await Promise.resolve();
      if (cancelled) return;
      const savedTeam = cleanTeamName(localStorage.getItem("find-team") || "");
      if (!savedTeam) {
        router.replace("/");
        return;
      }
      setTeamName(savedTeam);

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState("error");
        setMessage("이 브라우저에서는 카메라를 사용할 수 없어요.");
        return;
      }

      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 150 });
      setCameraState("starting");
      setMessage("카메라 사용을 허용해 주세요.");

      reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: "environment" } } },
        videoRef.current || undefined,
        (result) => {
          if (result && !cancelled) void handleCode(result.getText());
        },
      ).then((controls) => {
        if (cancelled) return controls.stop();
        controlsRef.current = controls;
        setCameraState("scanning");
        setMessage("입구 또는 출구 QR을 사각형 안에 맞춰 주세요.");
      }).catch(() => {
        if (!cancelled) {
          setCameraState("error");
          setMessage("카메라를 열 수 없어요. 권한을 허용한 뒤 다시 시도해 주세요.");
        }
      });
    };
    void start();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [attempt, handleCode, router]);

  const retry = () => {
    busyRef.current = false;
    setAttempt((value) => value + 1);
  };

  return (
    <main className={`camera-shell camera-${cameraState} ${transition ? `camera-${transition.action}` : ""}`} style={{ "--transition-color": transition?.color || "#171713" } as React.CSSProperties}>
      <video ref={videoRef} className="camera-preview" muted playsInline aria-label="QR 스캔 카메라" />
      <div className="camera-shade" aria-hidden="true" />
      <header className="camera-header">
        <Link href="/" aria-label="뒤로 가기">←</Link>
        <span>FIND <b>IT</b> QR</span>
        <div>{teamName || "우리 조"}</div>
      </header>
      <section className="camera-guide">
        <div className="camera-frame"><i /><i /><i /><i /><span>{cameraState === "success" ? "✓" : ""}</span></div>
        <p><b>{cameraState === "success" ? "반영 완료!" : cameraState === "processing" ? "QR을 확인했어요" : cameraState === "error" ? "카메라 확인이 필요해요" : "QR을 비춰 주세요"}</b>{message}</p>
        {cameraState === "error" && <button type="button" onClick={retry}>카메라 다시 열기</button>}
      </section>
      {cameraState === "success" && transition?.action === "exit" && transitionRoom && <div className="exit-logo-handoff" style={{ "--accent": transitionRoom.color, "--soft": transitionRoom.soft } as React.CSSProperties}>
        <span>ROOM COMPLETE</span>
        <Image src={transitionRoom.emblem} alt={`${transitionRoom.name} 로고에서 파츠를 꺼내는 중`} width={600} height={600} priority />
        <strong>{transitionRoom.name}</strong>
        <small>발견한 파츠를 포스터로 옮길게요</small>
      </div>}
      <div className="camera-footer"><span className={cameraState === "scanning" ? "active" : ""} /> 스캔하면 별도 확인 없이 바로 반영됩니다</div>
    </main>
  );
}
