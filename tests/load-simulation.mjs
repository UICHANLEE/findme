import { performance } from "node:perf_hooks";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const teams = [
  ["부하01조", "eyes"], ["부하02조", "eyes"],
  ["부하03조", "sound"],
  ["부하04조", "body"], ["부하05조", "body"], ["부하06조", "body"],
  ["부하07조", "heart"], ["부하08조", "heart"],
  ["부하09조", "grace"], ["부하10조", "grace"],
];

const percentile = (sorted, ratio) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))] ?? 0;

async function request(path, init) {
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}${path}`, init);
    await response.arrayBuffer();
    return { ok: response.ok, status: response.status, ms: performance.now() - started };
  } catch (error) {
    return { ok: false, status: 0, ms: performance.now() - started, error: String(error) };
  }
}

async function reset() {
  const result = await request("/api/reset", { method: "POST" });
  if (!result.ok) throw new Error(`reset failed: ${result.status}`);
}

async function check(teamName, room, action) {
  return request("/api/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamName, room, action }),
  });
}

async function statusState() {
  const response = await fetch(`${baseUrl}/api/status`, { cache: "no-store" });
  return response.json();
}

async function runReadLoad({ users, seconds, intervalMs }) {
  const samples = [];
  const started = performance.now();
  const workers = Array.from({ length: users }, async () => {
    const deadline = started + seconds * 1000;
    while (performance.now() < deadline) {
      samples.push(await request("/api/status", { cache: "no-store" }));
      const wait = intervalMs - samples.at(-1).ms;
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    }
  });
  await Promise.all(workers);
  const elapsedSeconds = (performance.now() - started) / 1000;
  const latency = samples.map((sample) => sample.ms).sort((a, b) => a - b);
  return {
    users,
    durationSeconds: Number(elapsedSeconds.toFixed(2)),
    requests: samples.length,
    requestsPerSecond: Number((samples.length / elapsedSeconds).toFixed(1)),
    successRate: Number((100 * samples.filter((sample) => sample.ok).length / samples.length).toFixed(2)),
    p50Ms: Number(percentile(latency, 0.5).toFixed(1)),
    p95Ms: Number(percentile(latency, 0.95).toFixed(1)),
    p99Ms: Number(percentile(latency, 0.99).toFixed(1)),
    maxMs: Number((latency.at(-1) ?? 0).toFixed(1)),
    statuses: Object.fromEntries([...new Set(samples.map((sample) => sample.status))].map((status) => [status, samples.filter((sample) => sample.status === status).length])),
  };
}

async function runWriteRace(rounds = 5) {
  const results = [];
  for (let round = 1; round <= rounds; round += 1) {
    await reset();
    const writes = await Promise.all(teams.map(([team, room]) => check(`${team}-${round}`, room, "enter")));
    const state = await statusState();
    results.push({
      round,
      successfulWrites: writes.filter((item) => item.ok).length,
      persistedTeams: Array.isArray(state.states) ? state.states.length : 0,
      statusCodes: writes.map((item) => item.status),
      maxWriteMs: Number(Math.max(...writes.map((item) => item.ms)).toFixed(1)),
    });
  }
  return results;
}

await reset();
for (const [team, room] of teams) await check(team, room, "enter");

const realistic = await runReadLoad({ users: 120, seconds: 12, intervalMs: 1500 });
const burst = await runReadLoad({ users: 120, seconds: 5, intervalMs: 0 });
const writeRace = await runWriteRace(5);

console.log(JSON.stringify({
  testedAt: new Date().toISOString(),
  baseUrl,
  assumptions: { teams: 10, participants: 120, participantsPerTeam: 12, pollIntervalMs: 1500 },
  realistic,
  burst,
  writeRace,
}, null, 2));
