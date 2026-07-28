import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("participant and themed-room experiences are present", async () => {
  const [home, room, data, styles] = await Promise.all([
    read("app/page.tsx"),
    read("app/room/[slug]/page.tsx"),
    read("lib/find-data.ts"),
    read("app/globals.css"),
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
  assert.match(home, /CollectionTransfer/);
  assert.match(home, /transfer-found-piece/);
  assert.match(home, /transfer-flyer/);
  assert.match(home, /room\.emblem/);
  assert.match(home, /collectionPosition/);
  assert.match(home, /collection\/maze-base\.jpg/);
  assert.match(home, /collection\/maze-final-route\.png/);
  assert.match(home, /maze-route-segment-\$\{segment\}\.webp/);
  assert.match(home, /JourneyFoundPicture/);
  assert.match(home, /is-gate-opening/);
  assert.match(home, /is-keepsake/);
  assert.match(home, /is-assembling/);
  assert.match(home, /assembly-artifact/);
  assert.match(home, /안전하게 보관했어요/);
  assert.match(home, /포스터 반영 완료/);
  assert.match(home, /journeyComplete \? "collected" : ""/);
  assert.match(home, /window\.innerWidth - 32/);
  assert.match(home, /window\.innerHeight - 150/);
  assert.match(home, /artifactStyle\(soundRoom\)/);
  assert.match(home, /is-route-searching/);
  assert.match(home, /is-route-complete/);
  assert.match(home, /route-magnifier/);
  assert.match(home, /is-afterglow/);
  assert.match(home, /roomAfterglow/);
  assert.match(home, /내 눈을 열어서 주의 율법에서 놀라운 것을 보게 하소서/);
  assert.match(home, /시편 119:18/);
  assert.match(home, /요한계시록 2:7/);
  assert.match(home, /고린도전서 12:27/);
  assert.match(home, /잠언 3:5/);
  assert.match(home, /고린도후서 12:9/);
  assert.match(home, /duration: 3380/);
  assert.match(home, /길 끝에서 십자가를 만났어요/);
  assert.match(styles, /@keyframes magnifierFollowRoute/);
  assert.match(styles, /animation: magnifierFollowRoute 6\.6s linear both/);
  assert.match(styles, /@keyframes gateRetractLeft/);
  assert.match(styles, /@keyframes keepsakeAcquire/);
  assert.match(styles, /@keyframes assembleEyes/);
  assert.match(styles, /@keyframes assembleSound/);
  assert.match(styles, /@keyframes assembleBody/);
  assert.match(styles, /@keyframes assembleHeart/);
  assert.match(styles, /@keyframes assembleGrace/);
  assert.doesNotMatch(styles, /gateBreakthrough/);
  assert.doesNotMatch(styles, /magnifierSearch/);
  assert.match(styles, /\.transfer-afterglow strong,[\s\S]*word-break: keep-all/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
  assert.match(styles, /@media \(max-width: 700px\) and \(max-height: 620px\)/);
  assert.match(home, /collectingRoom/);
  assert.match(data, /left: 19\.9, top: 60\.3, width: 10, rotate: 38/);
  assert.match(room, /퇴장 QR/);
  assert.match(room, /room-threshold/);
  assert.match(room, /journeyComplete/);
  assert.match(room, /finale=1/);
  for (const name of ["눈으로 find", "소리로 find", "몸으로 find", "마음으로 find", "은혜로 find"]) assert.match(data, new RegExp(name));
});

test("administrator, QR, persistence, and deployment output are present", async () => {
  const [admin, check, logs, talents, reset, store, vercel] = await Promise.all([
    read("app/jaegunadmin.html/page.tsx"),
    read("app/api/check/route.ts"),
    read("app/api/logs/route.ts"),
    read("app/api/talents/route.ts"),
    read("app/api/reset/route.ts"),
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
  assert.match(admin, /조별 달란트 현황/);
  assert.match(admin, /\/api\/talents/);
  assert.match(admin, /TalentEditor/);
  assert.match(admin, /talentTotal/);
  assert.match(check, /saveTeamState/);
  assert.match(check, /appendActivityLog/);
  assert.match(check, /teamName/);
  assert.match(check, /completedRooms/);
  assert.match(check, /collectedRoom/);
  assert.match(check, /journeyComplete/);
  assert.match(logs, /getActivityLogs/);
  assert.match(logs, /text\/csv/);
  assert.match(logs, /Content-Disposition/);
  assert.match(talents, /getTalentRecords/);
  assert.match(talents, /saveTalentRecord/);
  assert.match(talents, /FIND-IT-talents\.csv/);
  assert.match(talents, /0~999/);
  assert.match(store, /MAX_LOGS/);
  assert.match(store, /TALENT_KEY/);
  assert.match(reset, /clearTalentRecords/);
  assert.match(vercel, /"icn1"/);
  await access(new URL(".next/BUILD_ID", root));
  await access(new URL("public/favicon.svg", root));
  await access(new URL("public/collection/maze-base.jpg", root));
  await access(new URL("public/collection/maze-final-route.png", root));
  for (let segment = 1; segment <= 5; segment += 1) {
    await access(new URL(`public/collection/maze-route-segment-${segment}.webp`, root));
  }
  await access(new URL("public/collection/sound-passage.jpg", root));
  await access(new URL("public/collection/sound-piece.webp", root));
  await access(new URL("public/collection/sound-wall-closed.webp", root));
  await access(new URL("public/collection/body-route.png", root));
  await access(new URL("public/collection/eyes-piece.webp", root));
  await access(new URL("public/collection/heart-piece.webp", root));
  await access(new URL("public/collection/grace-piece.webp", root));
  for (const key of ["eyes", "sound", "body", "heart", "grace"]) {
    await access(new URL(`public/emblems/${key}.jpg`, root));
    await access(new URL(`public/emblems/${key}.webp`, root));
  }
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
  assert.match(scanner, /DecodeHintType\.TRY_HARDER/);
  assert.match(scanner, /width: \{ ideal: 1920 \}/);
  assert.match(scanner, /height: \{ ideal: 1080 \}/);
  assert.match(scanner, /focusMode: "continuous"/);
  assert.match(scanner, /switchTorch/);
  assert.match(scanner, /QR이 사각형의 절반 이상/);
  assert.match(scanner, /\/api\/check/);
  assert.match(scanner, /window\.location\.origin/);
  assert.doesNotMatch(scanner, /url\.origin !== window\.location\.origin/);
  assert.match(scanner, /url\.pathname\.replace/);
  assert.match(scan, /localStorage\.getItem\("find-team"\)/);
  assert.doesNotMatch(scan, /입장할 조 이름을 적어 주세요/);
  assert.match(check, /ROOM_FULL/);
  assert.match(check, /otherTeamsInside >= room\.maxTeams/);
  assert.match(scanner, /window\.alert/);
  assert.match(scanner, /data\.collectedRoom/);
  assert.match(scanner, /data\.journeyComplete/);
  assert.match(scan, /data\.journeyComplete/);
  assert.match(check, /collectedRoom: collectedNow \? room\.key : null/);
  assert.match(check, /rooms\.every/);
  assert.match(scanner, /camera-\$\{transition\.action\}/);
  assert.doesNotMatch(home, /jaegunadmin\.html/);
});

test("map endpoint layers rooms and major shared spaces across both floors", async () => {
  const [page, explorer, styles] = await Promise.all([
    read("app/map/page.tsx"),
    read("app/map/map-explorer.tsx"),
    read("app/map/map.module.css"),
  ]);
  assert.match(page, /생활관<br \/>층별 안내/);
  assert.match(page, /MapExplorer/);

  // Both floors are rendered together as stacked directory plates.
  assert.match(explorer, /type FloorKey = "1f" \| "2f"/);
  assert.match(explorer, /\/maps\/directory-1f\.webp/);
  assert.match(explorer, /\/maps\/directory-2f\.webp/);
  assert.match(explorer, /data-testid="floor-stack"/);
  assert.match(explorer, /data-floor=\{item\.key\}/);
  assert.match(explorer, /data-active=\{active\}/);
  assert.match(explorer, /data-testid="mobile-floor-switcher"/);
  assert.match(explorer, /className=\{styles\.mobileFloorSwitcher\}/);
  assert.match(explorer, /type SharedSpaceSpot/);
  assert.match(explorer, /sharedSpaces: SharedSpaceSpot\[\]/);
  assert.match(explorer, /const getFloorLocations/);
  assert.match(explorer, /const selectedSpot = getFloorLocations\(item\)\.find/);
  assert.match(explorer, /\{active && selectedSpot\?\.kind === "room" && \(/);
  assert.match(explorer, /data-testid="mobile-selected-location"/);
  assert.match(explorer, /data-location=\{selectedSpot\.id\}/);
  assert.match(explorer, /item\.sharedSpaces\.map\(\(space\)/);
  assert.match(explorer, /activeFloor\.sharedSpaces\.map\(\(space\)/);
  assert.match(explorer, /data-space=\{space\.id\}/);
  assert.match(explorer, /activeRoomList\.map\(\(room\)/);
  assert.match(explorer, /setFloorKey/);
  assert.match(explorer, /aria-pressed=\{active\}/);
  assert.match(explorer, /disabled=\{!active\}/);
  assert.match(explorer, /aria-live="polite"/);

  const roomNumbers = [
    "101", "102", "104", "105", "106", "107", "108", "109",
    ...Array.from({ length: 21 }, (_, index) => String(index + 201)),
  ];
  for (const room of roomNumbers) {
    assert.match(explorer, new RegExp(`["']${room}["']`));
  }
  assert.doesNotMatch(explorer, /["']103["']/);
  assert.doesNotMatch(explorer, /\d{3}\s*[·~–-]\s*\d{3}/);

  const majorSpaces = [
    "대강당",
    "소강당",
    "청춘광장",
    "식당",
    "세미나실 1",
    "원장실",
    "사무실",
    "2층 로비",
    "세미나실 2",
    "양호실",
  ];
  for (const space of majorSpaces) {
    assert.match(explorer, new RegExp(`["']${space}["']`));
  }
  assert.doesNotMatch(
    explorer,
    /계단|수용인원|요금|화장실|비품실|파란색/,
  );
  assert.doesNotMatch(explorer, /living-center-[12]f\.png/);
  assert.doesNotMatch(explorer, /viewport\.scrollTo/);

  assert.match(styles, /\.floorStack/);
  assert.match(styles, /\.floorLayer/);
  assert.match(styles, /\.activeLayer/);
  assert.match(styles, /\.sharedSpaceButton/);
  assert.match(styles, /\.sharedSpaceList/);
  assert.match(styles, /\.mobileSelectedLocation/);
  assert.match(styles, /perspective:/);
  assert.match(styles, /@media \(max-width: 700px\)/);

  const mobileMedia = styles.match(
    /@media \(max-width: 700px\) \{([\s\S]*?)\n\}\n\n@media \(prefers-reduced-motion/,
  );
  assert.ok(mobileMedia, "700px mobile media query must exist");
  const mobileStyles = mobileMedia[1];
  assert.match(mobileStyles, /\.floorTabs\s*\{[^}]*display:\s*none/);
  assert.match(
    mobileStyles,
    /\.mobileFloorSwitcher\s*\{[^}]*position:\s*absolute/,
  );
  assert.match(
    mobileStyles,
    /\.mobileFloorSwitcher\s*\{[^}]*display:\s*flex/,
  );
  assert.match(mobileStyles, /\.mobileFloorSwitcher\s*\{[^}]*right:\s*[^;]+;/);
  assert.match(mobileStyles, /\.mobileFloorSwitcher\s*\{[^}]*bottom:\s*[^;]+;/);
  assert.match(
    mobileStyles,
    /\.stackViewport\s*\{[^}]*(?:overflow|overflow-x):\s*hidden/,
  );
  assert.match(mobileStyles, /\.floorStack\s*\{[^}]*width:\s*100%/);
  assert.match(mobileStyles, /\.floorStack\s*\{[^}]*min-width:\s*0/);
  assert.match(mobileStyles, /\.roomOverlay\s*\{[^}]*display:\s*none/);
  assert.doesNotMatch(mobileStyles, /(?:width|min-width):\s*780px/);

  await access(new URL("public/maps/directory-1f.webp", root));
  await access(new URL("public/maps/directory-2f.webp", root));
});
