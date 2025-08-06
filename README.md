# LinkedIn Games Tango App fir iOS

I'd love to play the LinkedIn Tango game, but there is no history. So I've downloaded the history and created my own Tango React Native App with [EXPO](https://expo.dev/). **This project only supports iOS, NOT Android**

## About Tango
Tango is a logic puzzle game where you place sun (☀️) and moon (🌑) symbols on a grid while satisfying equality (=) and inequality (x) constraints between cells.

## Collect Tango data

We use the [playlist](https://www.youtube.com/playlist?list=PLLE2dY85AtnfSpGLBlq9YQwxQQxLVi66w) of Daily Puzzles to get the history, then follow these steps

1. Open playlist [url](https://www.youtube.com/playlist?list=PLLE2dY85AtnfSpGLBlq9YQwxQQxLVi66w)
2. Fully scroll to the bottom so all videos are shown
3. Paste the following code in the browser, This will prompt you to download a file named `tango-thumbnails.json`, download it to the [`tango-data/`](./tango-data/)-folder

  <details>

  <summary>Browser JS Code</summary>

  ```js
  (() => {
    const entries = [...document.querySelectorAll('ytd-playlist-video-renderer')];

    const result = entries.map(el => {
      const link = el.querySelector('a#thumbnail')?.href || '';
      const match = link.match(/v=([\w-]+)/);
      const videoId = match ? match[1] : null;

      const titleEl = el.querySelector('#video-title');
      const titleText = titleEl?.textContent.trim() || '';
      const idMatch = titleText.match(/#(\d+)/); // ✅ extract first #number
      const puzzleId = idMatch ? parseInt(idMatch[1], 10) : null;

      if (!videoId || !puzzleId) return null;

      const padded = String(puzzleId).padStart(3, '0');
      return {
        number: padded,
        filename: `tango-${padded}.png`,
        url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      };
    }).filter(Boolean);

    result.sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));

    const jsonStr = JSON.stringify(result, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const a = document.createElement('a');

    a.href = URL.createObjectURL(blob);
    a.download = 'tango-thumbnails.json';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    console.log('✅ JSON file sorted by puzzle number and download triggered');
  })();
  ```

  </details>

4. In the folder [./tango-data](./tango-data/) you will find a script called `download-thumbnails.js` which can be executed by running `npm run download-thumbnails`. This will store all thumbnails to [./tango-data/thumbnails/](./tango-data/thumbnails/)

5. Parse the data

The images need to be processed into the following structure

### Data structure

The Tango data needs to look like this

```json
[
  {
    "id": 1,
    "size": 6,
    "prefilled": {
      "0,0": "🌑",
      "0,3": "☀️",
      "2,2": "🌑",
      "3,5": "☀️",
      "5,0": "🌑"
    },
    "constraints": [
      ["0,1", "0,2", "="],
      ["2,2", "3,2", "x"],
      ["3,5", "3,4", "="]
    ]
  }
]
```

#### JSON fields

| Field | Type | Description|
| ----- | ---- | ---------- |
| `id` | `number` | Unique puzzle number |
| `size` | `number` | Board size (e.g., 6×6) |
| `prefilled` | `object` | Sparse key-value map of prefilled cells (`"row,col"` → `"🌑"` or `"☀️"`)                                                |
| `constraints` | `array`  | Array of 3-item arrays: `[from, to, type]`, where `from` and `to` are `"row,col"` strings, and `type` is `"="` or `"x"` |

#### Breakdown of Constraints Format

Each constraint is:

```ts
[from: string, to: string, type: "=" | "x"]
```

- `"0,1"` means row 0, column 1.
- `"0,2"` means row 0, column 2.
= `"="` means the values in those two cells must be equal (both 🌑 or both ☀️).
- `"x"` means they must be different.

#### Prefilled visualization

|       | **0**  | **1**  | **2**  | **3** | **4** | **5**  |
| ----- | -- | -- | -- | - | - | -- |
| **0** |    | 🌑 | 🌑 |   |   |    |
| **1** |    |    |    |   |   |    |
| **2** |    |    | 🌑 |   |   |    |
| **3** |    |    |    |   |   | ☀️ |
| **4** |    |    |    |   |   |    |
| **5** | 🌑 |    |    |   |   |    |

#### Constraints visualization

`["0,1", "0,2", "="]` Cell at (0,1) must equal cell at (0,2)

```
Row 0:     🌑  =  🌑
           ^     ^
         (0,1) (0,2)
```

`["2,2", "3,2", "x"]` Cell at (2,2) must be different from (3,2)

```
Column 2:  ...
           🌑   ← (2,2)
           ❌   ← (3,2) must be ☀️
```

### Start parsing

The file [`./tango-data/process.images.ts`](./tango-data/process.images.ts) can parse the just saved thumbnails into JSON based on the following:

- You can select the thumbnails based on:
  - A predefined file list
  - Scan the folder
  - Provide files `25-99`
- The images will be parsed based on
  1. Cut the thumbnails based on "default" boundaries
  2. Converted to greyscale images so they then be processed better
  3. Based on the greyscaled images we try to determine the top line of the grid and then calculate the grid boundaries so it can be cut out more precisely 
  4. Determine the constraints (`x` and `=` symbols on the borders) This will be done by:
    - calculating the cell size and "remove" the icons
    - increase contrast to highlight the symbols even more and removing the existing borders
    - use `x` and `=` templates to do matching and calculate their position
    - draw the data on an temporary image so they can be debugged
    - return data where the constraints are found
  5. Find the prefilled fields and their icons
  6. Check if the found constraints and prefilled fields result in a puzzle that can be played
  7. Output the data to a [`puzzles.json`](./app-data/puzzles.json) file, new puzzles will be added, existing ones will not be overwritten. We also store a [`version.json`](./app-data/version.json) file which will be pushed so the app can determine if new games can be downloaded

The images can be processed by running the following in a terminal

```bash
npm run process-images
```

This is for running it once. During development/bugfixes of the script you can run

```bash
npm run process-images:watch
```

**IMPORTANT:** The image with the grid needs to have suns/moons/prefilled fields. Other icons **CAN NOT** be detected and need to be excluded, see the `puzzleNumbersToSkip` const to add them

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