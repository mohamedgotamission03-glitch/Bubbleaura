// Android AdMob IDs — ONE place to change them before release.
export const ADMOB_CONFIG = {
  // Keep true while testing. Set false only after replacing the IDs below.
  testMode: true,
  // REAL ADMOB APP ID GOES HERE (contains ~, not /).
  // The Android manifest must use this app ID too; see ANDROID_ADS.md.
  appId: 'ca-app-pub-3940256099942544~3347511713',
  // REAL ANDROID BANNER AD UNIT ID GOES HERE.
  // Google's official anchored adaptive banner test ID:
  bannerId: 'ca-app-pub-3940256099942544/9214589741',
  // REAL ANDROID INTERSTITIAL AD UNIT ID GOES HERE.
  interstitialId: 'ca-app-pub-3940256099942544/1033173712',
  puzzlesPerInterstitial: 3,
} as const;
