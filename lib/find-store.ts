import { getCache } from "@vercel/functions";
import type { TeamState } from "./find-data";

const STATE_KEY = "live-team-states";
const ONE_WEEK = 60 * 60 * 24 * 7;

function getFindCache() {
  return getCache({ namespace: "find-us" });
}

export async function getTeamStates(): Promise<TeamState[]> {
  const value = await getFindCache().get(STATE_KEY);
  return Array.isArray(value) ? value as TeamState[] : [];
}

export async function saveTeamState(next: TeamState) {
  const states = await getTeamStates();
  const updated = [next, ...states.filter((state) => state.teamId !== next.teamId)];
  await getFindCache().set(STATE_KEY, updated, { ttl: ONE_WEEK, tags: ["find-us-teams"], name: "FIND:US live team states" });
  return updated;
}

export async function clearTeamStates() {
  await getFindCache().delete(STATE_KEY);
}
