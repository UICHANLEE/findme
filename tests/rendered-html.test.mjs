import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("participant and themed-room experiences are present", async () => {
  const [home, room, data] = await Promise.all([
    read("app/page.tsx"),
    read("app/room/[slug]/page.tsx"),
    read("lib/find-data.ts"),
  ]);
  assert.match(home, /Find<\/span> me/);
  assert.match(home, /FIND <span>IT<\/span>/);
  assert.doesNotMatch(home, /FIND:US/);
  assert.match(home, /\/api\/status/);
  assert.match(home, /방을 찾으러 다니는 중/);
  assert.match(home, /team\.teamName/);
  assert.match(home, /elapsedRoomLabel/);
  assert.match(home, /selectedRoomKey/);
  assert.match(home, /room-focus/);
  assert.match(home, /moveHeroArt/);
  assert.match(home, /journey-board/);
  assert.match(home, /journey-artifact/);
  assert.match(home, /collection\/maze-base\.jpg/);
  assert.match(home, /collectingRoom/);
  assert.match(room, /퇴장 QR/);
  assert.match(room, /room-threshold/);
  for (const name of ["눈으로 find", "소리로 find", "몸으로 find", "마음으로 find", "은혜로 find"]) assert.match(data, new RegExp(name));
});

test("administrator, QR, persistence, and deployment output are present", async () => {
  const [admin, check, logs, store, vercel] = await Promise.all([
    read("app/jaegunadmin.html/page.tsx"),
    read("app/api/check/route.ts"),
    read("app/api/logs/route.ts"),
    read("lib/find-store.ts"),
    read("vercel.json"),
  ]);
  assert.match(admin, /QRCode\.toDataURL/);
  assert.match(admin, /전체 초기화/);
  assert.match(admin, /운영 Q-sheet/);
  assert.match(admin, /room\.supplies/);
  assert.match(admin, /elapsedRoomLabel\(team\.enteredAt\)/);
  assert.match(admin, /조별 활동 로그/);
  assert.match(admin, /CSV 다운로드/);
  assert.match(admin, /downloadHref/);
  assert.match(check, /saveTeamState/);
  assert.match(check, /appendActivityLog/);
  assert.match(check, /teamName/);
  assert.match(check, /completedRooms/);
  assert.match(check, /collectedRoom/);
  assert.match(check, /journeyComplete/);
  assert.match(logs, /getActivityLogs/);
  assert.match(logs, /text\/csv/);
  assert.match(logs, /Content-Disposition/);
  assert.match(store, /MAX_LOGS/);
  assert.match(vercel, /"icn1"/);
  await access(new URL(".next/BUILD_ID", root));
  await access(new URL("public/favicon.svg", root));
  await access(new URL("public/collection/maze-base.jpg", root));
  await access(new URL("public/collection/sound-passage.jpg", root));
  for (const key of ["eyes", "sound", "body", "heart", "grace"]) await access(new URL(`public/emblems/${key}.webp`, root));
});

test("in-app camera scans a saved team's QR without another name prompt", async () => {
  const [home, scanner, scan, check] = await Promise.all([
    read("app/page.tsx"),
    read("app/scanner/page.tsx"),
    read("app/scan/page.tsx"),
    read("app/api/check/route.ts"),
  ]);
  assert.match(home, /처음 한 번만/);
  assert.match(home, /href="\/scanner"/);
  assert.match(scanner, /BrowserQRCodeReader/);
  assert.match(scanner, /facingMode/);
  assert.match(scanner, /\/api\/check/);
  assert.match(scanner, /window\.location\.origin/);
  assert.match(scan, /localStorage\.getItem\("find-team"\)/);
  assert.doesNotMatch(scan, /입장할 조 이름을 적어 주세요/);
  assert.match(check, /ROOM_FULL/);
  assert.match(check, /otherTeamsInside >= room\.maxTeams/);
  assert.match(scanner, /window\.alert/);
  assert.match(scanner, /data\.collectedRoom/);
  assert.match(scanner, /camera-\$\{transition\.action\}/);
  assert.doesNotMatch(home, /jaegunadmin\.html/);
});
