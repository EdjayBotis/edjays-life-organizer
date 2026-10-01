EDJAY'S LIFE ORGANIZER — ANDROID PROJECT

This project embeds the V3.3 offline web app directly inside an Android WebView.
No UI redesign is involved.

NATIVE FEATURES INCLUDED
- Android notification permission
- Exact Alarm permission request (Android 12+)
- Exact-time schedule alarms via AlarmManager
- YES / NO notification actions
- Vibration
- Auto-No after 3/5/10/15/30 minutes (or Never)
- Notification actions are stored natively while the app is closed and synchronized into V3 state on app open/resume
- Existing localStorage data stays inside the Android app's WebView storage

BUILD IN ANDROID STUDIO (Windows)
1. Install/open Android Studio.
2. File > Open and select this folder.
3. Let Gradle Sync finish. If asked to install Android SDK 35 / Build Tools, accept/install them.
4. Build > Build Bundle(s) / APK(s) > Build APK(s).
5. The debug APK will normally be at:
   app\\build\\outputs\\apk\\debug\\app-debug.apk
6. Copy the APK to the phone and install it.

FIRST RUN
- Allow Notifications.
- On Android 12+, allow Alarms & reminders / exact alarms when prompted.
- In the app, open notification settings and enable notifications.

NOTE
This source does not include the Gradle wrapper binary because the build environment used to prepare it cannot download Android/Gradle binaries. Android Studio supplies the required build tooling during Sync.
