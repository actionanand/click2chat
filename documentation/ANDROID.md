# Click2Chat Android build guide

Click2Chat uses Capacitor and GitHub Actions to package the Angular application as Android APK and AAB artifacts. The generated `android/` directory is intentionally not committed.

## Build files

| File                                  | Purpose                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `capacitor.config.ts`                 | Android application ID, name, Angular output directory and splash defaults                        |
| `.github/workflows/android-build.yml` | Lints, tests, builds, signs, verifies and publishes Android artifacts                             |
| `android-version.json`                | Android `versionCode` and `versionName`                                                           |
| `scripts/bump-android-version.js`     | Increments the Android release version                                                            |
| `scripts/patch-android.mjs`           | Adds call history, WhatsApp selection, app theme/system bars, branded splash and R8 configuration |
| `scripts/generate-keystore.mjs`       | Creates a PKCS12 release keystore                                                                 |
| `scripts/detect-keystore-format.mjs`  | Reports a keystore's internal format                                                              |
| `public/click2chat.png`               | Source for the app header, launcher, splash and Play Store icons                                  |

## Install the Capacitor packages

From WSL2, install the dependencies declared in `package.json` and update `package-lock.json`:

```bash
npm i @capacitor/android@^8.4.2 @capacitor/core@^8.4.2 && npm i -D @capacitor/cli@^8.4.2
```

Commit the updated `package-lock.json`; the GitHub workflow uses `npm ci` and therefore requires the lockfile to match `package.json`.

## Local workflow

```bash
npm run android:add
npm run android:sync
npm run android:open
```

`android:sync` builds Angular, synchronizes Capacitor, and reapplies the idempotent native patch. Run it after changing Angular code or `scripts/patch-android.mjs`.

The native project uses package ID `com.actionanand.click2chat.app`. Change it in `capacitor.config.ts` before publishing if a different Play Store identity is required.

## Versioning

```bash
npm run android:version
npm run android:version:patch
npm run android:version:minor
npm run android:version:major
```

The plain command increments only `versionCode`. The other commands increment `versionCode` and the selected part of `versionName`. Every Google Play upload needs a higher `versionCode`.

On the `main-android` branch, GitHub Actions automatically increments `versionCode`, commits it with `[skip ci]`, and uses the resulting version for the build. Tag builds use the checked-in version unchanged.

## CI triggers and release files

The workflow runs:

- Manually from GitHub Actions.
- On pushes to `main-android`.
- On tags matching `v*`.

Every successful run creates these files under `releases/`:

- `click2chat-<version>.apk` and `click2chat-<version>.aab` when signing succeeds.
- Clearly named `-unsigned.apk` and `-unsigned.aab` fallbacks when signing secrets are absent or invalid.
- `click2chat-<version>-mapping.txt` for R8 crash deobfuscation.
- `playstore-icon.png`, generated from `public/click2chat.png`.

The workflow verifies that the APK, AAB, mapping file and store icon are non-empty. It uploads them as a 30-day GitHub Actions artifact. Builds on `main-android` also commit them to that branch; tag builds create a GitHub Release.

CI uses minimum SDK 24, target SDK 36, Java 21 and Node 24.16. Release builds enable R8 optimization and resource shrinking.

## Signing secrets

Add these under **Repository Settings → Secrets and variables → Actions**:

| Secret              | Purpose                                                     |
| ------------------- | ----------------------------------------------------------- |
| `KEYSTORE_BASE64`   | Base64 text containing the complete keystore                |
| `KEYSTORE_PASSWORD` | Password used to open the keystore                          |
| `KEY_ALIAS`         | Signing-key alias; the included generator uses `click2chat` |
| `KEY_PASSWORD`      | Private-key password; for PKCS12 use the keystore password  |

Generate the keystore once on a trusted WSL/Linux machine:

```bash
npm run generate-keystore
test -s release-keystore.jks && base64 -w 0 release-keystore.jks > keystore.b64.txt
npm run keystore:type
```

provide the password non-interactively only in a trusted local shell:

```bash
npm run generate-keystore -- --password 'YOUR_STRONG_PASSWORD'
```

Never commit the keystore, its Base64 representation, or passwords. Keep an offline backup of the release key.

## Device call history

The Android build declares `READ_CALL_LOG`, requests it at runtime, and reads at most the 100 most recent entries after the user grants access. The data remains on the device and is not persisted by Click2Chat. The web build does not request or emulate call history.

To create a build without call-history permission:

```bash
ENABLE_DEVICE_CALL_LOG=false npm run android:sync
```

`READ_CALL_LOG` is a restricted permission in Google Play. Confirm that the intended distribution and store listing satisfy the current Google Play permission policy before submission. The direct-number WhatsApp feature remains usable when permission is denied or excluded.

## Calling from recent calls

Each recent-call row includes a phone button. Tapping it first displays an in-app confirmation with **Cancel** and **Call** actions. Call opens Android's phone dialler with the number prefilled; the user must review the number and tap the phone app's Call button to place the call.

The native bridge uses `Intent.ACTION_DIAL`. Click2Chat does not place a call automatically and does not request `android.permission.CALL_PHONE`.

Suggested review walkthrough:

1. Open Click2Chat and choose **Recent calls**.
2. Grant call-history access when Android asks.
3. Tap the phone icon beside a recent call.
4. Show that **Cancel** returns to Click2Chat without opening another app.
5. Tap the phone icon again, choose **Call**, and show the Android dialler with the number prefilled.
6. Return to Click2Chat and demonstrate that the WhatsApp action remains separate.

Record these steps in the video supplied with the Play permissions declaration. Keep the declaration, review instructions, screenshots, store listing, Data safety answers, and privacy policy consistent with the submitted build.

Opening the dialler does not by itself make Click2Chat Android's default Phone handler or create eligibility for Call Log access. Submit `READ_CALL_LOG` only if the app truthfully qualifies for one of Google Play's currently permitted use cases and the declaration names that use case accurately. If it does not qualify, create the Play build with call history disabled:

```bash
ENABLE_DEVICE_CALL_LOG=false npm run android:sync
```

Before uploading a replacement bundle, remove or deactivate rejected bundles on every active testing and production track that still contain the permission. A bundle without `READ_CALL_LOG` can retain direct-number WhatsApp chat and dialler functionality, but it cannot show the device's recent-call list.

## WhatsApp behavior and theme

- If both WhatsApp and WhatsApp Business are installed, Click2Chat shows the in-app chooser using `public/whatsapp.png` and `public/whatsapp-business.png`.
- If only one is installed, it opens directly.
- If neither native app resolves, Android opens the standard `wa.me` URL.
- Light, dark and system themes also update Android status/navigation bars through the native bridge.
