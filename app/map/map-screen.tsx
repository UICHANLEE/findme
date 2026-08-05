import Image from "next/image";
import Link from "next/link";
import { type RoomKey } from "../../lib/find-data";
import MapExplorer from "./map-explorer";
import styles from "./map.module.css";

type MapScreenProps = {
  navigation?: boolean;
  homeHref?: string;
  teamName?: string;
  guideKey?: RoomKey;
  fromKey?: RoomKey;
};

const Wordmark = () => (
  <>
    <Image src="/find-it-mark.jpg" alt="" width={52} height={52} priority />
    FIND <span>IT</span>
  </>
);

export default function MapScreen({
  navigation = false,
  homeHref = "/",
  teamName,
  guideKey,
  fromKey,
}: MapScreenProps) {
  return (
    <main
      className={styles.shell}
      data-map-mode={navigation ? "journey" : "standalone"}
    >
      <header className={styles.topbar}>
        {navigation ? (
          <Link className="wordmark" href={homeHref}><Wordmark /></Link>
        ) : (
          <div className="wordmark" aria-label="FIND IT"><Wordmark /></div>
        )}
        <div className={styles.headerMeta}>
          <span>SPACE MAP</span>
          {navigation ? <Link href={homeHref}>{teamName ? "여정으로" : "처음으로"}</Link> : null}
        </div>
      </header>

      <section className={styles.intro}>
        <div>
          <span className={styles.eyebrow}>FIND IT FIELD GUIDE</span>
          <h1>생활관<br />층별 안내</h1>
        </div>
        {navigation ? (
          <div className={styles.introCopy}>
            <strong>지금 있는 곳에서 어디로 갈까요?</strong>
            <p>퇴장 후 선택한 방까지 붉은 점선이 천천히 이어져요. 층이 다르면 가까운 계단을 거쳐 다음 층까지 안내합니다.</p>
            <small>백화점 길안내처럼 현재 위치부터 점선을 따라가세요.</small>
          </div>
        ) : null}
      </section>

      <MapExplorer
        key={`${fromKey ?? "none"}-${guideKey ?? "none"}`}
        teamName={teamName}
        guideKey={guideKey}
        fromKey={fromKey}
      />

      <footer className={styles.footer}>
        <span>FIND IT</span>
        <p>서로를 발견하는 다섯 개의 방</p>
        {navigation ? <Link href={homeHref}>여정으로 돌아가기</Link> : null}
      </footer>
    </main>
  );
}
