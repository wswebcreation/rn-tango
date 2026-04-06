# LinkedIn Games Tango App fir iOS

I'd love to play the LinkedIn Tango game, but there is no history. So I've downloaded the history and created my own Tango React Native App with [EXPO](https://expo.dev/). **This project only supports iOS, NOT Android**

## About Tango
Tango is a logic puzzle game where you place sun (☀️) and moon (🌑) symbols on a grid while satisfying equality (=) and inequality (x) constraints between cells.

## Download answer images (thumbnails)

Answer screenshots for many Tango puzzles are published on Try Hard Guides, for example:

`https://tryhardguides.com/wp-content/uploads/2025/05/Tango-answer-209.jpg`

From the repository root, install dependencies if you have not already (`npm install`), then run the downloader with an inclusive puzzle number range. Files are saved as `tango-data/thumbnails/tango-XXX.jpg` (three-digit id), which matches what the image pipeline in `tango-data/` expects alongside existing `.png` thumbnails.

```bash
npm run download-tango-images -- --from=200 --to=302
```

Optional: write to another folder with `--output=path/to/folder`.

The script probes known upload path prefixes under `wp-content/uploads` (see `UPLOAD_PATHS` in `scripts/download-tango-images.ts`). If a puzzle moves to a new month folder, add that segment there and re-run.

**Note:** Only download or redistribute images if that matches the site’s terms and your use case.

## Build `app-data/puzzles.json` from thumbnails

Put answer images in `tango-data/thumbnails/` as `tango-###.jpg` (or `.png` / `.jpeg`). Then run the vision pipeline from the repo root.

Process **every** thumbnail in that folder:

```bash
npm run process-tango-images
```

Process **only** one puzzle (e.g. `tango-503.jpg` must exist):

```bash
npm run process-tango-images -- --from=503 --to=503
```

Process an inclusive **range**:

```bash
npm run process-tango-images -- --from=500 --to=510
```

Valid puzzles are merged into `app-data/puzzles.json` (existing ids are skipped).

### Difficulty (Monday → Sunday)

Difficulty **1–7** in the app follows a **weekly slot**: **Monday is easiest (1)**, **Sunday is hardest (7)**, matching the usual Try Hard release pattern. It is derived **only from puzzle `id`**, not from solver heuristics.

The phase is fixed by **`WEEKLY_DIFFICULTY_ANCHOR_MONDAY_ID`** in `tango-data/utils/weekly-difficulty.ts` (puzzle **546** is treated as Monday). Neighbouring ids advance one weekday at a time; every seventh step wraps back to Monday.

After editing `puzzles.json` or changing the anchor, recompute difficulties for **all** puzzles:

```bash
npm run apply-weekly-difficulty
```

`npm run process-tango-images` applies the same rule when it writes the merged file (so every entry stays aligned). **`npm run generate-puzzles`** still fills toward `TARGET_TOTAL` in `scripts/generate-puzzles.ts`, then applies this weekly mapping before save.

### Processing guarantees and fallbacks

- Every added puzzle is validated to have **exactly one solution**.
- If normal image extraction fails for a puzzle, the pipeline applies fallbacks:
  - adaptive crop/grid handling for newer square JPG assets
  - image decode fallback for WebP payloads served with `.jpg` names
  - unique-solution puzzle reconstruction from detected/derived constraints when needed
- This keeps bulk imports stable while still enforcing single-solution validation before writing to `app-data/puzzles.json`.

## Contribute

1. Clone the project

  ```bash
  git clone https://github.com/wswebcreation/rn-tango.git
  ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

### Build the App

Make sure you have EAS Cli installed, you can do this by running

```bash
npm install -g eas-cli
```

#### Build for iOS

Run 

```bash
eas build --platform ios --profile preview
```

#### Add new devices to your profile

Run

```sh
eas device:create
```

And follow the instructions

#### Clean the profiles

Run

```sh
eas credentials 
```

And delete/update profiles