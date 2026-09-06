# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

## Users
One person: Shazwan, lifting alone. Phone lies on the gym floor during a set, gets picked up for a few seconds to log the set, then goes back down. Sweaty hands, glances from arm's length.

## Product Purpose
Ethos is a personal workout log that automates progressive overload. Success: every set logged in under three seconds, and the app tells the lifter exactly what to lift next session without them thinking about it.

## Positioning
Not a social fitness app and not a spreadsheet. A single-user instrument that runs double progression, shows the previous performance beside every input, and drives a rest timer that buzzes with the phone locked.

## Operating Context
Gym floor, harsh overhead light or basement dim, phone face-up on floor or bench. Offline. Interaction bursts of 3 to 10 seconds. Rest timer must work with screen locked.

## Capabilities and Constraints
- Double progression only. Warmup and working sets. RIR per set. Epley 1RM. Weekly volume per muscle.
- Rest timer via local notification. Haptic on complete.
- kg only. Offline first, SQLite. Expo Go, no native modules.
- Backup is JSON export/import, nothing else.
- Undecided: whether History and Exercise Detail ship in v1.

## Brand Commitments
Name: Ethos. User loves the dot-matrix design language (Nothing OS as felt reference). Build from the wider dot-matrix and instrument-readout tradition, not a copy of any vendor UI. Anti-goals: spreadsheet feel, heavy Greek theming or ornament.

## Evidence on Hand
Spec at docs/handoff.md. Seed exercise library in src/db/seed.ts. No screenshots, no brand assets, no logo.

## Product Principles
- Three-second logging beats every other feature.
- The app decides the next weight; the lifter confirms.
- Show only what changes the next lift.
- One person's tool. No onboarding, no persuasion, no social.
- Readable from the floor at arm's length.
