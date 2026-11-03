# Android APK build

This source is configured for a Capacitor Android shell with a local Vite SPA build. It is intended to bundle the application frontend into the APK rather than load a hosted website.

## Local build

1. Install Node.js 22, Java 17, Android Studio and the Android SDK.
2. Run `npm install`.
3. Run `npm run build`.
4. Run `npx cap add android` once.
5. Run `npx cap sync android`.
6. Open with `npx cap open android`, or run `cd android && ./gradlew assembleDebug`.

The debug APK is created at `android/app/build/outputs/apk/debug/app-debug.apk`.

## GitHub Actions build

Push this project to a GitHub repository. Open Actions, select **Build Android APK**, and run the workflow. Download the `her-voice-android-apk` artifact from the completed run.

## Offline limits

The app frontend is packaged locally. The app currently fetches Google Fonts from the internet, so typography may fall back to system fonts while offline. The audio library uses browser storage APIs (IndexedDB/localStorage) within the WebView. Validate recording/import/playback behavior on a physical Android device before distributing a release.

## Branding cleanup

Builder-specific error telemetry and project metadata have been removed from this copy. This does not remove third-party branding embedded in any assets you separately add later.
