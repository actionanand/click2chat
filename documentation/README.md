# Click2Chat

Click2Chat is an Angular and Capacitor application for continuing recent phone conversations on WhatsApp without saving contacts. It also supports direct chat by country code and mobile number.

## Features

- Android recent-call history with contact names supplied by the device call log.
- One-tap WhatsApp message action beside every messageable call.
- Automatic WhatsApp/WhatsApp Business detection with an app chooser when both are installed.
- Direct-number chat with a searchable, accessible country-code picker and optional prefilled message.
- Light, dark and system appearance modes, including matching Android system bars.
- No contact saving, tagging, database, analytics or server-side phone-number processing.
- GitHub Actions release pipeline for versioned APK, AAB, R8 mapping and Play Store icon artifacts.

## Development

Use Node 24.16 or another version allowed by `package.json`.

```bash
npm install
npm run develop
```

The development server runs at `http://localhost:3033/`.

```bash
npm run lint
npm test -- --watch=false
npm run build
```

The browser build supports direct chats. Recent call history is shown only in the generated Android application because browsers cannot access the device call log.

## Android

Install the Capacitor packages declared in `package.json`, then generate the native shell:

```bash
npm i @capacitor/android@^8.4.2 @capacitor/core@^8.4.2 && npm i -D @capacitor/cli@^8.4.2
npm run android:add
npm run android:sync
```

See [documentation/ANDROID.md](documentation/ANDROID.md) for versioning, signing, permissions, CI triggers and release artifacts.

## Call history limit

`callHistoryLimit` in `src/environments/environment.ts` controls the maximum number of recent calls read by the generated Android bridge. After changing it, rerun `npm run android:sync`.
