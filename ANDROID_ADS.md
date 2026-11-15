# Cubellio — production AdMob integration

## Configuration

All runtime and official test IDs are in `src/config/admob.ts`. Production is active (`testMode: false`):

- App: `ca-app-pub-2832761207597793~1236454728`
- Banner: `ca-app-pub-2832761207597793/1511961908`
- Interstitial: `ca-app-pub-2832761207597793/1754349531`
- Standard rewarded: `ca-app-pub-2832761207597793/5661804951`
- Reward: amount **1**, item **Bonus moves**.

Capacitor 8 and `@capacitor-community/admob` 8.2.1 are installed. SDK integration calls the installed native plugin directly; there is no external rewarded bridge to implement or code to paste into the app.

## Placement and rewards

- A bottom-center adaptive banner is requested during play. The app reserves its native height and hides it behind dialogs. Failure/no-fill does not block play.
- A preloaded interstitial is requested on leaving each 3rd completed puzzle, before another board starts. Replays count once per run. Skipped ads are consumed for that milestone, never shown late during play. No interstitial on losing or retry.
- The game-over button explicitly offers **Watch video · 1 revive**. SDK earned-reward events are checked for amount at least 1. The reward is returned to game logic only after the ad dismisses; one revive is applied at most once per puzzle. Opening/clicking an ad is not a reward.
- Cancelled, unavailable, failed-load or failed-show videos do not grant a revive. Normal restart is always an alternative; it is only temporarily disabled while an ad is actually being opened/shown.
- The old browser demo reward has been removed. Browser previews disable the rewarded button rather than pretending an ad was watched.

## Consent and privacy

The app updates UMP consent information on launch and shows a form when required. Ad requests need `canRequestAds`. Settings exposes **Ad privacy choices** when UMP requires an entry point. Changes re-check consent, discard old ready ads, and stop requests if consent no longer permits them. Network/SDK/consent errors skip ads without blocking normal puzzles.

Publisher AdMob privacy messages, a hosted privacy policy, target audience/child-directed configuration, and store Data Safety declarations must still be configured truthfully by the publisher. This code does not guarantee ad fill, compliance certification or store approval.

## Native builds

Native Google ads do not run in a website or Dyad's iframe. The GitHub Android workflows generate a Capacitor Android project, sync bundled Vite assets, insert the correct AdMob app ID through the sync hook, and compile on an Android-capable runner. No server or remote WebView page is required.

- **Build Android test APK** automatically swaps the isolated runner config to the Google test IDs, including rewarded. It does not change production config in the repository. See `APK_DOWNLOAD.md`.
- **Build Android store release** keeps the real IDs and builds signed API 36 APK/AAB artifacts using private GitHub signing secrets. See `STORE_RELEASE.md`.

The store workflow checks APK signature and 16 KB ZIP alignment, but real-device testing and any native ELF alignment checks remain necessary. Web type checking/builds are not native APK compilation or SDK runtime testing.

## Verify on device using test ads

1. Banner is at the bottom, labeled Test Ad by the SDK, and does not cover controls/system navigation.
2. No interstitial after puzzles 1 and 2. After puzzle 3, continue to another puzzle: only a ready interstitial opens. Repeat at 6 and 9.
3. Lose, choose the optional rewarded video, complete it, then close it: one revive clears the board and preserves score/lines. A second revive for that run is not offered.
4. Cancel the video or simulate no-fill/network failure: no reward, normal restart still works.
5. Repeated taps do not create multiple videos or rewards. Dismissed/reopened win screens do not duplicate puzzle counts.
6. Test UMP consent and privacy choices, background/resume, narrow Galaxy A devices, Galaxy S gesture navigation, scaling, Android back and 16 KB-compatible environments.

Never click live ads for testing. Official test IDs or registered test devices are required during development.

References: https://github.com/capacitor-community/admob (installed v8.2.1), https://developers.google.com/admob/android/test-ads, https://developers.google.com/admob/android/privacy.
