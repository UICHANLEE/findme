CREATE TABLE IF NOT EXISTS find_it_team_states (
  team_id TEXT PRIMARY KEY,
  team_name TEXT NOT NULL,
  current_room TEXT,
  entered_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_rooms TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  previous_room TEXT,
  previous_room_exited_at TIMESTAMPTZ,
  previous_room_duration_seconds INTEGER,
  CONSTRAINT find_it_team_states_current_room_check
    CHECK (current_room IS NULL OR current_room IN ('eyes', 'sound', 'body', 'heart', 'grace')),
  CONSTRAINT find_it_team_states_previous_room_check
    CHECK (previous_room IS NULL OR previous_room IN ('eyes', 'sound', 'body', 'heart', 'grace')),
  CONSTRAINT find_it_team_states_duration_check
    CHECK (previous_room_duration_seconds IS NULL OR previous_room_duration_seconds >= 0),
  CONSTRAINT find_it_team_states_completed_rooms_check
    CHECK (completed_rooms <@ ARRAY['eyes', 'sound', 'body', 'heart', 'grace']::TEXT[])
);

-- statement-breakpoint
CREATE INDEX IF NOT EXISTS find_it_team_states_current_room_idx
  ON find_it_team_states (current_room)
  WHERE current_room IS NOT NULL;

-- statement-breakpoint
CREATE TABLE IF NOT EXISTS find_it_activity_logs (
  id UUID PRIMARY KEY,
  team_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  room TEXT NOT NULL CHECK (room IN ('eyes', 'sound', 'body', 'heart', 'grace')),
  action TEXT NOT NULL CHECK (action IN ('enter', 'exit')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0)
);

-- statement-breakpoint
CREATE INDEX IF NOT EXISTS find_it_activity_logs_team_time_idx
  ON find_it_activity_logs (team_id, occurred_at DESC);

-- statement-breakpoint
CREATE INDEX IF NOT EXISTS find_it_activity_logs_time_idx
  ON find_it_activity_logs (occurred_at DESC);

-- statement-breakpoint
CREATE TABLE IF NOT EXISTS find_it_talent_records (
  team_id TEXT PRIMARY KEY,
  team_name TEXT NOT NULL,
  amounts JSONB NOT NULL DEFAULT '{}'::JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT find_it_talent_records_amounts_object_check
    CHECK (jsonb_typeof(amounts) = 'object')
);
