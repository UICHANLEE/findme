import type { Metadata } from "next";
import { type RoomKey } from "../../lib/find-data";
import MapScreen from "../map/map-screen";

export const metadata: Metadata = {
  title: "생활관 길안내 | FIND IT",
  description: "조별 현재 위치에서 다음 FIND IT 방까지 안내하는 생활관 지도",
};

type MapPageProps = {
  searchParams: Promise<{
    team?: string | string[];
    guide?: string | string[];
    from?: string | string[];
  }>;
};

const roomKeys = new Set<RoomKey>([
  "eyes",
  "sound",
  "body",
  "heart",
  "grace",
]);

const firstParam = (value: string | string[] | undefined) => {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || "";
};

const asRoomKey = (value: string) => (
  roomKeys.has(value as RoomKey) ? value as RoomKey : undefined
);

export default async function MapJourneyPage({ searchParams }: MapPageProps) {
  const query = await searchParams;
  const teamName = firstParam(query.team).slice(0, 24);
  const guideKey = asRoomKey(firstParam(query.guide));
  const fromKey = asRoomKey(firstParam(query.from));
  const homeQuery = new URLSearchParams();
  if (teamName) homeQuery.set("team", teamName);
  if (fromKey) homeQuery.set("from", fromKey);
  const homeSearch = homeQuery.toString();
  const homeHref = homeSearch ? `/?${homeSearch}` : "/";

  return (
    <MapScreen
      navigation
      homeHref={homeHref}
      teamName={teamName || undefined}
      guideKey={guideKey}
      fromKey={fromKey}
    />
  );
}
