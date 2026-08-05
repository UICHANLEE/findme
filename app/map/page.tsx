import type { Metadata } from "next";
import MapScreen from "./map-screen";

export const metadata: Metadata = {
  title: "생활관 층별 안내 | FIND IT",
  description: "생활관 1층과 2층의 호수와 주요 공간을 한눈에 확인하는 FIND IT 층별 안내",
};

export default function MapPage() {
  return <MapScreen />;
}
