# Her Voice — Android-ready source

This project is configured as a local-first Capacitor Android app. The app shell and frontend assets are bundled into the APK. Voice notes and preferences use on-device browser storage APIs.

## Requirements
- Node.js 22 or newer
- Java 17 for Android builds
- Android SDK (installed with Android Studio)

## Build the web app
```bash
npm install
npm run build
```

## Create and open the Android project
```bash
npx cap add android
npx cap sync android
npx cap open android
```

In Android Studio, choose **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

For a local debug build on Linux/macOS: `npm run android:debug`.

## Automated APK build
Push this project to GitHub, then open **Actions → Build Android APK → Run workflow**. Download `app-debug.apk` from the `her-voice-android-apk` artifact.

## Offline notes
The app shell and bundled assets are packaged inside the APK. Google Fonts are currently loaded from Google Fonts and therefore require internet to fetch unless replaced with bundled font files. Any external services added later will also require internet.
