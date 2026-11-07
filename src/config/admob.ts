// Android AdMob IDs — single source for ads and the Android manifest sync hook.
export const ADMOB_CONFIG = {
  // TEST APK MODE: only Google's official demo ad units are requested.
  // For release, replace all three IDs below with your real IDs and set false.
  testMode: true,
  // App ID; copied into AndroidManifest.xml during Capacitor sync.
  // Your production app ID: ca-app-pub-2832761207597793~3278020475
  appId: 'ca-app-pub-3940256099942544~3347511713',
  // Google's official anchored adaptive banner test unit.
  // Your production banner ID: ca-app-pub-2832761207597793/4862564888
  bannerId: 'ca-app-pub-3940256099942544/9214589741',
  // Google's official interstitial test unit.
  // Your production interstitial ID: ca-app-pub-2832761207597793/8833599488
  interstitialId: 'ca-app-pub-3940256099942544/1033173712',
  puzzlesPerInterstitial: 3,
} as const;
