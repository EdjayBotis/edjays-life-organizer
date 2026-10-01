package com.edjay.lifeorganizer;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;

public final class NativeActionStore {
    private static final String PREFS = "native_notification_actions";
    private static final String KEY = "queue";

    public static synchronized void push(Context context, JSONObject action) {
        try {
            SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONArray arr = new JSONArray(p.getString(KEY, "[]"));
            arr.put(action);
            p.edit().putString(KEY, arr.toString()).apply();
        } catch (Exception ignored) {}
    }

    public static synchronized String pullAll(Context context) {
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String value = p.getString(KEY, "[]");
        p.edit().putString(KEY, "[]").apply();
        return value;
    }
}
