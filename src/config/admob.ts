// Android AdMob IDs — single source for ads and the Android manifest sync hook.
export const ADMOB_CONFIG = {
  // PRODUCTION MODE: these are your real IDs, not Google's demo IDs.
  // Do not click live ads for testing. Use official test IDs or registered test devices.
  testMode: false,
  // AdMob app: Puzzlev1. Keep only ca-app-pub-...; labels are not part of IDs.
  // Copied into the Android manifest by the Capacitor sync hook.
  appId: 'ca-app-pub-2832761207597793~3278020475',
  // Banner ad unit: bnrpuzzlev1. Replace here if this unit changes later.
  bannerId: 'ca-app-pub-2832761207597793/4862564888',
  // Interstitial ad unit: interpzlv1. Replace here if this unit changes later.
  interstitialId: 'ca-app-pub-2832761207597793/8833599488',
  puzzlesPerInterstitial: 3,
} as const;
