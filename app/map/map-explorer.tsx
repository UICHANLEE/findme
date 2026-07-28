"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./map.module.css";

type FloorKey = "1f" | "2f";

type RoomSpot = {
  number: string;
  x: number;
  y: number;
};

type SharedSpaceSpot = {
  id: string;
  label: string;
  x: number;
  y: number;
  featured?: boolean;
};

type MapLocation = {
  id: string;
  label: string;
  x: number;
  y: number;
  kind: "room" | "space";
  featured?: boolean;
};

type Floor = {
  key: FloorKey;
  label: string;
  image: string;
  width: number;
  height: number;
  rooms: RoomSpot[];
  sharedSpaces: SharedSpaceSpot[];
};

const floors: Floor[] = [
  {
    key: "2f",
    label: "2층",
    image: "/maps/directory-2f.webp",
    width: 1665,
    height: 537,
    rooms: [
      { number: "218", x: 8.6, y: 18.5 },
      { number: "217", x: 12.2, y: 18.5 },
      { number: "216", x: 15.8, y: 18.5 },
      { number: "215", x: 19.4, y: 18.5 },
      { number: "214", x: 23, y: 18.5 },
      { number: "213", x: 26.6, y: 18.5 },
      { number: "212", x: 30.2, y: 18.5 },
      { number: "211", x: 33.8, y: 18.5 },
      { number: "210", x: 72, y: 18.5 },
      { number: "209", x: 77, y: 18.5 },
      { number: "208", x: 82, y: 18.5 },
      { number: "207", x: 87, y: 18.5 },
      { number: "206", x: 92, y: 18.5 },
      { number: "219", x: 17.3, y: 78.5 },
      { number: "220", x: 23.3, y: 78.5 },
      { number: "221", x: 29.3, y: 78.5 },
      { number: "201", x: 75, y: 78.5 },
      { number: "202", x: 80, y: 78.5 },
      { number: "203", x: 85, y: 78.5 },
      { number: "204", x: 90, y: 78.5 },
      { number: "205", x: 94.5, y: 78.5 },
    ],
    sharedSpaces: [
      { id: "seminar-2", label: "세미나실 2", x: 50.5, y: 18.5, featured: true },
      { id: "lobby-2f", label: "2층 로비", x: 50, y: 53, featured: true },
      { id: "clinic", label: "양호실", x: 68.3, y: 78.5 },
    ],
  },
  {
    key: "1f",
    label: "1층",
    image: "/maps/directory-1f.webp",
    width: 1661,
    height: 530,
    rooms: [
      { number: "109", x: 9, y: 18.5 },
      { number: "108", x: 13.7, y: 18.5 },
      { number: "107", x: 18.4, y: 18.5 },
      { number: "106", x: 23.1, y: 18.5 },
      { number: "105", x: 27.8, y: 18.5 },
      { number: "104", x: 32.5, y: 18.5 },
      { number: "102", x: 89, y: 79.5 },
      { number: "101", x: 94, y: 79.5 },
    ],
    sharedSpaces: [
      { id: "main-hall", label: "대강당", x: 14, y: 55, featured: true },
      { id: "small-hall", label: "소강당", x: 26.5, y: 69, featured: true },
      { id: "youth-plaza", label: "청춘광장", x: 50, y: 53, featured: true },
      { id: "cafeteria", label: "식당", x: 84, y: 34, featured: true },
      { id: "seminar-1", label: "세미나실 1", x: 80.5, y: 79.5, featured: true },
      { id: "director-office", label: "원장실", x: 62.5, y: 79.5 },
      { id: "office", label: "사무실", x: 72.5, y: 79.5 },
    ],
  },
];

const floorByKey = Object.fromEntries(
  floors.map((floor) => [floor.key, floor]),
) as Record<FloorKey, Floor>;

const getFloorLocations = (floor: Floor): MapLocation[] => [
  ...floor.rooms.map((room) => ({
    id: room.number,
    label: `${room.number}호`,
    x: room.x,
    y: room.y,
    kind: "room" as const,
  })),
  ...floor.sharedSpaces.map((space) => ({
    ...space,
    kind: "space" as const,
  })),
];

export default function MapExplorer() {
  const [floorKey, setFloorKey] = useState<FloorKey>("1f");
  const [selectedByFloor, setSelectedByFloor] = useState<Record<FloorKey, string>>({
    "1f": "104",
    "2f": "201",
  });

  const activeFloor = floorByKey[floorKey];
  const selectedLocationId = selectedByFloor[floorKey];
  const selectedLocation = getFloorLocations(activeFloor).find(
    (location) => location.id === selectedLocationId,
  );
  const activeRoomList = [...activeFloor.rooms].sort(
    (left, right) => Number(left.number) - Number(right.number),
  );

  const selectFloor = (nextFloor: FloorKey) => {
    setFloorKey(nextFloor);
  };

  const selectLocation = (nextFloor: FloorKey, locationId: string) => {
    setFloorKey(nextFloor);
    setSelectedByFloor((current) => ({
      ...current,
      [nextFloor]: locationId,
    }));
  };

  return (
    <section className={styles.explorer} aria-label="생활관 층별 안내">
      <div className={styles.floorTabs} aria-label="층 선택">
        {(["1f", "2f"] as FloorKey[]).map((key) => {
          const item = floorByKey[key];
          const active = floorKey === key;

          return (
            <button
              className={active ? styles.activeFloor : ""}
              type="button"
              key={key}
              onClick={() => selectFloor(key)}
              aria-pressed={active}
            >
              <span>{item.label}</span>
              <small>
                {item.rooms.length}개 호실 · {item.sharedSpaces.length}개 주요 공간
              </small>
            </button>
          );
        })}
      </div>

      <div className={styles.mapHeader}>
        <div>
          <span>FLOOR DIRECTORY</span>
          <h2>{activeFloor.label} 공간 안내</h2>
          <p>층을 바꾸고 호수나 주요 공간을 고르면 지도에 위치가 표시됩니다.</p>
        </div>
        <div className={styles.currentFloor} aria-hidden="true">
          {floorKey === "1f" ? "1F" : "2F"}
        </div>
      </div>

      <div className={styles.stackViewport}>
        <div
          className={styles.floorStack}
          data-testid="floor-stack"
          data-current-floor={floorKey}
        >
          {floors.map((item) => {
            const active = floorKey === item.key;
            const selected = selectedByFloor[item.key];
            const selectedSpot = getFloorLocations(item).find(
              (location) => location.id === selected,
            );

            return (
              <article
                className={`${styles.floorLayer} ${styles[item.key]} ${
                  active ? styles.activeLayer : styles.inactiveLayer
                }`}
                key={item.key}
                data-floor={item.key}
                data-active={active}
              >
                <div className={styles.plateCanvas}>
                  <Image
                    className={styles.plateImage}
                    src={item.image}
                    alt={`${item.label} 호수 안내도`}
                    width={item.width}
                    height={item.height}
                    sizes="(max-width: 700px) calc(100vw - 40px), 92vw"
                    priority
                  />
                  <button
                    className={styles.layerSelect}
                    type="button"
                    onClick={() => selectFloor(item.key)}
                    aria-label={`${item.label}을 앞으로 보기`}
                    aria-pressed={active}
                  >
                    <span className={styles.floorRail}>
                      <b>{item.key === "1f" ? "1F" : "2F"}</b>
                      <small>{active ? "현재 층" : "눌러 보기"}</small>
                    </span>
                  </button>
                  <div className={styles.roomOverlay}>
                    {item.rooms.map((room) => (
                      <button
                        className={`${styles.roomButton} ${
                          selected === room.number ? styles.activeRoom : ""
                        }`}
                        style={{ left: `${room.x}%`, top: `${room.y}%` }}
                        type="button"
                        key={room.number}
                        data-room={room.number}
                        onClick={() => selectLocation(item.key, room.number)}
                        disabled={!active}
                        aria-label={`${item.label} ${room.number}호 위치 보기`}
                        aria-pressed={active && selected === room.number}
                      >
                        {room.number}
                      </button>
                    ))}
                  </div>
                  {active && (
                    <div
                      className={styles.sharedSpaceOverlay}
                      aria-label={`${item.label} 주요 공간`}
                    >
                      {item.sharedSpaces.map((space) => (
                        <button
                          className={`${styles.sharedSpaceButton} ${
                            selected === space.id ? styles.activeSpace : ""
                          }`}
                          style={{ left: `${space.x}%`, top: `${space.y}%` }}
                          type="button"
                          key={space.id}
                          data-space={space.id}
                          data-featured={space.featured ? "true" : "false"}
                          onClick={() => selectLocation(item.key, space.id)}
                          aria-label={`${space.label} 위치 보기`}
                          aria-pressed={selected === space.id}
                        >
                          {space.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {active && selectedSpot?.kind === "room" && (
                    <span
                      className={styles.mobileSelectedLocation}
                      style={{ left: `${selectedSpot.x}%`, top: `${selectedSpot.y}%` }}
                      data-testid="mobile-selected-location"
                      data-location={selectedSpot.id}
                      aria-label={`${item.label} ${selectedSpot.label} 선택 위치`}
                    >
                      {selectedSpot.label}
                    </span>
                  )}
                </div>
              </article>
            );
          })}

          <div
            className={styles.mobileFloorSwitcher}
            data-testid="mobile-floor-switcher"
            aria-label="지도 층 선택"
          >
            {(["1f", "2f"] as FloorKey[]).map((key) => {
              const active = floorKey === key;
              return (
                <button
                  className={active ? styles.activeMobileFloor : ""}
                  type="button"
                  key={key}
                  onClick={() => selectFloor(key)}
                  aria-pressed={active}
                  aria-label={`${floorByKey[key].label} 지도 보기`}
                >
                  {key === "1f" ? "1F" : "2F"}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.roomDirectory}>
        <div className={styles.selectedRoom} aria-live="polite">
          <span>YOU ARE VIEWING</span>
          <strong>
            {activeFloor.label} · {selectedLocation?.label ?? "위치 선택"}
          </strong>
          <p>선택한 호수와 주요 공간이 안내도 위에 진하게 표시됩니다.</p>
        </div>
        <div className={styles.directoryLists}>
          <section className={styles.directorySection}>
            <div className={styles.directoryHeading}>
              <strong>주요 공간</strong>
              <small>찾는 장소를 눌러 위치를 확인하세요.</small>
            </div>
            <div
              className={styles.sharedSpaceList}
              aria-label={`${activeFloor.label} 주요 공간 목록`}
            >
              {activeFloor.sharedSpaces.map((space) => (
                <button
                  className={
                    selectedLocationId === space.id ? styles.activeSpaceChip : ""
                  }
                  type="button"
                  key={space.id}
                  data-space={space.id}
                  onClick={() => selectLocation(activeFloor.key, space.id)}
                  aria-pressed={selectedLocationId === space.id}
                >
                  {space.label}
                </button>
              ))}
            </div>
          </section>
          <section className={styles.directorySection}>
            <div className={styles.directoryHeading}>
              <strong>호실</strong>
              <small>{activeRoomList.length}개</small>
            </div>
            <div
              className={styles.roomList}
              data-floor={activeFloor.key}
              aria-label={`${activeFloor.label} 호수 목록`}
            >
              {activeRoomList.map((room) => (
                <button
                  className={
                    selectedLocationId === room.number ? styles.activeRoomChip : ""
                  }
                  type="button"
                  key={room.number}
                  onClick={() => selectLocation(activeFloor.key, room.number)}
                  aria-pressed={selectedLocationId === room.number}
                >
                  {room.number}
                  <small>호</small>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
