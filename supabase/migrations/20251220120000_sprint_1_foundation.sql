-- Foundation migration for Sprint 1: Creates events and fights tables with realtime enabled.

-- 1. Create Events Table (The Card)
CREATE TABLE events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  league TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled' -- scheduled, live, completed
);

-- 2. Create Fights Table (The Bouts)
CREATE TABLE fights (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  fighter_a TEXT NOT NULL,
  fighter_b TEXT NOT NULL,
  order_index INT NOT NULL, -- 1 for Main Event, 2 for Co-Main, etc.
  status TEXT DEFAULT 'pending', -- pending, live, finished
  current_round INT DEFAULT 0,
  max_rounds INT DEFAULT 3,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable Realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE fights;