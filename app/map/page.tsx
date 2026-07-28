import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import MapExplorer from "./map-explorer";
import styles from "./map.module.css";

export const metadata: Metadata = {
  title: "생활관 층별 안내 | FIND IT",
  description: "생활관 1층과 2층의 호수를 한눈에 확인하는 FIND IT 층별 안내",
};

export default function MapPage() {
  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <Link className="wordmark" href="/">
          <Image src="/find-it-mark.jpg" alt="" width={52} height={52} priority />
          FIND <span>IT</span>
        </Link>
        <div className={styles.headerMeta}>
          <span>SPACE MAP</span>
          <Link href="/">처음으로</Link>
        </div>
      </header>

      <section className={styles.intro}>
        <div>
          <span className={styles.eyebrow}>FIND IT FIELD GUIDE</span>
          <h1>생활관<br />층별 안내</h1>
        </div>
        <div className={styles.introCopy}>
          <strong>찾는 방은 몇 층에 있나요?</strong>
          <p>백화점 층별 안내처럼 겹쳐진 층판을 누르고, 호수를 선택하면 위치가 바로 표시돼요.</p>
          <small>층을 바꾸면 선택한 안내판이 앞으로 올라옵니다.</small>
        </div>
      </section>

      <MapExplorer />

      <footer className={styles.footer}>
        <span>FIND IT</span>
        <p>서로를 발견하는 다섯 개의 방</p>
        <Link href="/">여정으로 돌아가기</Link>
      </footer>
    </main>
  );
}
