

 Project Specification: FightWalk
Objective: A real-time web application (PWA) that tracks fight progression and sends "Walkout
Notifications" to ensure fans never miss a specific fight.

##  Phase 0: The Infrastructure Setup
Before writing a single line of logic, you need your "buckets" ready.
- Repository: Create a private GitHub repository for fightwalk.
- Supabase: Create a new project. Use the SQL Editor to run the schema provided below.
- Vercel: Connect your GitHub to Vercel for auto-deployments.
- OneSignal: Create an account and get your App ID.

 Phase 1: The Database Schema (SQL)
Run this in your Supabase SQL Editor. It creates the tables and sets up "Realtime" replication
so the website updates instantly.
## SQL
-- 1. Create Events Table (The Card)
CREATE TABLE events (
id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
name TEXT NOT NULL,
league TEXT NOT NULL,
date TIMESTAMPTZ NOT NULL,
status TEXT DEFAULT 'scheduled' -- scheduled, live, completed
## );

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
## );

-- 3. Enable Realtime for the Fights table

ALTER PUBLICATION supabase_realtime ADD TABLE fights;


⚙ Phase 2: The Data Logic (Backend)
This is the most critical part. You will build a Serverless Function inside Next.js.
## ● File Path: /app/api/sync/route.ts
## ● The Logic Flow:
- Fetch: Call the API-Sports MMA endpoint.
- Filter: Only process fights where league_id matches your "Major Leagues" list.
- Calculate: Compare the API data to your Database.
- Trigger: If Database says Live but API says Finished, trigger a OneSignal push
notification for the next fighter in the
order_index.

 Phase 3: The Frontend (User Experience)
This is what you and your users see. Use Tailwind CSS for a dark, high-contrast "Sports" look.
## 1. The Home Dashboard
● Header: Shows the next major event (e.g., "UFC 305: Du Plessis vs. Adesanya").
● Live Indicator: A pulsing red dot next to the fight currently in the cage.
● The List: Cards showing Fighter A vs Fighter B.
● Action Button: A "Notify Me" bell icon that registers the user for that specific fight's
segment.
- The "Smart" Predictor Component
A UI element that takes the current_round and max_rounds and displays a countdown:
## ● Logic:
$$(Remaining Rounds \times 5 minutes) + 12 minutes (Intermission/Intro buffer)$$
● Display: "Expected Walkout: 11:45 PM (In ~22 mins)"

 Phase 4: The PWA Transition
To get notifications on iPhone/Android without an app store:
- Manifest: Create a public/manifest.json with your app icons.
- Service Worker: Use next-pwa to cache the site offline.
- Prompt: Create a "Banner" that appears only on mobile, saying: "Add to Home Screen
to get Walkout Alerts."


⚠ Risk Management (How to avoid issues)
● Issue: API data is delayed by 60 seconds.
○ Fix: Add a disclaimer in the UI: "Times are estimates based on live cage data."
● Issue: Multiple events on one night.
○ Fix: Use a "Tabs" navigation at the top of the home page (e.g., [UFC] [Boxing]
## [PFL]).
● Issue: Battery drain from polling.
○ Fix: Use Supabase Realtime Subscriptions. The phone doesn't "ask" for data;
the server "pushes" it only when a change happens.
