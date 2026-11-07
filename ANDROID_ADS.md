# BlockBloom — Android AdMob setup

## Implemented

- Installed Capacitor 8 core, Android runtime/CLI, and `@capacitor-community/admob` 8.2.1.
- `capacitor.config.ts` packages the Vite `dist` assets as `com.blockbloom.game`.
- **All AdMob IDs are in `src/config/admob.ts`.** The configured real Android IDs are:
  - App (Puzzlev1): `ca-app-pub-2832761207597793~3278020475`
  - Banner (bnrpuzzlev1): `ca-app-pub-2832761207597793/4862564888`
  - Interstitial (interpzlv1): `ca-app-pub-2832761207597793/8833599488`
- `testMode` is **false**: native requests use real ad units. Never click these live ads for testing. Display names are not part of the IDs.
- The native bottom-center adaptive banner uses the reserved bottom space, with dynamic height reservation from the SDK's SizeChanged event. It is hidden while dialogs are open. Banner failure/no-fill never blocks play.
- Interstitials are preloaded and requested at the transition away from the **3rd, 6th, 9th, … completed puzzle**, before starting the next puzzle. Completing a puzzle means meeting both level goals, not clearing one line or placing one block. Replays count; each completed run is counted once. The count and consumed ad milestone persist with game saves.
- No interstitial on game over, retry, startup, pause, or mid-move. An ad that isn't ready is skipped for that milestone; it cannot show later during gameplay. A shown ad must close before the next puzzle starts.
- Initial SDK/consent/preload errors and load timeouts skip ads. There is no fabricated interstitial in the browser. The old game-over demo interstitial has been removed.

## Native Android project still needed

This environment previews a Vite website. Google's Mobile Ads SDK renders **native Android views**, not browser iframe ads. Installation of the npm plugin alone does not produce an Android app, and the web build is not an APK.

The Capacitor Android project has not been generated or compiled in this environment. Use an Android/Capacitor build environment to generate the Android project, sync the built web assets and installed plugins, then open/build the project in Android Studio and run it on an emulator or physical Samsung device. Android SDK/JDK/Gradle and release signing are required. Do not replace the preview with a remote URL; package the local built assets.

The npm `capacitor:sync:after` hook runs `src/native/configure-admob.mjs` for Android and inserts/updates Google Mobile Ads APPLICATION_ID metadata in `android/app/src/main/AndroidManifest.xml` from the single config file. The native SDK requires this metadata before startup; confirm it exists after syncing. The script is idempotent. Capacitor's generated Android project and AdMob plugin supply their native dependencies; do not install a second competing SDK owner.

## Before release and device testing

Your real IDs are configured with `testMode: false`. Sync the Android project before rebuilding so the manifest receives the real app ID. Native project generation and compilation are still required; configuring real IDs does not enable browser ads or guarantee AdMob approval or ad fill.

For development, temporarily use Google's official demo IDs in the config (app `ca-app-pub-3940256099942544~3347511713`, banner `ca-app-pub-3940256099942544/9214589741`, interstitial `ca-app-pub-3940256099942544/1033173712`) with `testMode: true`, or register test devices in AdMob. Never click real ads to test the integration. Restore your real IDs and production mode only for the release build.

The adapter updates Google UMP consent info on launch and displays the form when required, loading ads only when `canRequestAds` allows it. Before production, configure privacy messages in your AdMob account, supply a privacy policy, set appropriate target-audience/child-directed restrictions, and add a privacy-options entry point if required for your configured regions. Consent failure disables ads but not the game. No production consent configuration or store approval is claimed here.

Rewarded ads were not included in this request. The existing revive remains clearly labeled as a demo unless a separate trusted native rewarded adapter is connected. Do not present demo revives as earned AdMob rewards.

## Device verification checklist

Use demo IDs or designated test devices for this checklist, not live ad clicks.

1. Confirm the native test banner appears at the bottom with the SDK's Test Ad label and does not cover controls or Android navigation insets.
2. Complete puzzles 1 and 2: no interstitial. Continue after completing puzzle 3: a ready test interstitial appears before the next board starts. Repeat for 6 and 9, including replayed levels.
3. Dismiss/reopen the win dialog or restart the app on a completed board: no duplicate completion or duplicate ad request.
4. Lose/retry/pause/make moves: no interstitial.
5. Use airplane mode, no-fill, SDK failures, and consent failure: banner may be absent, but puzzles remain playable and level transitions proceed.
6. Close an interstitial: the next puzzle starts once. Rapid double taps must not create two ads or two new games.
7. Check Galaxy A and Galaxy S screen widths, large display scaling, navigation gestures, rotation/lifecycle transitions, and background/resume. The browser cannot validate native view placement or SDK callbacks.

## Galaxy Store release

Before submission, create and sign the Android release artifact, verify Samsung's current accepted binary/target API requirements, and provide store icons, screenshots, rating, advertising/privacy disclosures, support details, and privacy policy. Physical-device ad testing, consent setup, signing and Seller Portal submission remain outside this web build.

References: https://developers.google.com/admob/android/test-ads and https://github.com/capacitor-community/admob (installed v8.2.1); https://capacitorjs.com/docs/cli/hooks.
