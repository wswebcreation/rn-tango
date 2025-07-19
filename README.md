# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.


## Build the App for iOS

Run 

```bash
eas build --platform ios --profile preview
```


## Add new devices to your profile

Run

```sh
eas device:create
```

And follow the instructions

### Clean the profiles

Run

```sh
eas credentials 
```

And delete/update profiles

## Collect Tango data

We use the [playlist](https://www.youtube.com/playlist?list=PLLE2dY85AtnfSpGLBlq9YQwxQQxLVi66w) of Daily Puzzles to get the history, then follow these steps

1. Open playlist [url](https://www.youtube.com/playlist?list=PLLE2dY85AtnfSpGLBlq9YQwxQQxLVi66w)
2. Fully scroll to the bottom so all videos are shown
3. Paste the following code in the browser, This will prompt you to download a file named `tango-thumbnails.json`

```js
(() => {
  const entries = [...document.querySelectorAll('ytd-playlist-video-renderer')];

  const result = entries.map(el => {
    const link = el.querySelector('a#thumbnail')?.href || '';
    const match = link.match(/v=([\w-]+)/);
    const videoId = match ? match[1] : null;

    const indexEl = el.querySelector('#index');
    const index = indexEl ? parseInt(indexEl.textContent.trim(), 10) : null;

    if (!videoId || !index) return null;

    const padded = String(index).padStart(3, '0');
    return {
      number: padded,
      filename: `tango-${padded}.png`,
      url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    };
  }).filter(Boolean);

  const jsonStr = JSON.stringify(result, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const a = document.createElement('a');

  a.href = URL.createObjectURL(blob);
  a.download = 'tango-thumbnails.json';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  console.log('✅ JSON file ready and download triggered');
})();
```
4. In the folder [./tango-data/tango-data](./tango-data/) you will find a script called `download-thumbnails.js` which can be executed by running `npm run download-thumbnails`. This will store all thumbnails to [./tango-data/thumbnails/](./tango-data/thumbnails/)
5. Parse the data (need to think of something smart to do this)