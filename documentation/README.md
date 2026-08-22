# Click2Chat

Click2Chat is an Angular and Capacitor application for starting WhatsApp conversations by country code and mobile number without saving contacts. An optional build-time feature can also provide recent-call actions for non-Play distribution.

## Features

- Optional Android recent-call history with contact names supplied by the device call log.
- Optional WhatsApp and dialler actions beside recent calls.
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

The default browser and Play builds support direct chats without call-log access.

## Android

Install the Capacitor packages declared in `package.json`, then generate the native shell:

```bash
npm i @capacitor/android@^8.4.2 @capacitor/core@^8.4.2 && npm i -D @capacitor/cli@^8.4.2
npm run android:add
npm run android:sync
```

See [documentation/ANDROID.md](documentation/ANDROID.md) for versioning, signing, permissions, CI triggers and release artifacts.

## Optional call history

`enableCallHistory` in `src/environments/environment.ts` is the single build-time switch for the Recent calls route, navigation tab, and Android `READ_CALL_LOG` integration. It defaults to `false`. When disabled, the feature and navigation are absent from the built app and the native patch removes the permission.

`callHistoryLimit` controls the maximum number of entries only when the optional feature is enabled. After changing either value, rerun `npm run android:sync`.

`defaultCountry` controls the initial country on a first launch. It defaults to India; after the user chooses another country, that preference is restored on later launches.
