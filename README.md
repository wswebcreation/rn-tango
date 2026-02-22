# LinkedIn Games Tango App fir iOS

I'd love to play the LinkedIn Tango game, but there is no history. So I've downloaded the history and created my own Tango React Native App with [EXPO](https://expo.dev/). **This project only supports iOS, NOT Android**

## About Tango
Tango is a logic puzzle game where you place sun (☀️) and moon (🌑) symbols on a grid while satisfying equality (=) and inequality (x) constraints between cells.

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