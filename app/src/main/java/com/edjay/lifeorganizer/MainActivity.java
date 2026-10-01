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

public class MainActivity extends Activity {
    private WebView webView;

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
        webView.loadUrl("file:///android_asset/www/index.html");
        requestNotificationPermission();
    }

    @Override protected void onResume() {
        super.onResume();
        if (webView != null) deliverPendingActions();
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
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

        @JavascriptInterface public void scheduleNotification(String json) {
            try {
                JSONObject o = new JSONObject(json);
                String tag = o.getString("tag");
                long when = o.getLong("when");
                Intent i = new Intent(MainActivity.this, NotificationReceiver.class)
                    .setAction(NotificationReceiver.FIRE)
                    .putExtra("tag", tag)
                    .putExtra("title", o.optString("title", "Reminder"))
                    .putExtra("body", o.optString("body", ""))
                    .putExtra("autoNoMin", o.optInt("autoNoMin", 0))
                    .putExtra("vibrate", o.optBoolean("vibrate", true));
                PendingIntent pi = PendingIntent.getBroadcast(MainActivity.this, tag.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                AlarmManager am = (AlarmManager) getSystemService(ALARM_SERVICE);
                if (when <= System.currentTimeMillis()) return;
                try { am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi); }
                catch (SecurityException e) { am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi); }
            } catch (Exception ignored) {}
        }

        @JavascriptInterface public void cancelNotification(String tag) {
            Intent i = new Intent(MainActivity.this, NotificationReceiver.class).setAction(NotificationReceiver.FIRE).putExtra("tag", tag);
            PendingIntent pi = PendingIntent.getBroadcast(MainActivity.this, tag.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            ((AlarmManager) getSystemService(ALARM_SERVICE)).cancel(pi);
            ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).cancel(tag.hashCode());
        }
    }
}
