package com.edjay.lifeorganizer;

import android.app.*;
import android.content.*;
import android.os.Build;
import org.json.JSONObject;

public class NotificationReceiver extends BroadcastReceiver {
    public static final String CHANNEL_ID = "life_schedule";
    public static final String FIRE = "com.edjay.lifeorganizer.FIRE";
    public static final String AUTO_NO = "com.edjay.lifeorganizer.AUTO_NO";
    public static final String USER_ACTION = "com.edjay.lifeorganizer.USER_ACTION";

    @Override public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        String tag = intent.getStringExtra("tag");
        if (tag == null) return;
        String kind = intent.getStringExtra("kind");
        if (kind == null || kind.isEmpty()) kind = "schedule";

        if (USER_ACTION.equals(action)) {
            String userAction = intent.getStringExtra("userAction");
            record(context, tag, kind, userAction == null ? "open" : userAction, false);
            cancelAutoNo(context, tag);
            ((NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE)).cancel(tag.hashCode());
            launchApp(context);
            return;
        }

        if (AUTO_NO.equals(action)) {
            record(context, tag, kind, "no", true);
            ((NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE)).cancel(tag.hashCode());
            return;
        }

        if (FIRE.equals(action)) {
            show(context, intent);
            int autoNoMin = intent.getIntExtra("autoNoMin", 0);
            if (autoNoMin > 0) scheduleAutoNo(context, tag, kind, autoNoMin);
        }
    }

    private static void show(Context context, Intent source) {
        ensureChannel(context);
        String tag = source.getStringExtra("tag");
        String title = source.getStringExtra("title");
        String body = source.getStringExtra("body");
        String kind = source.getStringExtra("kind");
        if (kind == null || kind.isEmpty()) kind = "schedule";
        boolean vibrate = source.getBooleanExtra("vibrate", true);

        Intent open = new Intent(context, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPi = PendingIntent.getActivity(context, tag.hashCode(), open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(context, CHANNEL_ID) : new Notification.Builder(context);
        b.setSmallIcon(android.R.drawable.ic_popup_reminder)
         .setContentTitle(title)
         .setContentText(body)
         .setContentIntent(openPi)
         .setAutoCancel(true)
         .setCategory(Notification.CATEGORY_REMINDER)
         .setPriority(Notification.PRIORITY_HIGH);
        if (vibrate) b.setVibrate(new long[]{0,180,100,180});

        if ("workout".equals(kind)) {
            b.addAction(new Notification.Action.Builder(null, "YES", actionPi(context, tag, kind, "yes")).build());
            b.addAction(new Notification.Action.Builder(null, "NO", actionPi(context, tag, kind, "no")).build());
            b.addAction(new Notification.Action.Builder(null, "RESCHEDULE", actionPi(context, tag, kind, "reschedule")).build());
        } else if ("thesis".equals(kind)) {
            b.addAction(new Notification.Action.Builder(null, "START", actionPi(context, tag, kind, "start")).build());
            b.addAction(new Notification.Action.Builder(null, "NOT NOW", actionPi(context, tag, kind, "not_now")).build());
        } else {
            b.addAction(new Notification.Action.Builder(null, "YES", actionPi(context, tag, kind, "yes")).build());
            b.addAction(new Notification.Action.Builder(null, "NO", actionPi(context, tag, kind, "no")).build());
        }

        ((NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE)).notify(tag.hashCode(), b.build());
    }

    private static PendingIntent actionPi(Context context, String tag, String kind, String userAction) {
        Intent i = new Intent(context, NotificationReceiver.class)
            .setAction(USER_ACTION)
            .putExtra("tag", tag)
            .putExtra("kind", kind)
            .putExtra("userAction", userAction);
        return PendingIntent.getBroadcast(context, (tag + ":" + userAction).hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void scheduleAutoNo(Context context, String tag, String kind, int minutes) {
        Intent i = new Intent(context, NotificationReceiver.class)
            .setAction(AUTO_NO)
            .putExtra("tag", tag)
            .putExtra("kind", kind);
        PendingIntent pi = PendingIntent.getBroadcast(context, (tag + ":auto").hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        long when = System.currentTimeMillis() + minutes * 60_000L;
        try { am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi); }
        catch (SecurityException e) { am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi); }
    }

    private static void cancelAutoNo(Context context, String tag) {
        Intent i = new Intent(context, NotificationReceiver.class).setAction(AUTO_NO).putExtra("tag", tag);
        PendingIntent pi = PendingIntent.getBroadcast(context, (tag + ":auto").hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        ((AlarmManager) context.getSystemService(Context.ALARM_SERVICE)).cancel(pi);
    }

    private static void record(Context context, String tag, String kind, String action, boolean auto) {
        try {
            JSONObject o = new JSONObject();
            o.put("tag", tag);
            o.put("kind", kind);
            o.put("action", action);
            o.put("auto", auto);
            o.put("at", System.currentTimeMillis());
            NativeActionStore.push(context, o);
        } catch (Exception ignored) {}
    }

    private static void launchApp(Context context) {
        Intent i = new Intent(context, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        context.startActivity(i);
    }

    static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel c = new NotificationChannel(CHANNEL_ID, "Schedule reminders", NotificationManager.IMPORTANCE_HIGH);
            c.enableVibration(true);
            c.setDescription("Exact reminders for my schedule, workouts and thesis sessions");
            ((NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE)).createNotificationChannel(c);
        }
    }
}
