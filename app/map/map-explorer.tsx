"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { getRoom, type RoomKey } from "../../lib/find-data";
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

type GuideTarget = {
  floor: FloorKey;
  locationId: string;
  locationLabel: string;
  point: RoutePoint;
  pathToHub: RoutePoint[];
};

type ParticipantGuide = {
  target: GuideTarget;
  message: string;
};

type RoutePoint = {
  x: number;
  y: number;
};

type RouteStage = {
  floor: FloorKey;
  points: RoutePoint[];
  title: string;
  instruction: string;
  startLabel: string;
  endLabel: string;
};

type RoutePlan = {
  mode: "same-floor" | "floor-change";
  stages: RouteStage[];
};

type MapExplorerProps = {
  teamName?: string;
  guideKey?: RoomKey;
  fromKey?: RoomKey;
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
      { id: "outside", label: "외부 출구", x: 94, y: 52, featured: true },
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

const createGuideTarget = (
  floor: FloorKey,
  locationId: string,
  locationLabel: string,
  pathToHub: RoutePoint[],
): GuideTarget => {
  const location = getFloorLocations(floorByKey[floor]).find(
    (item) => item.id === locationId,
  );

  if (!location) {
    throw new Error(`Unknown map location: ${floor}/${locationId}`);
  }

  const point = { x: location.x, y: location.y };
  return {
    floor,
    locationId,
    locationLabel,
    point,
    pathToHub: [point, ...pathToHub],
  };
};

const routeTargets: Record<RoomKey, GuideTarget> = {
  eyes: createGuideTarget("1f", "small-hall", "1층 소강당", [
    { x: 36, y: 66 },
    { x: 36, y: 52 },
  ]),
  sound: createGuideTarget("2f", "211", "2층 211호", [
    { x: 33.8, y: 34 },
    { x: 36, y: 34 },
  ]),
  body: createGuideTarget("1f", "outside", "1층 외부 출구", [
    { x: 84, y: 52 },
    { x: 68, y: 52 },
    { x: 50, y: 52 },
    { x: 36, y: 52 },
  ]),
  heart: createGuideTarget("2f", "221", "2층 221호", [
    { x: 29.3, y: 66 },
    { x: 36, y: 66 },
    { x: 36, y: 34 },
  ]),
  grace: createGuideTarget("2f", "202", "2층 202호", [
    { x: 80, y: 66 },
    { x: 68, y: 66 },
    { x: 68, y: 34 },
    { x: 36, y: 34 },
  ]),
};

const participantGuides: Record<RoomKey, ParticipantGuide> = {
  eyes: {
    target: routeTargets.eyes,
    message: "현재 위치에서 1층 소강당까지 점선을 따라 안내할게요.",
  },
  sound: {
    target: routeTargets.sound,
    message: "현재 위치에서 2층 211호까지 점선을 따라 안내할게요.",
  },
  body: {
    target: routeTargets.body,
    message: "1층 외부 출구까지 안내한 뒤, 현장 진행자의 안내를 따라 이동해 주세요.",
  },
  heart: {
    target: routeTargets.heart,
    message: "현재 위치에서 2층 221호까지 점선을 따라 안내할게요.",
  },
  grace: {
    target: routeTargets.grace,
    message: "현재 위치에서 2층 202호까지 점선을 따라 안내할게요.",
  },
};

const stairPaths: Record<FloorKey, RoutePoint[]> = {
  "1f": [
    { x: 36, y: 52 },
    { x: 36, y: 26 },
  ],
  "2f": [
    { x: 36, y: 34 },
    { x: 36, y: 26 },
  ],
};

const reversePoints = (points: RoutePoint[]) => [...points].reverse();

const buildRoutePlan = (
  origin: GuideTarget | undefined,
  destination: GuideTarget | undefined,
): RoutePlan | null => {
  if (
    !origin
    || !destination
    || (
      origin.floor === destination.floor
      && origin.locationId === destination.locationId
    )
  ) {
    return null;
  }

  if (origin.floor === destination.floor) {
    const points = [
      ...origin.pathToHub,
      ...reversePoints(destination.pathToHub).slice(1),
    ];

    return {
      mode: "same-floor",
      stages: [{
        floor: origin.floor,
        points,
        title: `${origin.locationLabel} → ${destination.locationLabel}`,
        instruction: `점선을 따라 ${destination.locationLabel}까지 이동해 주세요.`,
        startLabel: "현재 위치",
        endLabel: destination.locationLabel,
      }],
    };
  }

  const originStairPath = stairPaths[origin.floor];
  const destinationStairPath = reversePoints(stairPaths[destination.floor]);

  return {
    mode: "floor-change",
    stages: [
      {
        floor: origin.floor,
        points: [
          ...origin.pathToHub,
          ...originStairPath.slice(1),
        ],
        title: `${origin.locationLabel} → 계단`,
        instruction: `점선을 따라 ${origin.floor === "1f" ? "1층" : "2층"} 계단까지 이동해 주세요.`,
        startLabel: "현재 위치",
        endLabel: "계단",
      },
      {
        floor: destination.floor,
        points: [
          ...destinationStairPath,
          ...reversePoints(destination.pathToHub).slice(1),
        ],
        title: `계단 → ${destination.locationLabel}`,
        instruction: `${destination.floor === "1f" ? "1층" : "2층"}에 도착했어요. 점선을 따라 ${destination.locationLabel}까지 이동해 주세요.`,
        startLabel: "계단",
        endLabel: destination.locationLabel,
      },
    ],
  };
};

const routePathData = (points: RoutePoint[], floor: Floor) => {
  const scaled = points.map((point) => ({
    x: (point.x / 100) * floor.width,
    y: (point.y / 100) * floor.height,
  }));

  if (scaled.length < 2) {
    return "";
  }

  const commands = [`M ${scaled[0].x} ${scaled[0].y}`];

  for (let index = 1; index < scaled.length - 1; index += 1) {
    const previous = scaled[index - 1];
    const current = scaled[index];
    const next = scaled[index + 1];
    const incomingDistance = Math.hypot(
      current.x - previous.x,
      current.y - previous.y,
    );
    const outgoingDistance = Math.hypot(
      next.x - current.x,
      next.y - current.y,
    );

    if (incomingDistance === 0 || outgoingDistance === 0) {
      continue;
    }

    const radius = Math.min(
      28,
      incomingDistance * 0.18,
      outgoingDistance * 0.18,
    );
    const before = {
      x: current.x - ((current.x - previous.x) / incomingDistance) * radius,
      y: current.y - ((current.y - previous.y) / incomingDistance) * radius,
    };
    const after = {
      x: current.x + ((next.x - current.x) / outgoingDistance) * radius,
      y: current.y + ((next.y - current.y) / outgoingDistance) * radius,
    };

    commands.push(
      `L ${before.x} ${before.y}`,
      `Q ${current.x} ${current.y} ${after.x} ${after.y}`,
    );
  }

  const end = scaled.at(-1)!;
  commands.push(`L ${end.x} ${end.y}`);
  return commands.join(" ");
};

const markerStyle = (point: RoutePoint) => ({
  left: `${Math.min(92, Math.max(7, point.x))}%`,
  top: `${Math.min(91, Math.max(9, point.y))}%`,
} as CSSProperties);

function RouteOverlay({
  stage,
  stageIndex,
  runId,
}: {
  stage: RouteStage;
  stageIndex: number;
  runId: number;
}) {
  const floor = floorByKey[stage.floor];
  const pathData = routePathData(stage.points, floor);
  const start = stage.points[0];
  const end = stage.points.at(-1)!;
  const maskId = `route-mask-${stage.floor}-${stageIndex}-${runId}`;
  const stageDelaySeconds = stageIndex > 0 ? 0.68 : 0.12;

  return (
    <div
      className={styles.routeLayer}
      data-testid="route-overlay"
      data-route-floor={stage.floor}
      style={{
        "--route-delay": `${stageDelaySeconds}s`,
        "--route-duration": "3.4s",
      } as CSSProperties}
      aria-hidden="true"
    >
      <svg
        viewBox={`0 0 ${floor.width} ${floor.height}`}
        preserveAspectRatio="none"
      >
        <defs>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x={-floor.width * 0.05}
            y={-floor.height * 0.05}
            width={floor.width * 1.1}
            height={floor.height * 1.1}
          >
            <path
              className={styles.routeReveal}
              d={pathData}
              pathLength="1"
            />
          </mask>
        </defs>
        <path
          className={styles.routeBasePath}
          d={pathData}
        />
        <path
          className={styles.routeHalo}
          d={pathData}
          mask={`url(#${maskId})`}
        />
        <path
          className={styles.routePath}
          data-testid="route-path"
          d={pathData}
          mask={`url(#${maskId})`}
        />
      </svg>
      <span
        className={`${styles.routeMarker} ${styles.routeOrigin}`}
        style={markerStyle(start)}
      >
        <i />
        {stage.startLabel}
      </span>
      <span
        className={`${styles.routeMarker} ${styles.routeTarget}`}
        style={markerStyle(end)}
      >
        <i />
        {stage.endLabel}
      </span>
    </div>
  );
}

const ROUTE_STAGE_DURATION_MS = 4_900;

export default function MapExplorer({
  teamName,
  guideKey,
  fromKey,
}: MapExplorerProps) {
  const guide = guideKey ? participantGuides[guideKey] : null;
  const guideRoom = guideKey ? getRoom(guideKey) : undefined;
  const fromRoom = fromKey ? getRoom(fromKey) : undefined;
  const guideTarget = guide?.target ?? null;
  const fromTarget = fromKey ? routeTargets[fromKey] : undefined;
  const routePlan = useMemo(
    () => buildRoutePlan(fromTarget, guideTarget ?? undefined),
    [fromTarget, guideTarget],
  );
  const initialRouteStage = routePlan?.stages[0];
  const [floorKey, setFloorKey] = useState<FloorKey>(
    initialRouteStage?.floor ?? guideTarget?.floor ?? "1f",
  );
  const [routeStageIndex, setRouteStageIndex] = useState(0);
  const [routeRunId, setRouteRunId] = useState(0);
  const [routeAutoplay, setRouteAutoplay] = useState(true);
  const [selectedByFloor, setSelectedByFloor] = useState<
    Record<FloorKey, string | null>
  >(() => ({
    "1f": guideTarget?.floor === "1f"
      ? guideTarget.locationId
      : guide
        ? null
        : "104",
    "2f": guideTarget?.floor === "2f"
      ? guideTarget.locationId
      : guide
        ? null
        : "201",
  }));
  const activeRouteStage = routePlan?.stages[routeStageIndex] ?? null;

  const activeFloor = floorByKey[floorKey];
  const selectedLocationId = selectedByFloor[floorKey];
  const selectedLocation = getFloorLocations(activeFloor).find(
    (location) => location.id === selectedLocationId,
  );
  const activeRoomList = [...activeFloor.rooms].sort(
    (left, right) => Number(left.number) - Number(right.number),
  );

  useEffect(() => {
    if (
      !routePlan
      || !routeAutoplay
      || routeStageIndex >= routePlan.stages.length - 1
    ) {
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = window.setTimeout(() => {
      const nextIndex = routeStageIndex + 1;
      setRouteStageIndex(nextIndex);
      setFloorKey(routePlan.stages[nextIndex].floor);
    }, reducedMotion ? 0 : ROUTE_STAGE_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [routeAutoplay, routePlan, routeRunId, routeStageIndex]);

  const selectFloor = (nextFloor: FloorKey) => {
    setRouteAutoplay(false);
    setFloorKey(nextFloor);
  };

  const selectLocation = (nextFloor: FloorKey, locationId: string) => {
    setRouteAutoplay(false);
    setFloorKey(nextFloor);
    setSelectedByFloor((current) => ({
      ...current,
      [nextFloor]: locationId,
    }));
  };

  const replayGuidance = () => {
    if (!routePlan) {
      if (guideTarget) {
        selectLocation(guideTarget.floor, guideTarget.locationId);
      }
      return;
    }

    setRouteAutoplay(true);
    setRouteStageIndex(0);
    setFloorKey(routePlan.stages[0].floor);
    setRouteRunId((current) => current + 1);
  };

  return (
    <section
      className={styles.explorer}
      id="floor-directory"
      aria-label="생활관 층별 안내"
      style={guideRoom ? {
        "--route-accent": guideRoom.color,
        "--route-soft": guideRoom.soft,
      } as CSSProperties : undefined}
    >
      {guide && guideRoom && (
        <aside
          className={`${styles.participantGuide} ${
            guideTarget ? styles.guideLocated : styles.guideUnresolved
          }`}
          style={{
            "--guide-accent": guideRoom.color,
            "--guide-soft": guideRoom.soft,
          } as CSSProperties}
          aria-labelledby="participant-guide-title"
        >
          <div className={styles.guideCopy}>
            <span>
              {teamName ? `${teamName} · PARTICIPANT GUIDE` : "PARTICIPANT GUIDE"}
            </span>
            <h2 id="participant-guide-title">{guideRoom.name}</h2>
            <p>
              {routePlan && fromRoom
                ? `${fromRoom.name}에서 출발해요. ${guide.message}`
                : guide.message}
            </p>
          </div>
          <div className={styles.guideAction}>
            {fromRoom && (
              <small>
                방금 나온 방 <b>{fromRoom.name}</b>
              </small>
            )}
            {guideTarget ? (
              <button
                type="button"
                onClick={replayGuidance}
              >
                {routePlan ? "점선 길안내 다시 보기" : `${guideTarget.locationLabel} 다시 보기`}
              </button>
            ) : (
              <strong>현장 안내를 따라 이동해 주세요</strong>
            )}
          </div>
        </aside>
      )}

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
          <h2>
            {routePlan && fromRoom && guideRoom
              ? `${fromRoom.short}에서 ${guideRoom.short}까지`
              : guideRoom
                ? `${guideRoom.name} 위치 안내`
                : `${activeFloor.label} 공간 안내`}
          </h2>
          <p>
            {routePlan
              ? "현재 위치에서 시작하는 붉은 점선을 천천히 따라가세요."
              : "층을 바꾸고 호수나 주요 공간을 고르면 지도에 위치가 표시됩니다."}
          </p>
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
          data-route-mode={routePlan?.mode ?? "none"}
        >
          {floors.map((item) => {
            const active = floorKey === item.key;
            const selected = selectedByFloor[item.key];
            const routeDestinationId = routePlan && guideTarget?.floor === item.key
              ? guideTarget.locationId
              : null;
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
                  {active && activeRouteStage?.floor === item.key && (
                    <RouteOverlay
                      key={`${routeRunId}-${routeStageIndex}-${item.key}`}
                      stage={activeRouteStage}
                      stageIndex={routeStageIndex}
                      runId={routeRunId}
                    />
                  )}
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
                        } ${
                          routeDestinationId === room.number
                            ? styles.routeDestinationLocation
                            : ""
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
                          } ${
                            routeDestinationId === space.id
                              ? styles.routeDestinationLocation
                              : ""
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
                  {active && !routePlan && selectedSpot?.kind === "room" && (
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

          {routePlan && activeRouteStage && (
            <div
              className={styles.routeStatus}
              data-testid="map-route"
              data-route-from={fromKey}
              data-route-to={guideKey}
              data-route-mode={routePlan.mode}
              data-route-stage={routeStageIndex + 1}
              role="status"
              aria-live="polite"
            >
              <span>
                {routePlan.mode === "floor-change"
                  ? `STEP ${routeStageIndex + 1} / ${routePlan.stages.length}`
                  : "WALKING ROUTE"}
              </span>
              <b>{activeRouteStage.instruction}</b>
              <small>{activeRouteStage.title}</small>
            </div>
          )}

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
            {selectedLocation
              ? `${activeFloor.label} · ${selectedLocation.label}`
              : guide && !guideTarget
                ? "현장 안내가 필요한 장소"
                : `${activeFloor.label} · 위치 선택`}
          </strong>
          <p>
            {guide && !guideTarget
              ? guide.message
              : "선택한 호수와 주요 공간이 안내도 위에 진하게 표시됩니다."}
          </p>
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
