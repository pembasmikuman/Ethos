# Ethos

<img src="assets/icon.png" alt="Ethos app icon" width="120">

Personal workout tracker for iPhone. Dot-matrix readout, one orange accent, nothing else.

Built for one person, one gym bag. Logs sets fast, suggests the next weight, buzzes when rest is over with the phone locked in a pocket. Offline, SQLite, no account.

![Home](docs/design/Home.png) ![Workout](docs/design/Main.png)

## What it does

- **Routines** are plans (UL, PPL). Each holds days (Day A, Day B). Days hold exercises with target sets.
- **Preview then start.** Reorder, swap, add, remove exercises before or during a session.
- **Logging.** Custom numpad, kg → reps → RIR in one flow, previous session inline, swipe a set to remove, swipe down for next exercise.
- **Progression rule per exercise.** Double progression (default), linear, or Greyskull LP. Every pre-filled weight says why. Bodyweight moves progress in reps, timed moves log seconds, per-side moves show the split.
- **Rest timer** as a local notification plus haptic. Survives backgrounding.
- **Moves** grouped by movement, variants per equipment and machine brand. Each variant keeps its own history and est. 1RM trend.
- **Library** of 1,200+ exercises with step instructions. Search it from the picker or the new-exercise form. Animated demos on the detail screen. See [docs/NOTICE.md](docs/NOTICE.md).
- **Home** carousel: weekly hard sets per muscle against the 10–20 band, training days grid, front and back muscle map shaded by this week's work.
- **History** with edit and delete. **Backup** to JSON via the share sheet, restore from Files.
- Dark and light.

## Stack

Expo SDK 57, Expo Router, TypeScript, expo-sqlite, Zustand, Reanimated, plain StyleSheet. Everything runs in Expo Go. `bun` only.

## Run

Once, to get the exercise animations (115 MB, not in git, CI fetches them itself):

```
./scripts/fetch-media.sh
```

```
bun install
bunx expo start --tunnel
```

Scan with Expo Go on iPhone.

```
bun test            # schema and logic tests via bun:sqlite
bunx tsc --noEmit
```

## Install as a real app

No Mac needed. The `iOS unsigned IPA` GitHub Action runs `expo prebuild` and `xcodebuild` with signing off and uploads `Ethos.ipa`. Sideload it with SideStore or AltStore on a free Apple ID.

Android: the `Android APK` action uploads `Ethos.apk`; open it on the phone to install. It signs with the key in the `ANDROID_KEYSTORE` secret (`base64 -w0 ~/.config/ethos/android.keystore | gh secret set ANDROID_KEYSTORE`). Keep a copy of that keystore somewhere safe: an APK signed with a different key won't install over the old one, and uninstalling wipes your workout history.

## Import from Daily Strength

```
bun scripts/import-daily-strength.ts <backup-folder> out.json
```

Restore `out.json` through Settings. Sessions, sets, exercises and custom plans come across.

## Design

Doto for numbers and titles, JetBrains Mono for labels, warm off-black and off-white, dot graphics carry the data. Mockups in `docs/design/`.
