# Get the BlockBloom Android test app

The project includes an automated Android APK build in `.github/workflows/android-test-apk.yml`. This workflow has been prepared, not executed in this environment. No compiled APK is attached yet.

## Build and download — no shell commands

1. Put this project in your GitHub repository, including the hidden `.github` directory and `pnpm-lock.yaml`. The workflow must be on the repository's default branch for its manual Run workflow button to appear.
2. Open the repository's **Actions** tab. Enable workflows if GitHub asks.
3. Select **Build Android test APK**.
4. Click **Run workflow**, choose the branch containing this project, then confirm **Run workflow**.
5. Wait for the run to finish successfully. The first Android build can take several minutes. An unsuccessful run produces no usable APK; open the failed step to inspect its error.
6. Open the successful run. Under **Artifacts**, download **BlockBloom-test-ads** while signed into GitHub.
7. Extract the downloaded ZIP to get **BlockBloom-test-ads.apk**. Transfer it to your Samsung phone and open it to install.

The build uses GitHub-hosted Android/Java tools. It does not require a signing secret, advertising credentials, or a local Android SDK. GitHub Actions availability and usage limits depend on your account/repository.

## Install on Samsung

The APK requires Android 7.0 / API 24 or newer. If Android asks for permission to install an app from your file manager/browser, allow only the trusted source you are using. Device or organization security policies may prevent sideloading.

Each clean workflow run generates a debug-signed APK. If an older installation of `com.blockbloom.game` has a different signature, Android may reject the update. Uninstall the old test app before reinstalling in that case; **uninstalling removes its saved progress**.

This is a debug build for device testing, not a signed Galaxy Store release.

## Test ads included

- `src/config/admob.ts` has `testMode: true` and Google's official sample app, anchored adaptive banner, and interstitial IDs.
- Your real IDs are preserved in comments for a later release. The test build refuses production mode or non-Google-demo publisher IDs.
- The native sync hook injects the test AdMob app ID into AndroidManifest.xml. The test preparation script also locks the main activity to portrait.
- A native adaptive test banner is requested at the bottom. Dialogs hide the banner; native ad size is reserved so it does not cover the game.
- A ready test interstitial is requested after completing each group of **3 puzzles**, only when leaving the win screen for another puzzle. Both level goals must be completed; clearing one line is not a completed puzzle.
- No interstitial during play, startup, pause, losing, or retry. No-fill, missing readiness, network/consent failures skip ads and do not block the game.
- Internet access is needed for ad loading. Google controls ad availability; SDK/consent/network errors may still prevent an ad from appearing, even in a successful APK build.
- Browser previews cannot show these native SDK test ads.

Verify the SDK's Test Ad label on device. Rewarded ads are not configured; the existing rewarded revive remains explicitly a demo.

See `ANDROID_ADS.md` for privacy/consent, device verification, and release requirements.
