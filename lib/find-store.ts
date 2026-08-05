import { neon } from "@neondatabase/serverless";
import { getCache } from "@vercel/functions";
import {
  getRoom,
  rooms,
  type ActivityLog,
  type RoomKey,
  type TalentRecord,
  type TeamState,
} from "./find-data";

const STATE_KEY = "live-team-states";
const LOG_KEY = "activity-logs";
const TALENT_KEY = "talent-records";
const ONE_WEEK = 60 * 60 * 24 * 7;
const MAX_LOGS = 3000;
const DATABASE_URL = process.env.DATABASE_URL?.trim();
const database = DATABASE_URL ? neon(DATABASE_URL) : null;
let fallbackTransitionQueue: Promise<void> = Promise.resolve();

export type TeamTransitionCode =
  | "OK"
  | "IDEMPOTENT"
  | "TEAM_NOT_FOUND"
  | "ALREADY_IN_ROOM"
  | "ROOM_FULL"
  | "NOT_IN_ROOM";

export type TeamTransitionResult = {
  code: TeamTransitionCode;
  state: TeamState | null;
  collectedRoom: RoomKey | null;
  durationSeconds: number | null;
};

function getFindCache() {
  return getCache({ namespace: "find-it" });
}

function assertStorageAvailable() {
  if (!database && process.env.VERCEL) {
    throw new Error("DATABASE_URL이 없습니다. Vercel에 Neon Postgres 연결 문자열을 설정해 주세요.");
  }
}

function normalizeRoomKey(candidate: unknown): RoomKey | null {
  return typeof candidate === "string" && getRoom(candidate) ? candidate as RoomKey : null;
}

function isoTimestamp(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function nonNegativeInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null;
}

function normalizeCompletedRooms(value: unknown): RoomKey[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(normalizeRoomKey).filter((room): room is RoomKey => room !== null)));
}

function mapTeamState(row: Record<string, unknown>): TeamState {
  return {
    teamId: String(row.team_id ?? row.teamId ?? ""),
    teamName: String(row.team_name ?? row.teamName ?? ""),
    currentRoom: normalizeRoomKey(row.current_room ?? row.currentRoom),
    enteredAt: isoTimestamp(row.entered_at ?? row.enteredAt),
    updatedAt: isoTimestamp(row.updated_at ?? row.updatedAt),
    completedRooms: normalizeCompletedRooms(row.completed_rooms ?? row.completedRooms),
    // Legacy cache records deliberately remain unknown. A completed room is
    // not necessarily the room the team most recently exited.
    previousRoom: normalizeRoomKey(row.previous_room ?? row.previousRoom),
    previousRoomExitedAt: isoTimestamp(row.previous_room_exited_at ?? row.previousRoomExitedAt),
    previousRoomDurationSeconds: nonNegativeInteger(row.previous_room_duration_seconds ?? row.previousRoomDurationSeconds),
  };
}

function mapActivityLog(row: Record<string, unknown>): ActivityLog {
  return {
    id: String(row.id ?? ""),
    teamId: String(row.team_id ?? row.teamId ?? ""),
    teamName: String(row.team_name ?? row.teamName ?? ""),
    room: normalizeRoomKey(row.room) ?? "eyes",
    action: row.action === "exit" ? "exit" : "enter",
    timestamp: isoTimestamp(row.occurred_at ?? row.timestamp) ?? new Date(0).toISOString(),
    durationSeconds: nonNegativeInteger(row.duration_seconds ?? row.durationSeconds),
  };
}

function normalizeTalentAmounts(value: unknown): Record<RoomKey, number> {
  let candidate = value;
  if (typeof candidate === "string") {
    try { candidate = JSON.parse(candidate); } catch { candidate = {}; }
  }
  const source = candidate && typeof candidate === "object" ? candidate as Record<string, unknown> : {};
  return Object.fromEntries(rooms.map((room) => {
    const amount = nonNegativeInteger(source[room.key]);
    return [room.key, amount ?? 0];
  })) as Record<RoomKey, number>;
}

async function getCachedTeamStates(): Promise<TeamState[]> {
  const value = await getFindCache().get(STATE_KEY);
  return Array.isArray(value) ? value.map((state) => mapTeamState(state as Record<string, unknown>)) : [];
}

async function getCachedActivityLogs(): Promise<ActivityLog[]> {
  const value = await getFindCache().get(LOG_KEY);
  return Array.isArray(value) ? value.map((log) => mapActivityLog(log as Record<string, unknown>)) : [];
}

async function getCachedTalentRecords(): Promise<TalentRecord[]> {
  const value = await getFindCache().get(TALENT_KEY);
  return Array.isArray(value) ? (value as Partial<TalentRecord>[]).map((record) => ({
    teamId: String(record.teamId ?? ""),
    teamName: String(record.teamName ?? ""),
    amounts: normalizeTalentAmounts(record.amounts),
    updatedAt: isoTimestamp(record.updatedAt) ?? new Date(0).toISOString(),
  })) : [];
}

export function getFindStoreMode() {
  return database ? "neon-postgres" as const : "runtime-cache-fallback" as const;
}

export async function getTeamStates(): Promise<TeamState[]> {
  assertStorageAvailable();
  if (!database) return getCachedTeamStates();
  const rows = await database`
    SELECT team_id, team_name, current_room, entered_at, updated_at, completed_rooms,
           previous_room, previous_room_exited_at, previous_room_duration_seconds
    FROM find_it_team_states
    ORDER BY updated_at DESC, team_name ASC
  `;
  return rows.map((row) => mapTeamState(row));
}

export async function saveTeamState(next: TeamState) {
  assertStorageAvailable();
  if (!database) {
    const states = await getCachedTeamStates();
    const updated = [next, ...states.filter((state) => state.teamId !== next.teamId)];
    await getFindCache().set(STATE_KEY, updated, { ttl: ONE_WEEK, tags: ["find-it-teams"], name: "FIND IT live team states" });
    return updated;
  }

  await database`
    INSERT INTO find_it_team_states (
      team_id, team_name, current_room, entered_at, updated_at, completed_rooms,
      previous_room, previous_room_exited_at, previous_room_duration_seconds
    ) VALUES (
      ${next.teamId}, ${next.teamName}, ${next.currentRoom}, ${next.enteredAt}, ${next.updatedAt},
      ${next.completedRooms ?? []}, ${next.previousRoom}, ${next.previousRoomExitedAt}, ${next.previousRoomDurationSeconds}
    )
    ON CONFLICT (team_id) DO UPDATE SET
      team_name = EXCLUDED.team_name,
      current_room = EXCLUDED.current_room,
      entered_at = EXCLUDED.entered_at,
      updated_at = EXCLUDED.updated_at,
      completed_rooms = EXCLUDED.completed_rooms,
      previous_room = EXCLUDED.previous_room,
      previous_room_exited_at = EXCLUDED.previous_room_exited_at,
      previous_room_duration_seconds = EXCLUDED.previous_room_duration_seconds
  `;
  return getTeamStates();
}

async function transitionWithCache(input: { teamId: string; teamName: string; room: RoomKey; action: "enter" | "exit"; maxTeams: number }): Promise<TeamTransitionResult> {
  const states = await getCachedTeamStates();
  const existing = states.find((state) => state.teamId === input.teamId);

  if (input.action === "exit" && !existing) return { code: "TEAM_NOT_FOUND", state: null, collectedRoom: null, durationSeconds: null };
  if (input.action === "enter" && existing?.currentRoom === input.room) return { code: "IDEMPOTENT", state: existing, collectedRoom: null, durationSeconds: null };
  if (input.action === "enter" && existing?.currentRoom) return { code: "ALREADY_IN_ROOM", state: existing, collectedRoom: null, durationSeconds: null };
  if (input.action === "enter" && states.filter((state) => state.currentRoom === input.room && state.teamId !== input.teamId).length >= input.maxTeams) {
    return { code: "ROOM_FULL", state: existing ?? null, collectedRoom: null, durationSeconds: null };
  }
  if (input.action === "exit" && existing?.currentRoom !== input.room) return { code: "NOT_IN_ROOM", state: existing ?? null, collectedRoom: null, durationSeconds: null };

  const now = new Date().toISOString();
  const previousCompleted = existing?.completedRooms ?? [];
  const collectedNow = input.action === "exit" && !previousCompleted.includes(input.room);
  const completedRooms = collectedNow ? [...previousCompleted, input.room] : previousCompleted;
  const durationSeconds = input.action === "exit" && existing?.enteredAt
    ? Math.max(0, Math.floor((Date.now() - new Date(existing.enteredAt).getTime()) / 1000))
    : null;
  const next: TeamState = {
    teamId: input.teamId,
    teamName: input.teamName,
    currentRoom: input.action === "enter" ? input.room : null,
    enteredAt: input.action === "enter" ? now : null,
    updatedAt: now,
    completedRooms,
    previousRoom: input.action === "exit" ? input.room : existing?.previousRoom ?? null,
    previousRoomExitedAt: input.action === "exit" ? now : existing?.previousRoomExitedAt ?? null,
    previousRoomDurationSeconds: input.action === "exit" ? durationSeconds : existing?.previousRoomDurationSeconds ?? null,
  };
  await saveTeamState(next);
  try {
    await appendActivityLog({
      id: crypto.randomUUID(),
      teamId: input.teamId,
      teamName: input.teamName,
      room: input.room,
      action: input.action,
      timestamp: now,
      durationSeconds,
    });
  } catch { /* the local fallback keeps live room state as the priority */ }
  return { code: "OK", state: next, collectedRoom: collectedNow ? input.room : null, durationSeconds };
}

export async function transitionTeam(input: { teamId: string; teamName: string; room: RoomKey; action: "enter" | "exit"; maxTeams: number }): Promise<TeamTransitionResult> {
  assertStorageAvailable();
  if (!database) {
    const result = fallbackTransitionQueue.then(() => transitionWithCache(input));
    fallbackTransitionQueue = result.then(() => undefined, () => undefined);
    return result;
  }

  const logId = crypto.randomUUID();
  const [, transitionRows] = await database.transaction((transaction) => [
    transaction`SELECT pg_advisory_xact_lock(hashtext('find-it-team-transition'))`,
    transaction`
      WITH existing AS (
        SELECT team_id, team_name, current_room, entered_at, updated_at, completed_rooms,
               previous_room, previous_room_exited_at, previous_room_duration_seconds
        FROM find_it_team_states
        WHERE team_id = ${input.teamId}
      ),
      occupancy AS (
        SELECT count(*)::INTEGER AS inside_count
        FROM find_it_team_states
        WHERE current_room = ${input.room} AND team_id <> ${input.teamId}
      ),
      decision AS (
        SELECT
          CASE
            WHEN ${input.action}::TEXT = 'exit' AND existing.team_id IS NULL THEN 'TEAM_NOT_FOUND'
            WHEN ${input.action}::TEXT = 'enter' AND existing.current_room = ${input.room} THEN 'IDEMPOTENT'
            WHEN ${input.action}::TEXT = 'enter' AND existing.current_room IS NOT NULL THEN 'ALREADY_IN_ROOM'
            WHEN ${input.action}::TEXT = 'enter' AND occupancy.inside_count >= ${input.maxTeams} THEN 'ROOM_FULL'
            WHEN ${input.action}::TEXT = 'exit' AND COALESCE(existing.current_room, '') <> ${input.room} THEN 'NOT_IN_ROOM'
            ELSE 'OK'
          END AS code,
          existing.*,
          occupancy.inside_count
        FROM occupancy
        LEFT JOIN existing ON TRUE
      ),
      calculated AS (
        SELECT
          now() AS changed_at,
          CASE WHEN ${input.action}::TEXT = 'enter' THEN ${input.room}::TEXT ELSE NULL END AS next_current_room,
          CASE WHEN ${input.action}::TEXT = 'enter' THEN now() ELSE NULL END AS next_entered_at,
          CASE
            WHEN ${input.action}::TEXT = 'exit' AND NOT (${input.room}::TEXT = ANY(COALESCE(completed_rooms, ARRAY[]::TEXT[])))
              THEN array_append(COALESCE(completed_rooms, ARRAY[]::TEXT[]), ${input.room}::TEXT)
            ELSE COALESCE(completed_rooms, ARRAY[]::TEXT[])
          END AS next_completed_rooms,
          CASE WHEN ${input.action}::TEXT = 'exit' THEN ${input.room}::TEXT ELSE previous_room END AS next_previous_room,
          CASE WHEN ${input.action}::TEXT = 'exit' THEN now() ELSE previous_room_exited_at END AS next_previous_room_exited_at,
          CASE
            WHEN ${input.action}::TEXT = 'exit' AND entered_at IS NOT NULL
              THEN GREATEST(0, floor(extract(epoch FROM (now() - entered_at)))::INTEGER)
            WHEN ${input.action}::TEXT = 'exit' THEN NULL
            ELSE previous_room_duration_seconds
          END AS next_duration_seconds,
          ${input.action}::TEXT = 'exit'
            AND NOT (${input.room}::TEXT = ANY(COALESCE(completed_rooms, ARRAY[]::TEXT[]))) AS collected_now
        FROM decision
        WHERE code = 'OK'
      ),
      upserted AS (
        INSERT INTO find_it_team_states (
          team_id, team_name, current_room, entered_at, updated_at, completed_rooms,
          previous_room, previous_room_exited_at, previous_room_duration_seconds
        )
        SELECT
          ${input.teamId}, ${input.teamName}, next_current_room, next_entered_at, changed_at, next_completed_rooms,
          next_previous_room, next_previous_room_exited_at, next_duration_seconds
        FROM calculated
        ON CONFLICT (team_id) DO UPDATE SET
          team_name = EXCLUDED.team_name,
          current_room = EXCLUDED.current_room,
          entered_at = EXCLUDED.entered_at,
          updated_at = EXCLUDED.updated_at,
          completed_rooms = EXCLUDED.completed_rooms,
          previous_room = EXCLUDED.previous_room,
          previous_room_exited_at = EXCLUDED.previous_room_exited_at,
          previous_room_duration_seconds = EXCLUDED.previous_room_duration_seconds
        RETURNING *
      ),
      logged AS (
        INSERT INTO find_it_activity_logs (id, team_id, team_name, room, action, occurred_at, duration_seconds)
        SELECT ${logId}::UUID, ${input.teamId}, ${input.teamName}, ${input.room}, ${input.action}, changed_at, next_duration_seconds
        FROM calculated
        RETURNING id
      )
      SELECT
        decision.code,
        COALESCE(upserted.team_id, decision.team_id) AS team_id,
        CASE WHEN upserted.team_id IS NOT NULL THEN upserted.team_name ELSE decision.team_name END AS team_name,
        CASE WHEN upserted.team_id IS NOT NULL THEN upserted.current_room ELSE decision.current_room END AS current_room,
        CASE WHEN upserted.team_id IS NOT NULL THEN upserted.entered_at ELSE decision.entered_at END AS entered_at,
        CASE WHEN upserted.team_id IS NOT NULL THEN upserted.updated_at ELSE decision.updated_at END AS updated_at,
        CASE WHEN upserted.team_id IS NOT NULL THEN upserted.completed_rooms ELSE COALESCE(decision.completed_rooms, ARRAY[]::TEXT[]) END AS completed_rooms,
        CASE WHEN upserted.team_id IS NOT NULL THEN upserted.previous_room ELSE decision.previous_room END AS previous_room,
        CASE WHEN upserted.team_id IS NOT NULL THEN upserted.previous_room_exited_at ELSE decision.previous_room_exited_at END AS previous_room_exited_at,
        CASE WHEN upserted.team_id IS NOT NULL THEN upserted.previous_room_duration_seconds ELSE decision.previous_room_duration_seconds END AS previous_room_duration_seconds,
        COALESCE(calculated.collected_now, FALSE) AS collected_now,
        calculated.next_duration_seconds AS duration_seconds
      FROM decision
      LEFT JOIN calculated ON TRUE
      LEFT JOIN upserted ON TRUE
    `,
  ]);

  const row = transitionRows[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error("Neon에서 입·퇴장 처리 결과를 받지 못했습니다.");
  const state = row.team_id ? mapTeamState(row) : null;
  return {
    code: String(row.code) as TeamTransitionCode,
    state,
    collectedRoom: row.collected_now === true ? input.room : null,
    durationSeconds: nonNegativeInteger(row.duration_seconds),
  };
}

export async function clearTeamStates() {
  assertStorageAvailable();
  if (!database) return getFindCache().delete(STATE_KEY);
  await database`DELETE FROM find_it_team_states`;
}

export async function getActivityLogs(): Promise<ActivityLog[]> {
  assertStorageAvailable();
  if (!database) return getCachedActivityLogs();
  const rows = await database`
    SELECT id, team_id, team_name, room, action, occurred_at, duration_seconds
    FROM find_it_activity_logs
    ORDER BY occurred_at DESC
    LIMIT ${MAX_LOGS}
  `;
  return rows.map((row) => mapActivityLog(row));
}

export async function appendActivityLog(next: ActivityLog) {
  assertStorageAvailable();
  if (!database) {
    const logs = await getCachedActivityLogs();
    const updated = [next, ...logs].slice(0, MAX_LOGS);
    await getFindCache().set(LOG_KEY, updated, { ttl: ONE_WEEK, tags: ["find-it-logs"], name: "FIND IT activity logs" });
    return updated;
  }
  await database`
    INSERT INTO find_it_activity_logs (id, team_id, team_name, room, action, occurred_at, duration_seconds)
    VALUES (${next.id}::UUID, ${next.teamId}, ${next.teamName}, ${next.room}, ${next.action}, ${next.timestamp}, ${next.durationSeconds})
    ON CONFLICT (id) DO NOTHING
  `;
  return getActivityLogs();
}

export async function clearActivityLogs() {
  assertStorageAvailable();
  if (!database) return getFindCache().delete(LOG_KEY);
  await database`DELETE FROM find_it_activity_logs`;
}

export async function getTalentRecords(): Promise<TalentRecord[]> {
  assertStorageAvailable();
  if (!database) return getCachedTalentRecords();
  const rows = await database`
    SELECT team_id, team_name, amounts, updated_at
    FROM find_it_talent_records
    ORDER BY team_name ASC
  `;
  return rows.map((row) => ({
    teamId: String(row.team_id ?? ""),
    teamName: String(row.team_name ?? ""),
    amounts: normalizeTalentAmounts(row.amounts),
    updatedAt: isoTimestamp(row.updated_at) ?? new Date(0).toISOString(),
  }));
}

export async function saveTalentRecord(next: TalentRecord) {
  assertStorageAvailable();
  if (!database) {
    const records = await getCachedTalentRecords();
    const updated = [next, ...records.filter((record) => record.teamId !== next.teamId)];
    await getFindCache().set(TALENT_KEY, updated, { ttl: ONE_WEEK, tags: ["find-it-talents"], name: "FIND IT talent records" });
    return updated;
  }
  await database`
    INSERT INTO find_it_talent_records (team_id, team_name, amounts, updated_at)
    VALUES (${next.teamId}, ${next.teamName}, ${JSON.stringify(next.amounts)}::JSONB, ${next.updatedAt})
    ON CONFLICT (team_id) DO UPDATE SET
      team_name = EXCLUDED.team_name,
      amounts = EXCLUDED.amounts,
      updated_at = EXCLUDED.updated_at
  `;
  return getTalentRecords();
}

export async function clearTalentRecords() {
  assertStorageAvailable();
  if (!database) return getFindCache().delete(TALENT_KEY);
  await database`DELETE FROM find_it_talent_records`;
}

export async function clearFindData() {
  assertStorageAvailable();
  if (!database) {
    await Promise.all([clearTeamStates(), clearActivityLogs(), clearTalentRecords()]);
    return;
  }
  await database.transaction((transaction) => [
    transaction`SELECT pg_advisory_xact_lock(hashtext('find-it-team-transition'))`,
    transaction`DELETE FROM find_it_activity_logs`,
    transaction`DELETE FROM find_it_talent_records`,
    transaction`DELETE FROM find_it_team_states`,
  ]);
}
