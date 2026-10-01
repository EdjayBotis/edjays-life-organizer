package com.edjay.lifeorganizer;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.webkit.*;
import android.widget.Toast;
import org.json.JSONObject;
import android.util.Log;
import android.content.ContentValues;
import android.provider.MediaStore;
import android.webkit.ValueCallback;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private static final int FILE_CHOOSER_REQUEST = 44;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        NotificationReceiver.ensureChannel(this);
        webView = new WebView(this);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidApp");
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) { deliverPendingActions(); }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = callback;
                Intent intent = params.createIntent();
                try { startActivityForResult(intent, FILE_CHOOSER_REQUEST); return true; }
                catch (Exception e) { filePathCallback = null; Toast.makeText(MainActivity.this, "Could not open file picker.", Toast.LENGTH_LONG).show(); return false; }
            }
        });
        webView.loadUrl("file:///android_asset/www/index.html");
        requestNotificationPermission();
    }

    @Override protected void onResume() {
        super.onResume();
        if (webView != null) deliverPendingActions();
    }

    @Override public void onBackPressed() {
        if (webView == null) { super.onBackPressed(); return; }
        webView.evaluateJavascript("window.__handleAndroidBack ? window.__handleAndroidBack() : false", value -> {
            boolean handled = "true".equals(value);
            if (!handled) {
                if (webView.canGoBack()) webView.goBack();
                else fallbackBack();
            }
        });
    }

    private void fallbackBack() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST && filePathCallback != null) {
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null) results = new Uri[]{data.getData()};
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        }
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 10);
        }
    }

    private void deliverPendingActions() {
        String json = NativeActionStore.pullAll(this);
        if ("[]".equals(json)) return;
        String quoted = JSONObject.quote(json);
        webView.post(() -> webView.evaluateJavascript("window.__applyNativeNotificationActions && window.__applyNativeNotificationActions(" + quoted + ");", null));
    }

    public class AndroidBridge {
        @JavascriptInterface public boolean isNativeAndroid() { return true; }

        @JavascriptInterface public void requestPermissions() {
            runOnUiThread(() -> {
                requestNotificationPermission();
                if (Build.VERSION.SDK_INT >= 31) {
                    AlarmManager am = (AlarmManager) getSystemService(ALARM_SERVICE);
                    if (!am.canScheduleExactAlarms()) {
                        try {
                            Intent i = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + getPackageName()));
                            startActivity(i);
                        } catch (Exception e) {
                            Toast.makeText(MainActivity.this, "Allow exact alarms in Android settings for exact-time reminders.", Toast.LENGTH_LONG).show();
                        }
                    }
                }
            });
        }

        @JavascriptInterface public boolean scheduleNotification(String json) {
            try {
                JSONObject o = new JSONObject(json);
                String tag = o.getString("tag");
                long when = o.getLong("when");
                if (when <= System.currentTimeMillis()) return false;
                Intent i = new Intent(MainActivity.this, NotificationReceiver.class)
                    .setAction(NotificationReceiver.FIRE)
                    .putExtra("tag", tag)
                    .putExtra("title", o.optString("title", "Reminder"))
                    .putExtra("body", o.optString("body", ""))
                    .putExtra("kind", o.optString("kind", "schedule"))
                    .putExtra("autoNoMin", o.optInt("autoNoMin", 0))
                    .putExtra("vibrate", o.optBoolean("vibrate", true));
                PendingIntent pi = PendingIntent.getBroadcast(MainActivity.this, tag.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                AlarmManager am = (AlarmManager) getSystemService(ALARM_SERVICE);
                try { am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi); }
                catch (SecurityException e) { am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi); }
                return true;
            } catch (Exception e) {
                Log.e("EdjayNotifications", "Failed to schedule notification", e);
                return false;
            }
        }

        @JavascriptInterface public String getNotificationStatus() {
            try {
                JSONObject o = new JSONObject();
                boolean notificationAllowed = Build.VERSION.SDK_INT < 33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
                AlarmManager am = (AlarmManager) getSystemService(ALARM_SERVICE);
                boolean exactAllowed = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
                o.put("notifications", notificationAllowed);
                o.put("exactAlarms", exactAllowed);
                return o.toString();
            } catch (Exception e) { return "{}"; }
        }

        @JavascriptInterface public boolean saveBackup(String json, String filename) {
            try {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                values.put(MediaStore.Downloads.MIME_TYPE, "application/json");
                if (Build.VERSION.SDK_INT >= 29) values.put(MediaStore.Downloads.RELATIVE_PATH, "Download/Edjays Life Organizer");
                Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) return false;
                try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                    if (out == null) return false;
                    out.write(json.getBytes(StandardCharsets.UTF_8));
                }
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Backup saved to Downloads.", Toast.LENGTH_LONG).show());
                return true;
            } catch (Exception e) { Log.e("EdjayBackup", "Backup export failed", e); return false; }
        }

        @JavascriptInterface public void cancelNotification(String tag) {
            Intent i = new Intent(MainActivity.this, NotificationReceiver.class).setAction(NotificationReceiver.FIRE).putExtra("tag", tag);
            PendingIntent pi = PendingIntent.getBroadcast(MainActivity.this, tag.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            ((AlarmManager) getSystemService(ALARM_SERVICE)).cancel(pi);
            ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).cancel(tag.hashCode());
        }
    }
}
