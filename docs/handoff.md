# Ethos 🏛️
*Personal, science-based workout tracker. Character forged through habit.*

---

## 1. Identity & Constraints

* **User:** Solo. No App Store release.
* **Device:** iPhone via **Expo Go**. Dev machine is Linux (no Xcode, no EAS). Every dependency must be Expo Go compatible.
* **Philosophy:** Evidence-based training, automated progressive overload, frictionless in-gym logging, offline-first, zero bloat.
* **Units:** kg only.

---

## 2. Tech Stack (locked)

| Layer | Choice | Why |
| :--- | :--- | :--- |
| Framework | Expo (TypeScript), **Expo Router** | Runs on iPhone via Expo Go from Linux. File-based routing. |
| Database | `expo-sqlite` | Offline-first. Raw SQL, no ORM. Migrations via `PRAGMA user_version` + ordered SQL array. |
| State | **Zustand** | Active workout session + timer state only. Everything else reads from SQLite. |
| Styling | Plain `StyleSheet` | 5 screens. NativeWind not worth the build step. |
| Rest timer | `expo-notifications` (local scheduled) + `expo-haptics` | Fires with phone locked in pocket. |
| Backup | JSON export via `expo-sharing` to iCloud Drive; restore via `expo-document-picker` | Zero OAuth. No Google Drive API. |
| Tooling | `bun` for everything | No npm/npx. |

Dropped from original plan: NativeWind, Google Drive REST API, `sync_state` table, RPE column, Dynamic Double Progression, drop/myo-rep set types. Add only when double progression works and a real need appears.

---

## 3. Screens

1. **Home** — today's suggested routine, start workout, last 3 sessions.
2. **Routines** — list, create, edit exercise order and target sets.
3. **Active Workout** — exercise cards, set rows with `Prev:` inline, numpad, rest timer banner, finish.
4. **History** — sessions list, tap for session detail.
5. **Exercise Detail** — per-exercise history, est. 1RM trend, edit rest/increment/rep range.
6. **Settings** — export backup, restore backup, weekly volume view.

---

## 4. Core Logic

### Double Progression
* Exercise has `target_rep_min`, `target_rep_max`, `increment_kg`.
* After a session: if **all working sets** of an exercise hit `target_rep_max` at `rir >= 1`, flag `overload_recommended` on those sets.
* Next session: that exercise's set rows pre-fill with `last_weight + increment_kg` and show badge **Ready to Overload (+2.5kg)**.
* Otherwise pre-fill with last session's weight.
* **Stall rule:** if same weight fails to hit `target_rep_min` on all sets for 3 consecutive sessions, badge **Deload −10%**. User can ignore.

### Previous Values
* "Previous" = last completed session containing that exercise, any routine. Matched by set number.

### Set Types
* `warmup` — excluded from volume and overload.
* `working` — everything else.

### Warmup Suggestion
* Tapping "+ Warmups" on an exercise inserts 40% × 8, 60% × 5, 80% × 3 of the first working set's weight, rounded to 2.5kg.

### Estimated 1RM
* Epley adjusted for RIR: `weight × (1 + (reps + rir) / 30)`. Working sets only. Best of session shown in exercise detail.

### Weekly Volume
* Count working sets per muscle group, Monday–Sunday.
* Compound exercises credit primary muscle 1 set and each secondary muscle 0.5 set.
* Show against 10–20 set landmark band.

### Rest Timer
* Starts when a set is marked complete. Duration = exercise `default_rest_seconds`.
* Schedules a local notification at end time; cancels if skipped or another set completes.
* Controls: `+30s`, `−30s`, `Skip`. Haptic + chime on zero when app foregrounded.
* Timer end time stored in Zustand as absolute timestamp so it survives backgrounding.

---

## 5. Schema

```sql
CREATE TABLE exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    primary_muscle TEXT NOT NULL,        -- chest, back, quads, hamstrings, glutes, delts, biceps, triceps, calves, abs
    secondary_muscles TEXT DEFAULT '',   -- comma-separated, same vocabulary
    equipment TEXT,                      -- barbell, dumbbell, cable, machine, bodyweight
    default_rest_seconds INTEGER DEFAULT 120,
    target_rep_min INTEGER DEFAULT 8,
    target_rep_max INTEGER DEFAULT 12,
    increment_kg REAL DEFAULT 2.5
);

CREATE TABLE routines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE routine_exercises (
    id TEXT PRIMARY KEY,
    routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    order_index INTEGER NOT NULL,
    target_sets INTEGER DEFAULT 3
);

CREATE TABLE workout_sessions (
    id TEXT PRIMARY KEY,
    routine_id TEXT REFERENCES routines(id),
    title TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    notes TEXT
);

CREATE TABLE logged_sets (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    set_number INTEGER NOT NULL,
    set_type TEXT NOT NULL DEFAULT 'working',  -- 'warmup' | 'working'
    weight REAL NOT NULL,
    reps INTEGER NOT NULL,
    rir INTEGER,                               -- 0..5
    completed_at TEXT NOT NULL,
    overload_recommended INTEGER DEFAULT 0
);

CREATE INDEX idx_sets_exercise ON logged_sets(exercise_id, completed_at);
```

Backup file = JSON object with one array per table. Restore = confirm dialog, export current DB first, then wipe and insert.

---

## 6. UI

* True black `#000000` background, cards `#121212`.
* Accent gold `#C5A059`. Overload/PR green `#10B981`. Warmup slate `#64748B`.
* Custom numpad component for weight/reps/RIR. Never the iOS keyboard.
* One-tap checkbox completes set and starts timer. Swipe row to delete.

---

## 7. Roadmap

1. **Scaffold + DB** — Expo Router app, SQLite migration runner, seed ~30 exercises. Verify: app opens in Expo Go, exercises list renders.
2. **Session logger** — Active Workout screen, numpad, prev values, rest timer with notification. Verify: log a full session with phone locked between sets, timer buzzes.
3. **Progression engine** — pure functions in `lib/progression.ts` with tests: overload flag, stall detect, 1RM, weekly volume. Badges in UI. Verify: `bun test` green.
4. **Backup** — export/restore JSON. Verify: export, wipe app, restore, history intact.
