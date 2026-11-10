# Cubellio: Google Play and Galaxy Store release

## Implemented in the app

- Production AdMob app, banner, interstitial and rewarded IDs in `src/config/admob.ts`.
- Bottom adaptive banner; interstitial only between puzzles after each 3 completions.
- Optional rewarded video at game over: one SDK-earned reward grants one revive, preserving score/line progress. The app waits for dismissal before resuming. Cancelled/failed/no-fill videos grant no revive. A normal restart remains available. No demo/free reward or external JavaScript reward bridge remains.
- Google UMP consent is checked on startup. Ads load only when permitted. Settings exposes the privacy-options form when UMP requires it. Revoked/failed consent prevents further ad requests.
- Separate test and production build workflows. Test builds automatically use Google demo IDs for all three formats; production source stays unchanged.
- Release preparation targets Android API 36, sets version code/name, locks phone play to portrait, and signs APK/AAB from private credentials.

## Signed build: account setup, not code editing

Use `.github/workflows/android-store-release.yml`, named **Build Android store release**.

A store update must use the correct existing signing identity. If this is an existing published app, use its upload/signing key and its registered package ID. The current package ID is `com.blockbloom.game`; do not change it after publishing. An AdMob app ID is not an Android package ID.

For a new app, create and securely back up a release/upload keystore using Android Studio's **Build → Generate Signed Bundle / APK** wizard. Keep the keystore and passwords private; do not paste them in chat or commit them to the repository. Google Play upload keys and Galaxy Store distribution signing can differ: do not assume APKs from the two stores can update each other automatically.

In your GitHub repository, open **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded contents of your keystore file, encoded with a trusted local tool |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias inside that keystore |
| `ANDROID_KEY_PASSWORD` | Password for that key |

Do not use an online public converter for private signing keys. The workflow fails early if credentials are missing. It decodes the key to the runner's private temporary directory, references passwords through environment variables, uploads only APK/AAB artifacts, and removes temporary signing material afterwards. It does not create or expose a new signing key on your behalf.

## Build and download

1. Sync this project to GitHub.
2. Open **Actions → Build Android store release → Run workflow**.
3. Enter a positive **version_code** (start at 1 for a new app; increase for every update) and **version_name** (for example 1.0.0).
4. After a successful run, download **Cubellio-store-release** under Artifacts and extract it.
5. Use **Cubellio-play-release.aab** for Google Play. It is signed with the supplied key; for Play App Signing, that key must be the appropriate upload key.
6. Use **Cubellio-galaxy-release.apk** for Galaxy Store, provided its certificate matches your Galaxy Store signing configuration. Samsung also offers AAB upload/signing options; confirm them in Seller Portal.

This environment has verified the web code/build, not executed the native release workflow or approved either store submission. The workflow verifies signatures and APK 16 KB ZIP alignment. That alignment check is not proof of ELF/native-library compatibility or actual 16 KB device behavior; test third-party SDKs and the app on an appropriate device/emulator before submission.

## Mandatory publisher steps before submission

These cannot be completed by changing code alone:

- Set up Google Play Console and Samsung Seller Portal publisher accounts and meet their current testing/review requirements.
- Configure the AdMob app and privacy messages in your own account. The provided rewarded unit must be a standard Rewarded unit with amount **1**, item **Puzzle revive**.
- Publish a truthful, accessible privacy policy URL identifying your app/developer and reflecting actual SDK behavior. No publisher URL/contact details were supplied, so this project does not invent them or claim that a hosted publisher policy is complete.
- Complete Google Play **Contains ads**, Data Safety, target audience and content-rating declarations based on the Mobile Ads/UMP SDKs, device-local saves and your actual deployment. An absence of an app account does not mean the advertising SDK collects no data.
- Complete Samsung advertising, privacy, permissions and rating declarations.
- If children are in the target audience, configure and verify the applicable child-directed/under-age consent flags, Families rules and ad restrictions before release. This app is not claimed to be Families-certified.
- Supply store listing icons/screenshots, support details and required languages. The sync hook applies the Cubellio name and original `public/icon.svg` artwork to legacy/adaptive Android launcher resources through `src/native/configure-branding.mjs`. Review launcher cropping on devices and export store-specific listing assets; a successful build is not a complete listing. Check name/trademark availability before publishing.
- Verify current API/signing/16 KB requirements in both store consoles, test physical Samsung devices, safe areas, background/resume, consent acceptance/refusal, rewarded cancellation/completion/no-fill and interstitial cadence.

For device testing, use **Build Android test APK**, not the production workflow, so you never click your own live ads. See `APK_DOWNLOAD.md`.
