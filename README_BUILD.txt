Edjay's Life Organizer V3.6 - Android build notes

V3.6 fixes:
- Thesis cost bar now reacts immediately to BOM purchased/unpurchased toggles.
- Purchased BOM items without an entered actual cost use planned cost for the live spent/used bar until an actual cost is entered.
- My Stats cards now open Thesis, Money, Tasks, and a Needs Attention inventory filter directly.
- Routine circles are directly checkable/undoable.
- Thesis progress refreshes underlying tabs immediately.
- Faster Android mind-map panning.
- Clearer Life icons for clothes, food and health.
- Full Schedule stays expanded while updating multiple items.
- Today-at-a-Glance stats jump to their related section.
- Thesis Open Budget jumps directly to the detailed BOM.
- Saved reminders now schedule real native Android alarms.
- Notification Settings includes permission diagnostics and a 10-second test.

EDJAY'S LIFE ORGANIZER — ANDROID V3.4

VERSION
- versionName: 3.6.0
- versionCode: 4

WHAT IS INCLUDED
- Existing V3.3 web UI preserved inside Android WebView.
- Proper launcher icon resources generated from the existing app icon.
- Native exact-time Android alarms.
- Vibration support.
- Auto-No timeout: 3 / 5 / 10 / 15 / 30 minutes / Never.
- Normal schedule notification: YES | NO.
- Workout notification: YES | NO | RESCHEDULE.
- Thesis notification: START | NOT NOW.
- Notification actions are stored even when the UI is closed and synced into the app when it opens.
- Separate debug and signed-release GitHub Actions workflows.

DEBUG BUILD
The GitHub workflow .github/workflows/build-debug.yml runs on pushes to main.
Artifact: Edjays-Life-Organizer-v3.4.0-debug
APK: app-debug.apk

SIGNED RELEASE BUILD
The release workflow requires one permanent signing keystore. Keep this keystore and its passwords forever. Future APK updates must be signed with the same key.

1. Create the keystore once on Windows (Java/JDK required):
   keytool -genkeypair -v -keystore edjay-release.jks -alias edjay -keyalg RSA -keysize 2048 -validity 10000

2. Convert the keystore to Base64. From PowerShell in this project:
   .\tools\encode-keystore.ps1 -KeystorePath "C:\path\to\edjay-release.jks"

3. In GitHub repository: Settings > Secrets and variables > Actions > New repository secret.
   Create these four secrets:
   ANDROID_KEYSTORE_BASE64  = Base64 text copied by the PowerShell helper
   ANDROID_STORE_PASSWORD   = keystore password
   ANDROID_KEY_ALIAS        = edjay (or the alias you chose)
   ANDROID_KEY_PASSWORD     = key password

4. Open Actions > Build Signed Release APK > Run workflow.
   Artifact: Edjays-Life-Organizer-v3.4.0-release

IMPORTANT FOR THE FIRST RELEASE INSTALL
Earlier debug APKs may have the same application ID but a different signing key. Android will reject a signed release APK as an update to an APK signed with the debug key. Back up app data first, uninstall the old debug APK if Android reports a signature conflict, then install the V3.4 signed release. After that, future signed releases using this same keystore can install over the previous release normally.

NOTIFICATION MEANING
- Normal: YES marks the schedule item Done; NO marks it Missed.
- Workout: YES marks the workout Completed and awards workout XP; NO marks Missed and applies the workout miss penalty; RESCHEDULE marks it Rescheduled with no miss penalty.
- Thesis: START marks the scheduled thesis session Started; NOT NOW records Not Now without claiming completion. An ignored notification still follows the configured Auto-No timeout.

APK SHARING
You may share the signed release APK directly with friends. Android may ask them to allow installation from the browser/file manager because the APK is not coming from Google Play.
