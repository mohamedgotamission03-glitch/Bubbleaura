import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { AdMob, AdmobConsentStatus, BannerAdPluginEvents, BannerAdPosition, BannerAdSize, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import { ADMOB_CONFIG } from '@/config/admob';

export type AdResult = { status: 'completed' | 'dismissed' | 'unavailable'; rewarded?: boolean };
declare global {
  interface Window {
    BlockBloomAds?: { showRewarded: (placement: 'revive') => Promise<AdResult> };
  }
}
export const nativeAdsAvailable = () => Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('AdMob');
export const rewardedAdsAvailable = () => Boolean(window.BlockBloomAds);
let initialization: Promise<boolean> | null = null;
let ready = false;
let loading = false;
let showing = false;
let allowed = false;
let bannerWanted = false;
let bannerCreated = false;
let bannerQueue = Promise.resolve();

function bounded<T>(promise: Promise<T>, milliseconds = 10000): Promise<T> {
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Ad request timed out')),milliseconds);
    promise.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});
  });
}
async function preloadInterstitial() {
  if(!allowed||loading||ready||showing)return;
  loading=true;
  try {await bounded(AdMob.prepareInterstitial({adId:ADMOB_CONFIG.interstitialId,isTesting:ADMOB_CONFIG.testMode}));ready=true;}
  catch {ready=false;}
  finally {loading=false;}
}
export function initializeAds(): Promise<boolean> {
  if(!nativeAdsAvailable())return Promise.resolve(false);
  if(initialization)return initialization;
  initialization=(async()=>{
    try {
      await bounded(AdMob.initialize({initializeForTesting:ADMOB_CONFIG.testMode}));
      let consent=await bounded(AdMob.requestConsentInfo());
      if(consent.status===AdmobConsentStatus.REQUIRED&&consent.isConsentFormAvailable)consent=await AdMob.showConsentForm();
      if(!consent.canRequestAds)return false;
      await AdMob.addListener(BannerAdPluginEvents.SizeChanged,size=>{
        if(size.height>0)document.documentElement.style.setProperty('--ad-banner-height',`${size.height}px`);
      });
      await AdMob.addListener(BannerAdPluginEvents.FailedToLoad,()=>{
        bannerCreated=false;
        void AdMob.removeBanner().catch(()=>{});
        document.documentElement.style.setProperty('--ad-banner-height','50px');
      });
      allowed=true;
      void preloadInterstitial();
      return true;
    } catch {return false;}
  })();
  return initialization;
}
export function setBannerVisible(visible: boolean): void {
  bannerWanted=visible;
  if(!nativeAdsAvailable())return;
  bannerQueue=bannerQueue.then(async()=>{
    if(!bannerWanted) {
      if(bannerCreated)await bounded(AdMob.hideBanner());
      return;
    }
    if(!await initializeAds()||!bannerWanted)return;
    if(bannerCreated){await bounded(AdMob.resumeBanner());return;}
    const slot=document.querySelector('.banner-slot')?.getBoundingClientRect();
    await bounded(AdMob.showBanner({
      adId:ADMOB_CONFIG.bannerId,
      adSize:BannerAdSize.ADAPTIVE_BANNER,
      position:BannerAdPosition.BOTTOM_CENTER,
      margin:slot?Math.max(0,Math.round(window.innerHeight-slot.bottom)):0,
      isTesting:ADMOB_CONFIG.testMode,
    }));
    bannerCreated=true;
    if(!bannerWanted)await bounded(AdMob.hideBanner());
  }).catch(()=>{bannerCreated=false;void AdMob.removeBanner().catch(()=>{});});
}
export async function showCompletionInterstitial(): Promise<AdResult> {
  // Only called by the between-puzzle transition. A late load cannot open an ad.
  if(!nativeAdsAvailable()||!allowed||!ready||showing){void preloadInterstitial();return {status:'unavailable'};}
  showing=true;ready=false;
  const handles: PluginListenerHandle[]=[];
  return new Promise<AdResult>(resolve=>{
    let settled=false;
    const finish=(status:AdResult['status'])=>{
      if(settled)return;
      settled=true;showing=false;
      handles.forEach(handle=>{void handle.remove();});
      resolve({status});
      void preloadInterstitial();
    };
    void (async()=>{
      try {
        handles.push(await AdMob.addListener(InterstitialAdPluginEvents.Dismissed,()=>finish('dismissed')));
        handles.push(await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow,()=>finish('unavailable')));
        handles.push(await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad,()=>finish('unavailable')));
        if(settled){handles.forEach(handle=>{void handle.remove();});return;}
        await AdMob.showInterstitial({adId:ADMOB_CONFIG.interstitialId});
        // The show Promise isn't dismissal; wait for the SDK close/failure event.
      } catch {finish('unavailable');}
    })();
  });
}
export async function requestRewardedAd(): Promise<AdResult> {
  if(!window.BlockBloomAds)return {status:'unavailable'};
  try {return await window.BlockBloomAds.showRewarded('revive');}
  catch {return {status:'unavailable'};}
}
