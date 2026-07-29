"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import {
  rooms,
  type RoomKey,
  type RoomLiveStatus,
} from "../../lib/find-data";

type JourneyAssistProps = {
  teamName: string;
  previousRoomKey: RoomKey;
  previousRoomDurationSeconds: number | null;
  completedRooms: RoomKey[];
  roomStatuses: Record<RoomKey, RoomLiveStatus>;
};

const durationLabel = (seconds: number | null) => {
  if (seconds === null) return "활동을 잘 마쳤어요";
  if (seconds < 60) return `${seconds}초 동안 함께했어요`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds
    ? `${minutes}분 ${remainingSeconds}초 동안 함께했어요`
    : `${minutes}분 동안 함께했어요`;
};

export default function JourneyAssist({
  teamName,
  previousRoomKey,
  previousRoomDurationSeconds,
  completedRooms,
  roomStatuses,
}: JourneyAssistProps) {
  const [selectedRoomKey, setSelectedRoomKey] = useState<RoomKey | null>(null);
  const previousRoom = rooms.find((room) => room.key === previousRoomKey);
  const selectedRoom = rooms.find((room) => room.key === selectedRoomKey);
  const selectedStatus = selectedRoomKey ? roomStatuses[selectedRoomKey] : null;
  const completedRoomKeys = new Set(completedRooms);
  const mapHref = (guide?: RoomKey) =>
    `/map?team=${encodeURIComponent(teamName)}${
      guide ? `&guide=${encodeURIComponent(guide)}` : ""
    }&from=${encodeURIComponent(previousRoomKey)}#floor-directory`;

  if (!previousRoom) return null;

  return (
    <section className="journey-assist-shell" aria-labelledby="journey-assist-title">
      <div className="journey-assist">
        <div
          className="journey-previous"
          style={{ "--accent": previousRoom.color, "--soft": previousRoom.soft } as CSSProperties}
        >
          <span className="journey-assist-kicker">PREVIOUS FIND</span>
          <div className="journey-previous-room">
            <Image
              src={previousRoom.emblem}
              alt=""
              width={72}
              height={72}
            />
            <div>
              <small>방금 나온 방</small>
              <strong>{previousRoom.name}</strong>
              <p>{previousRoom.location}</p>
            </div>
          </div>
          <div className="journey-previous-duration">
            <span aria-hidden="true">✓</span>
            <b>{durationLabel(previousRoomDurationSeconds)}</b>
          </div>
        </div>

        <div className="journey-planner">
          <div className="journey-planner-heading">
            <div>
              <span className="journey-assist-kicker">CHOOSE YOUR NEXT FIND</span>
              <h2 id="journey-assist-title">다음 장소는 직접 선택해요</h2>
            </div>
            <p>정해진 순서는 없어요. 미완료 방을 눌러 현황과 길안내를 확인하세요.</p>
          </div>

          <div className="journey-live-grid" aria-label="다섯 방 실시간 현황">
            {rooms.map((room) => {
              const status = roomStatuses[room.key];
              const completed = completedRoomKeys.has(room.key);
              const selected = selectedRoomKey === room.key;
              const availability = completed
                ? "완료"
                : status.isFull
                  ? "현재 만실"
                  : `${status.availableSlots}개 조 가능`;

              return (
                <button
                  className={`journey-live-room ${selected ? "selected" : ""} ${
                    completed ? "completed" : ""
                  } ${status.isFull && !completed ? "full" : ""}`}
                  style={{ "--accent": room.color, "--soft": room.soft } as CSSProperties}
                  type="button"
                  key={room.key}
                  onClick={() => setSelectedRoomKey(room.key)}
                  disabled={completed}
                  aria-pressed={selected}
                  aria-label={`${room.name}, ${completed ? "완료" : "미완료"}, ${availability}`}
                >
                  <span>
                    <i aria-hidden="true" />
                    {completed ? "완료" : "미완료"}
                  </span>
                  <strong>{room.short}</strong>
                  <small>{availability}</small>
                  <b>
                    {status.insideCount}
                    <em>/{status.maxTeams}</em>
                  </b>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="journey-directions" aria-live="polite">
          <span className="journey-assist-kicker">DIRECTIONS</span>
          {selectedRoom && selectedStatus ? (
            <>
              <strong>{selectedRoom.name}</strong>
              <div className={`journey-direction-status ${selectedStatus.isFull ? "full" : ""}`}>
                <i aria-hidden="true" />
                {selectedStatus.isFull
                  ? "현재 만실이에요"
                  : `${selectedStatus.availableSlots}개 조 입장 가능`}
              </div>
              <p>
                {selectedRoom.navigation
                  ? `${selectedRoom.navigation.floor === "1f" ? "1층" : "2층"} ${selectedRoom.location}에서 진행해요.`
                  : "생활관 밖 외부 활동 장소로 이동한 뒤 현장 진행자의 안내를 따라 주세요."}
              </p>
              <Link href={mapHref(selectedRoom.key)}>
                {selectedRoom.navigation ? `${selectedRoom.location} 지도 보기` : "외부 이동 안내 보기"}
                <span aria-hidden="true">↗</span>
              </Link>
              {selectedStatus.isFull ? (
                <small>다른 미완료 방도 직접 확인하거나 현장에서 대기 안내를 받아 주세요.</small>
              ) : null}
            </>
          ) : (
            <>
              <strong>찾아갈 방을 눌러 주세요</strong>
              <p>선택한 방의 실시간 정원과 확인 가능한 위치 안내가 여기에 표시돼요.</p>
              <Link href={mapHref()}>
                전체 층별 지도
                <span aria-hidden="true">↗</span>
              </Link>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
