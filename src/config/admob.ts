// Single source for AdMob IDs, including the native manifest sync hook.
export const ADMOB_CONFIG = {
  // Production IDs. Test APK workflow swaps these to GOOGLE_TEST_AD_IDS below.
  testMode: false,
  appId: 'ca-app-pub-2832761207597793~3278020475',
  bannerId: 'ca-app-pub-2832761207597793/4862564888',
  interstitialId: 'ca-app-pub-2832761207597793/8833599488',
  rewardedId: 'ca-app-pub-2832761207597793/6453978619',
  puzzlesPerInterstitial: 3,
  rewardAmount: 1,
  rewardItem: 'Puzzle revive',
} as const;

// Official Google Android demo units; used only in the isolated test APK build.
export const GOOGLE_TEST_AD_IDS = {
  appId: 'ca-app-pub-3940256099942544~3347511713',
  bannerId: 'ca-app-pub-3940256099942544/9214589741',
  interstitialId: 'ca-app-pub-3940256099942544/1033173712',
  rewardedId: 'ca-app-pub-3940256099942544/5224354917',
} as const;
