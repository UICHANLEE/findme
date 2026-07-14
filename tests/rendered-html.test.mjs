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
  assert.match(home, /우리는 지금/);
  assert.match(home, /\/api\/status/);
  assert.match(home, /방을 찾으러 다니는 중/);
  assert.match(home, /team\.teamName/);
  assert.match(room, /퇴장 QR/);
  for (const name of ["눈으로 find", "소리로 find", "몸으로 find", "마음으로 find", "은혜로 find"]) assert.match(data, new RegExp(name));
});

test("administrator, QR, persistence, and deployment output are present", async () => {
  const [admin, check, hosting] = await Promise.all([
    read("app/admin/page.tsx"),
    read("app/api/check/route.ts"),
    read(".openai/hosting.json"),
  ]);
  assert.match(admin, /QRCode\.toDataURL/);
  assert.match(admin, /전체 초기화/);
  assert.match(admin, /운영 Q-sheet/);
  assert.match(admin, /room\.supplies/);
  assert.match(check, /team_state/);
  assert.match(check, /teamName/);
  assert.match(hosting, /"d1": "DB"/);
  await access(new URL("dist/server/index.js", root));
  await access(new URL("dist/.openai/drizzle/0000_wide_slipstream.sql", root));
  await access(new URL("public/og.png", root));
});
