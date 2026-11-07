export type AdResult = { status: 'completed' | 'dismissed' | 'unavailable'; rewarded?: boolean };
declare global {
  interface Window {
    BlockBloomAds?: {
      showInterstitial: (placement: 'game_over') => Promise<AdResult>;
      showRewarded: (placement: 'revive') => Promise<AdResult>;
      setBannerVisible: (visible: boolean) => void;
    };
  }
}
export const nativeAdsAvailable = () => Boolean(window.BlockBloomAds);
export async function requestAd(type: 'interstitial' | 'rewarded'): Promise<AdResult> {
  if (!window.BlockBloomAds) return {status:'unavailable'};
  try {
    return await (type === 'rewarded' ? window.BlockBloomAds.showRewarded('revive') : window.BlockBloomAds.showInterstitial('game_over'));
  } catch {
    return {status:'unavailable'};
  }
}
