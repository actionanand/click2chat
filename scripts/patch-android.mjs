import { access, copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const capacitorConfigPath = resolve('android/app/src/main/assets/capacitor.config.json');
const capacitorConfig = JSON.parse(await readFile(capacitorConfigPath, 'utf8'));
const appId = capacitorConfig.appId;
if (typeof appId !== 'string' || !appId.trim()) {
  throw new Error(`Android appId is missing from ${capacitorConfigPath}.`);
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const javaPath = resolve('android/app/src/main/java', ...appId.split('.'), 'MainActivity.java');
const manifestPath = resolve('android/app/src/main/AndroidManifest.xml');
const gradlePath = resolve('android/app/build.gradle');
const proguardPath = resolve('android/app/proguard-rules.pro');
const resPath = resolve('android/app/src/main/res');
const stylesPath = resolve(resPath, 'values/styles.xml');
const nightStylesPath = resolve(resPath, 'values-night/styles.xml');
const splashSourcePath = resolve('public/click2chat.png');
const splashLogoPath = resolve(resPath, 'drawable-nodpi/click2chat_splash_logo.png');
const splashIconPath = resolve(resPath, 'drawable/click2chat_splash_icon.xml');
const splashPath = resolve(resPath, 'drawable/splash.xml');
const enableCallLog = process.env.ENABLE_DEVICE_CALL_LOG !== 'false';
const environmentSource = await readFile(resolve('src/environments/environment.ts'), 'utf8');
const limitMatch = environmentSource.match(/callHistoryLimit\s*:\s*(\d+)/);
const callHistoryLimit = limitMatch ? Number(limitMatch[1]) : 100;

await access(javaPath).catch(() => {
  throw new Error(`Android project file not found: ${javaPath}. Run "npx cap add android" first.`);
});

let manifest = await readFile(manifestPath, 'utf8');
if (enableCallLog && !manifest.includes('android.permission.READ_CALL_LOG')) {
  manifest = manifest.replace(
    /(<manifest[^>]*>)/,
    '$1\n    <uses-permission android:name="android.permission.READ_CALL_LOG" />',
  );
}
if (!enableCallLog) {
  manifest = manifest.replace(
    /\s*<uses-permission android:name="android\.permission\.READ_CALL_LOG"\s*\/>/g,
    '',
  );
}

for (const packageName of ['com.whatsapp', 'com.whatsapp.w4b']) {
  if (manifest.includes(`android:name="${packageName}"`)) continue;
  if (manifest.includes('<queries>')) {
    manifest = manifest.replace(
      '</queries>',
      `        <package android:name="${packageName}" />\n    </queries>`,
    );
  } else {
    manifest = manifest.replace(
      '</manifest>',
      `    <queries>\n        <package android:name="${packageName}" />\n    </queries>\n</manifest>`,
    );
  }
}

manifest = manifest.replace(/<application\b[^>]*>/, (application) => {
  const attribute = /android:allowBackup="[^"]*"/;
  return attribute.test(application)
    ? application.replace(attribute, 'android:allowBackup="false"')
    : application.replace(/>$/, '\n        android:allowBackup="false">');
});
manifest = manifest.replace(
  /<activity\b(?=[^>]*android:name="\.MainActivity")[^>]*>/,
  (activity) => {
    let patchedActivity = activity.includes('android:theme=')
      ? activity.replace(
          /android:theme="[^"]*"/,
          'android:theme="@style/AppTheme.NoActionBarLaunch"',
        )
      : activity.replace(/>$/, '\n            android:theme="@style/AppTheme.NoActionBarLaunch">');
    patchedActivity = patchedActivity.includes('android:windowSoftInputMode=')
      ? patchedActivity.replace(
          /android:windowSoftInputMode="[^"]*"/,
          'android:windowSoftInputMode="adjustResize"',
        )
      : patchedActivity.replace(/>$/, '\n            android:windowSoftInputMode="adjustResize">');
    return patchedActivity;
  },
);
await writeFile(manifestPath, manifest, 'utf8');

let gradle = await readFile(gradlePath, 'utf8');
gradle = gradle
  .replace(/minifyEnabled\s+false/, 'minifyEnabled true')
  .replace(
    /getDefaultProguardFile\(['"]proguard-android\.txt['"]\)/g,
    "getDefaultProguardFile('proguard-android-optimize.txt')",
  );
if (!gradle.includes('shrinkResources true')) {
  gradle = gradle.replace(
    /minifyEnabled\s+true/,
    'minifyEnabled true\n            shrinkResources true',
  );
}
await writeFile(gradlePath, gradle, 'utf8');
if (!/minifyEnabled\s+true/.test(gradle) || !gradle.includes('shrinkResources true')) {
  throw new Error(`Could not enable R8 release optimization in ${gradlePath}.`);
}

let proguardRules = (await fileExists(proguardPath)) ? await readFile(proguardPath, 'utf8') : '';
if (!proguardRules.includes('@android.webkit.JavascriptInterface <methods>')) {
  proguardRules = `${proguardRules.trimEnd()}\n\n# Keep the native methods exposed to the Angular WebView.\n-keepclassmembers class * {\n    @android.webkit.JavascriptInterface <methods>;\n}\n`;
}
await writeFile(proguardPath, `${proguardRules.trimEnd()}\n`, 'utf8');

try {
  for (const directory of await readdir(resPath)) {
    if (!directory.startsWith('drawable')) continue;
    const generatedPng = resolve(resPath, directory, 'splash.png');
    const generatedXml = resolve(resPath, directory, 'splash.xml');
    if (await fileExists(generatedPng)) await rm(generatedPng);
    if (directory !== 'drawable' && (await fileExists(generatedXml))) await rm(generatedXml);
  }
} catch {
  // Capacitor creates resource folders during sync; absent folders need no patch.
}

await mkdir(dirname(splashLogoPath), { recursive: true });
await mkdir(dirname(splashIconPath), { recursive: true });
await copyFile(splashSourcePath, splashLogoPath);
await writeFile(
  splashIconPath,
  `<?xml version="1.0" encoding="utf-8"?>
<inset xmlns:android="http://schemas.android.com/apk/res/android"
    android:drawable="@drawable/click2chat_splash_logo"
    android:inset="20%" />`,
  'utf8',
);
await writeFile(
  splashPath,
  `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item><shape android:shape="rectangle"><solid android:color="#0D1713" /></shape></item>
    <item android:gravity="center"><inset android:drawable="@drawable/click2chat_splash_icon" android:inset="32%" /></item>
</layer-list>`,
  'utf8',
);

async function ensureThemes(path, dark) {
  await mkdir(dirname(path), { recursive: true });
  let styles = (await fileExists(path))
    ? await readFile(path, 'utf8')
    : '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n</resources>\n';
  const background = dark ? '#0D1713' : '#F4F8F6';
  const lightBars = dark ? 'false' : 'true';
  const body = `    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="android:statusBarColor">${background}</item>
        <item name="android:navigationBarColor">${background}</item>
        <item name="android:windowLightStatusBar">${lightBars}</item>
        <item name="android:windowLightNavigationBar">${lightBars}</item>
    </style>
    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="windowSplashScreenBackground">#0D1713</item>
        <item name="windowSplashScreenAnimatedIcon">@drawable/click2chat_splash_icon</item>
        <item name="windowSplashScreenIconBackgroundColor">@android:color/transparent</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
        <item name="android:statusBarColor">#0D1713</item>
        <item name="android:navigationBarColor">#0D1713</item>
        <item name="android:windowLightStatusBar">false</item>
        <item name="android:windowLightNavigationBar">false</item>
    </style>`;
  styles = styles.replace(/\s*<style name="AppTheme\.NoActionBar"[\s\S]*?<\/style>/g, '');
  styles = styles.replace(/\s*<style name="AppTheme\.NoActionBarLaunch"[\s\S]*?<\/style>/g, '');
  styles = styles.replace('</resources>', `${body}\n</resources>`);
  await writeFile(path, styles, 'utf8');
}

await ensureThemes(stylesPath, false);
await ensureThemes(nightStylesPath, true);

const source = `package ${appId};

import android.Manifest;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.CallLog;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;
import android.webkit.JavascriptInterface;

import com.getcapacitor.BridgeActivity;

import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
  private static final boolean DEVICE_CALL_LOG_ENABLED = ${enableCallLog};
  private static final int CALL_LOG_PERMISSION_REQUEST = 4801;
  private boolean darkMode;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    darkMode = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
      == Configuration.UI_MODE_NIGHT_YES;
    getBridge().getWebView().addJavascriptInterface(new Click2ChatNativeBridge(), "Click2ChatNative");
    getBridge().getWebView().addJavascriptInterface(new SystemBarsBridge(), "Click2ChatSystemBars");
    applySystemBars(darkMode);
  }

  @Override
  public void onResume() {
    super.onResume();
    applySystemBars(darkMode);
  }

  @Override
  public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
    if (requestCode == CALL_LOG_PERMISSION_REQUEST) {
      if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
        dispatchDeviceCallHistory();
      } else {
        dispatchNativeResult("call-history", false, "", "Call history permission was not granted.");
      }
      return;
    }
    super.onRequestPermissionsResult(requestCode, permissions, grantResults);
  }

  public class SystemBarsBridge {
    @JavascriptInterface
    public void setDarkMode(boolean enabled) {
      darkMode = enabled;
      runOnUiThread(() -> applySystemBars(enabled));
    }
  }

  public class Click2ChatNativeBridge {
    @JavascriptInterface
    public String readClipboard() {
      ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
      if (clipboard == null || !clipboard.hasPrimaryClip()) return "";
      ClipData clip = clipboard.getPrimaryClip();
      if (clip == null || clip.getItemCount() == 0) return "";
      CharSequence text = clip.getItemAt(0).coerceToText(MainActivity.this);
      return text == null ? "" : text.toString();
    }

    @JavascriptInterface
    public String availableWhatsAppApps() {
      JSONArray apps = new JSONArray();
      if (isPackageAvailable("com.whatsapp")) apps.put("com.whatsapp");
      if (isPackageAvailable("com.whatsapp.w4b")) apps.put("com.whatsapp.w4b");
      return apps.toString();
    }

    @JavascriptInterface
    public void openDialler(String number) {
      runOnUiThread(() ->
        startActivity(new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + Uri.encode(number))))
      );
    }

    @JavascriptInterface
    public void openWhatsApp(String number, String message) {
      runOnUiThread(() -> {
        String url = whatsAppUrl(number, message);
        for (String packageName : new String[] { "com.whatsapp", "com.whatsapp.w4b" }) {
          Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
          intent.setPackage(packageName);
          if (intent.resolveActivity(getPackageManager()) != null) {
            startActivity(intent);
            return;
          }
        }
        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
      });
    }

    @JavascriptInterface
    public void openWhatsAppIn(String number, String message, String packageName) {
      runOnUiThread(() -> {
        String url = whatsAppUrl(number, message);
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        intent.setPackage(packageName);
        if (intent.resolveActivity(getPackageManager()) != null) startActivity(intent);
        else startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
      });
    }

    @JavascriptInterface
    public boolean deviceCallHistorySupported() {
      return DEVICE_CALL_LOG_ENABLED;
    }

    @JavascriptInterface
    public boolean deviceCallHistoryPermissionGranted() {
      return DEVICE_CALL_LOG_ENABLED && (
        Build.VERSION.SDK_INT < Build.VERSION_CODES.M
          || checkSelfPermission(Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED
      );
    }

    @JavascriptInterface
    public boolean shouldShowCallHistoryPermissionRationale() {
      return DEVICE_CALL_LOG_ENABLED
        && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
        && shouldShowRequestPermissionRationale(Manifest.permission.READ_CALL_LOG);
    }

    @JavascriptInterface
    public void requestDeviceCallHistory() {
      runOnUiThread(() -> {
        if (!DEVICE_CALL_LOG_ENABLED) {
          dispatchNativeResult("call-history", false, "", "Call history is disabled in this build.");
          return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
          && checkSelfPermission(Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
          requestPermissions(new String[] { Manifest.permission.READ_CALL_LOG }, CALL_LOG_PERMISSION_REQUEST);
          return;
        }
        dispatchDeviceCallHistory();
      });
    }
  }

  private String whatsAppUrl(String number, String message) {
    return "https://wa.me/" + number + (message.isEmpty() ? "" : "?text=" + Uri.encode(message));
  }

  private boolean isPackageAvailable(String packageName) {
    try {
      getPackageManager().getPackageInfo(packageName, 0);
      return true;
    } catch (PackageManager.NameNotFoundException ignored) {
      return false;
    }
  }

  private void dispatchDeviceCallHistory() {
    JSONArray calls = new JSONArray();
    String[] projection = new String[] {
      CallLog.Calls.NUMBER, CallLog.Calls.TYPE, CallLog.Calls.DATE,
      CallLog.Calls.DURATION, CallLog.Calls.CACHED_NAME
    };
    try (Cursor cursor = getContentResolver().query(
      CallLog.Calls.CONTENT_URI, projection, null, null, CallLog.Calls.DATE + " DESC")) {
      if (cursor == null) throw new IllegalStateException("Call history is unavailable.");
      int numberIndex = cursor.getColumnIndexOrThrow(CallLog.Calls.NUMBER);
      int typeIndex = cursor.getColumnIndexOrThrow(CallLog.Calls.TYPE);
      int dateIndex = cursor.getColumnIndexOrThrow(CallLog.Calls.DATE);
      int durationIndex = cursor.getColumnIndexOrThrow(CallLog.Calls.DURATION);
      int nameIndex = cursor.getColumnIndexOrThrow(CallLog.Calls.CACHED_NAME);
      int count = 0;
      while (cursor.moveToNext() && count < ${callHistoryLimit}) {
        String number = cursor.getString(numberIndex);
        String cachedName = cursor.getString(nameIndex);
        calls.put(new JSONObject()
          .put("id", cursor.getLong(dateIndex) + "-" + count)
          .put("number", number == null ? "" : number)
          .put("cachedName", cachedName == null ? "" : cachedName)
          .put("type", callType(cursor.getInt(typeIndex)))
          .put("timestamp", cursor.getLong(dateIndex))
          .put("durationSeconds", cursor.getLong(durationIndex)));
        count += 1;
      }
      dispatchNativeResult("call-history", true, calls.toString(), "");
    } catch (Exception error) {
      dispatchNativeResult("call-history", false, "", error.getMessage() == null ? "Call history could not be read." : error.getMessage());
    }
  }

  private String callType(int value) {
    switch (value) {
      case CallLog.Calls.INCOMING_TYPE: return "incoming";
      case CallLog.Calls.OUTGOING_TYPE: return "outgoing";
      case CallLog.Calls.MISSED_TYPE: return "missed";
      case CallLog.Calls.REJECTED_TYPE: return "rejected";
      case CallLog.Calls.BLOCKED_TYPE: return "blocked";
      case CallLog.Calls.VOICEMAIL_TYPE: return "voicemail";
      default: return "unknown";
    }
  }

  private void dispatchNativeResult(String action, boolean success, String data, String message) {
    runOnUiThread(() -> {
      if (isFinishing() || getBridge() == null || getBridge().getWebView() == null) return;
      String script = "window.dispatchEvent(new CustomEvent('click2chat-native-result',{detail:{"
        + "action:" + JSONObject.quote(action) + ",success:" + success + ","
        + "data:" + JSONObject.quote(data == null ? "" : data) + ","
        + "message:" + JSONObject.quote(message == null ? "" : message) + "}}));";
      getBridge().getWebView().evaluateJavascript(script, null);
    });
  }

  @SuppressWarnings("deprecation")
  private void applySystemBars(boolean dark) {
    Window window = getWindow();
    int background = Color.parseColor(dark ? "#0D1713" : "#F4F8F6");
    window.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(background));
    window.getDecorView().setBackgroundColor(background);
    getBridge().getWebView().setBackgroundColor(background);
    window.setStatusBarColor(background);
    window.setNavigationBarColor(background);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      window.setStatusBarContrastEnforced(false);
      window.setNavigationBarContrastEnforced(false);
    }
    View decor = window.getDecorView();
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      WindowInsetsController controller = decor.getWindowInsetsController();
      if (controller != null) {
        int appearance = dark ? 0 : WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
          | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
        controller.setSystemBarsAppearance(appearance,
          WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
            | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
      }
      return;
    }
    int flags = decor.getSystemUiVisibility();
    flags = dark ? flags & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR : flags | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      flags = dark ? flags & ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR : flags | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
    }
    decor.setSystemUiVisibility(flags);
  }
}
`;

await writeFile(javaPath, source, 'utf8');
console.log(
  `Applied Click2Chat Android bridge, splash, R8, WhatsApp and system-theme patches. Call log: ${enableCallLog ? 'enabled' : 'disabled'}.`,
);
