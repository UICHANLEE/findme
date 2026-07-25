import { getCache } from "@vercel/functions";
import type { ActivityLog, TalentRecord, TeamState } from "./find-data";

const STATE_KEY = "live-team-states";
const LOG_KEY = "activity-logs";
const TALENT_KEY = "talent-records";
const ONE_WEEK = 60 * 60 * 24 * 7;
const MAX_LOGS = 3000;

function getFindCache() {
  return getCache({ namespace: "find-us" });
}

export async function getTeamStates(): Promise<TeamState[]> {
  const value = await getFindCache().get(STATE_KEY);
  return Array.isArray(value)
    ? (value as TeamState[]).map((state) => ({ ...state, completedRooms: Array.isArray(state.completedRooms) ? state.completedRooms : [] }))
    : [];
}

export async function saveTeamState(next: TeamState) {
  const states = await getTeamStates();
  const updated = [next, ...states.filter((state) => state.teamId !== next.teamId)];
  await getFindCache().set(STATE_KEY, updated, { ttl: ONE_WEEK, tags: ["find-us-teams"], name: "FIND IT live team states" });
  return updated;
}

export async function clearTeamStates() {
  await getFindCache().delete(STATE_KEY);
}

export async function getActivityLogs(): Promise<ActivityLog[]> {
  const value = await getFindCache().get(LOG_KEY);
  return Array.isArray(value) ? value as ActivityLog[] : [];
}

export async function appendActivityLog(next: ActivityLog) {
  const logs = await getActivityLogs();
  const updated = [next, ...logs].slice(0, MAX_LOGS);
  await getFindCache().set(LOG_KEY, updated, { ttl: ONE_WEEK, tags: ["find-us-logs"], name: "FIND IT activity logs" });
  return updated;
}

export async function clearActivityLogs() {
  await getFindCache().delete(LOG_KEY);
}

export async function getTalentRecords(): Promise<TalentRecord[]> {
  const value = await getFindCache().get(TALENT_KEY);
  return Array.isArray(value) ? value as TalentRecord[] : [];
}

export async function saveTalentRecord(next: TalentRecord) {
  const records = await getTalentRecords();
  const updated = [next, ...records.filter((record) => record.teamId !== next.teamId)];
  await getFindCache().set(TALENT_KEY, updated, { ttl: ONE_WEEK, tags: ["find-us-talents"], name: "FIND IT talent records" });
  return updated;
}

export async function clearTalentRecords() {
  await getFindCache().delete(TALENT_KEY);
}
