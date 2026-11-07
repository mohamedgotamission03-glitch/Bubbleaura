# BlockBloom: Android & Galaxy Store release guide

## What is implemented

This repository is the working React game, not a signed Android package. It has a responsive 8×8 board, drag/tap/keyboard placement, 12 score-and-line goal levels, device-local progress, sound/haptics, one-move undo, restart, and one revive per game. The web manifest is metadata, not an offline service worker or an APK.

Three ad placements are prepared:

- `bottom_banner`: an isolated 320×50 CSS-pixel slot below the controls. The native container should allocate an equivalent anchored adaptive banner area and never cover the board, navigation, or system safe areas. The HTML slot is a reservation, not an ad renderer. Do not stack HTML and native banner space or overlap the controls.
- `game_over`: an interstitial when the player chooses Try again after losing, never on startup or mid-move. The native-connected game has a minimum 90-second cooldown between requests. A failed/no-fill interstitial must still allow retry.
- `revive`: an explicitly opt-in rewarded ad after game over. After SDK-confirmed reward completion, clear the board, preserve score/line progress, refill the tray, and consume the game's single revive.

In the browser, ad demos are explicitly labeled. “Try demo revive” demonstrates the mechanic without claiming that an ad was watched. Production should use the native bridge and must not expose the demo reward as a live rewarded advertisement.

## Native wrapper needed

Package the built web assets into a maintained Android WebView wrapper (for example Capacitor), with a stable application ID, portrait orientation, local asset loading, safe-area support, and release signing. No wrapper, native dependencies, SDK keys, advertising credentials, consent SDK, APK/AAB, or store submission is configured in this repository.

Host bundled assets through a secure local origin, not arbitrary remote pages. Preserve Android WebView data across normal app restarts so on-device saves remain. Native back should first close the active ad or game dialog instead of silently leaving play. Test this behavior in the wrapper; the browser UI alone does not provide Android back interception.

## Ad adapter contract

The game calls the Promise-based adapter in `src/lib/ads.ts`. The trusted native bootstrap must expose:

```ts
window.BlockBloomAds = {
  setBannerVisible(visible: boolean): void,
  showInterstitial(placement: 'game_over'): Promise<{
    status: 'completed' | 'dismissed' | 'unavailable'
  }>,
  showRewarded(placement: 'revive'): Promise<{
    status: 'completed' | 'dismissed' | 'unavailable';
    rewarded?: boolean
  }>
};
```

This is an integration contract, not an installed SDK. A raw Android JavaScript interface is not Promise-based; implement the Promise wrapper with the selected native bridge's callback/plugin mechanism. Install it before React mounts.

- Initialize consent and the SDK before loading ads. Never let unavailable consent/network/SDK initialization block game startup.
- Load/preload native ads and use test IDs/test devices throughout development.
- Settle every Promise on ad close, load failure, show failure, cancellation, or activity destruction. The game intentionally does not grant a reward on unavailable/dismissed responses.
- Resolve the rewarded Promise after the ad closes, returning `status: 'completed', rewarded: true` only if that presentation received the SDK's earned-reward callback. Resolve dismissed without reward if it did not. Deduplicate callbacks per presentation.
- Pause app audio while a native full-screen ad is active. Show and hide the native banner in response to `setBannerVisible`; dialogs suppress it.
- Expose native methods only to the trusted bundled app origin. Disallow untrusted navigation, restrict WebView permissions, and do not accept arbitrary JavaScript reward messages from external pages.

## Choose one ad ownership strategy

Use either AdMob with Google Mobile Ads, or LevelPlay as the mediator with the desired networks/adapters (including AdMob if applicable). Do not initialize competing independent owners for the same placement. Put provider-specific code in the native wrapper; keep game rules independent of the provider. Add your Android app IDs, banner/interstitial/rewarded ad unit or placement IDs, and mediation network configuration in that wrapper and dashboards.

Follow current provider documentation for the Android SDK versions, manifests, adapters, consent APIs, ProGuard/R8 rules, and lifecycle callbacks. This document does not claim approval by either ad network.

## Galaxy Store checklist

Before release, verify the current Samsung Seller Portal submission rules and accepted binary format. Supply the signed Android release artifact, unique package ID, required icons/screenshots, descriptions, contact details, privacy policy URL, age/content rating, supported countries and devices. Confirm advertising/consent declarations, personal data disclosures, privacy requirements, and any target-audience or child-directed restrictions.

Test on physical Samsung phones with Samsung Internet/Android System WebView, including narrow Galaxy A screens and Galaxy S tall displays, display scaling, navigation gestures, safe insets, app background/resume, local save recovery, airplane mode/no-fill, consent acceptance/refusal, cancelled rewarded videos, completed rewards, interstitial dismissal, repeated taps, and Android back.

A manifest alone does not make this app Galaxy Store-ready. Signing, native SDK integration, real-device testing, compliant consent/privacy flows, and store review remain required.
