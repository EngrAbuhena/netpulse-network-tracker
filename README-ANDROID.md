# NetPulse Android APK (personal-use build)

This is a lightweight Android WebView wrapper around the live NetPulse website at `https://netpulse-network.vercel.app/`. It is intended for personal installation and requires an internet connection. The APK shows the website inside an app window; it does not add native access to Wi-Fi, VPN, SSID, MAC addresses, or Android network controls.

## Build and download the APK

1. Push this repository, including `android/` and `.github/workflows/build-android-apk.yml`, to GitHub.
2. In GitHub, open **Actions** and select **Build NetPulse Android APK**.
3. Choose **Run workflow** if a run has not started automatically after the push.
4. When the run succeeds, open it and download the `NetPulse-Android-debug-APK` artifact.
5. Extract the artifact ZIP on your phone, open `app-debug.apk`, and allow installation from that source if Android asks.

The debug APK is for personal sideloading, not Google Play distribution. It is signed with a debug key and is not a Play Store release. A new GitHub Actions build may have a different temporary debug signing key; uninstall the previously installed debug APK before installing a newly built one.

If the app opens to a blank screen, first update **Android System WebView** and **Chrome** in Google Play, make sure the phone is online, and reopen NetPulse. The wrapper displays an error panel with retry/open-in-browser options if the hosted page still fails to load.

## Build requirements for local Android Studio use

- JDK 17
- Android SDK Platform 35 and Build Tools installed through Android Studio
- Gradle 8.11.1

From the `android/` directory, run `gradle assembleDebug`. The APK is written to `app/build/outputs/apk/debug/app-debug.apk`.
