# Download the Cubellio Android app

Two manually triggered GitHub workflows are included. They have not been executed by this chat; compiled artifacts appear only after a successful GitHub run.

## Test APK — no signing account setup

1. Sync this project to GitHub, including `.github` and `pnpm-lock.yaml`. The workflows must be on the default branch for Run workflow to appear.
2. Open **Actions → Build Android test APK → Run workflow**.
3. Wait for the run to succeed. Open it and download **Cubellio-test-ads** under **Artifacts**.
4. Extract the ZIP and install **Cubellio-test-ads.apk** on your Samsung phone.

The test workflow automatically changes only its isolated runner copy of the config to Google's official test app/banner/interstitial/rewarded IDs. Your repository remains configured with your real production IDs. The test build rejects real units after this swap. Rewarded test videos now grant an actual SDK-verified revive; the former demo revive is gone.

## Production version — Google Play / Galaxy Store

Use **Actions → Build Android store release → Run workflow** after configuring the four private signing secrets described in **STORE_RELEASE.md**. This produces **Cubellio-play-release.aab** and **Cubellio-galaxy-release.apk** under **Cubellio-store-release**. Do not use the debug test APK for store submission or use a debug key for a production update.

## Samsung installation

Android 7.0/API 24 or newer is required. If prompted to allow installation from your file manager/browser, enable only the trusted source you are using. Device/organization security policy may prevent sideloading.

A fresh debug build can have a different signing certificate from an older installation. If Android rejects an update due to signature mismatch, uninstall the old test app first; **uninstalling deletes saved progress**. Do not replace a published app's signing identity to work around an error.

## Ads and expected behavior

- Internet access and SDK/consent eligibility are needed for ad loading. Successful compilation does not guarantee ad fill.
- Bottom adaptive banner; interstitial only between each 3 completed puzzles.
- Optional game-over rewarded video, amount 1 / Puzzle revive, awarded only after the native earned-reward callback and dismissal.
- Cancelled/failed/unavailable ads grant no revive and never block a normal restart. No live ad runs in browser previews.
- Verify the SDK's Test Ad label when testing. Do not click your real ads.

If a workflow fails, open its red step and inspect the actual error. No usable APK is uploaded when compilation/signature checks fail. Artifacts expire after 14 days.

See `ANDROID_ADS.md` for SDK behavior and `STORE_RELEASE.md` for signing, privacy and store declarations.
