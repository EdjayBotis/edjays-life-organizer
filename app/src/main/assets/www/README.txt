EDJAY'S LIFE ORGANIZER V3

Run on PC:
1. Extract the ZIP.
2. For full PWA/offline features, serve the folder with a local web server.
   Example (if Python is installed): python -m http.server 8080
3. Open http://localhost:8080 in Chrome/Edge.

Android testing:
1. Put the folder on a computer and serve it on the same Wi-Fi, or host it on an HTTPS site.
2. Open it in Chrome on Android.
3. Use Chrome menu > Add to Home screen / Install app.

Important V3 limitation:
Exact notification actions while the Android app is completely closed require a native Android APK/background scheduler. This PWA can save offline and show browser/PWA notifications while active, but Android may suspend web timers when closed. The planned V4 cloud sync is intentionally not included.


V3.2 Combined UI notes:
- Restored Today/UI design is the visual baseline.
- Edit level-config.js to rebalance rank XP caps and common XP rewards.
- Workout calendar remains a true month grid and now stores date status.
- Unexpected interruptions can shift, excuse, or mark affected flexible items Not Today.
