import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { AdMob, AdmobConsentStatus, BannerAdPluginEvents, BannerAdPosition, BannerAdSize, InterstitialAdPluginEvents, RewardAdPluginEvents } from '@capacitor-community/admob';
import { ADMOB_CONFIG } from '@/config/admob';

export type AdResult = { status: 'completed' | 'dismissed' | 'unavailable'; rewarded?: boolean };
export const nativeAdsAvailable = () => Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('AdMob');
export const rewardedAdsAvailable = nativeAdsAvailable;
let initialization: Promise<boolean> | null = null;
let ready = false;
let loading = false;
let showing = false;
let allowed = false;
let consentGeneration = 0;
let rewardReady = false;
let rewardLoading: Promise<void> | null = null;
let rewardRequestActive = false;
let privacyRequired = false;
export const privacyOptionsRequired = () => privacyRequired;
let bannerWanted = false;
let bannerCreated = false;
let bannerQueue = Promise.resolve();
let bannerStatus = 'Banner not requested yet';
let bannerRetries = 0;
export const getBannerStatus = () => bannerStatus;

function bounded<T>(promise: Promise<T>, milliseconds = 10000): Promise<T> {
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Ad request timed out')),milliseconds);
    promise.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});
  });
}
async function preloadInterstitial() {
  if(!allowed||loading||ready||showing)return;
  loading=true;
  const generation=consentGeneration;
  try {
    await bounded(AdMob.prepareInterstitial({adId:ADMOB_CONFIG.interstitialId,isTesting:ADMOB_CONFIG.testMode}));
    ready=allowed&&generation===consentGeneration;
  }
  catch {ready=false;}
  finally {loading=false;}
}
export function initializeAds(): Promise<boolean> {
  if(!nativeAdsAvailable())return Promise.resolve(false);
  if(initialization)return initialization.then(()=>allowed);
  initialization=(async()=>{
    try {
      await bounded(AdMob.initialize({initializeForTesting:ADMOB_CONFIG.testMode}));
      let consent=await bounded(AdMob.requestConsentInfo());
      if(consent.status===AdmobConsentStatus.REQUIRED&&consent.isConsentFormAvailable)consent=await AdMob.showConsentForm();
      privacyRequired=consent.privacyOptionsRequirementStatus==='REQUIRED';
      await AdMob.addListener(BannerAdPluginEvents.SizeChanged,size=>{
        if(size.height>0)document.documentElement.style.setProperty('--ad-banner-height',`${size.height}px`);
      });
      await AdMob.addListener(BannerAdPluginEvents.Loaded,()=>{bannerStatus='Banner loaded';bannerRetries=0;});
      await AdMob.addListener(BannerAdPluginEvents.FailedToLoad,error=>{
        bannerCreated=false;
        bannerStatus=`Banner not loaded (code ${error.code}: ${error.message})`;
        void AdMob.removeBanner().catch(()=>{});
        document.documentElement.style.setProperty('--ad-banner-height','0px');
        // A banner with no fill is retried a few times instead of staying empty for the whole session.
        if(bannerRetries<6){bannerRetries++;setTimeout(()=>{if(bannerWanted)setBannerVisible(true);},Math.min(120000,15000*bannerRetries));}
      });
      if(!consent.canRequestAds)return false;
      allowed=true;
      void preloadInterstitial();
      void preloadRewarded();
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
    if(!await initializeAds()||!allowed||!bannerWanted)return;
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
async function preloadRewarded(): Promise<void> {
  if(!allowed||rewardReady||showing)return;
  if(rewardLoading)return rewardLoading;
  const generation=consentGeneration;
  rewardLoading=(async()=>{
    try {
      await bounded(AdMob.prepareRewardVideoAd({adId:ADMOB_CONFIG.rewardedId,isTesting:ADMOB_CONFIG.testMode}));
      rewardReady=allowed&&generation===consentGeneration;
    } catch {rewardReady=false;}
    finally {rewardLoading=null;}
  })();
  return rewardLoading;
}
export async function requestRewardedAd(): Promise<AdResult> {
  if(!nativeAdsAvailable()||showing||rewardRequestActive)return {status:'unavailable'};
  rewardRequestActive=true;
  try {
    if(!await initializeAds()||!allowed)return {status:'unavailable'};
    await preloadRewarded();
    if(!rewardReady||!allowed||showing)return {status:'unavailable'};
    showing=true;rewardReady=false;
    return await new Promise<AdResult>(resolve=>{
      const handles:PluginListenerHandle[]=[];
      let earned=false;
      let settled=false;
      const finish=(status:AdResult['status'])=>{
        if(settled)return;
        settled=true;showing=false;
        handles.forEach(handle=>{void handle.remove().catch(()=>{});});
        resolve({status,rewarded:status==='completed'&&earned});
        void preloadRewarded();
        void preloadInterstitial();
      };
      void (async()=>{
        try {
          handles.push(await AdMob.addListener(RewardAdPluginEvents.Rewarded,reward=>{
            if(!settled&&reward.amount>=ADMOB_CONFIG.rewardAmount)earned=true;
          }));
          handles.push(await AdMob.addListener(RewardAdPluginEvents.Dismissed,()=>finish(earned?'completed':'dismissed')));
          handles.push(await AdMob.addListener(RewardAdPluginEvents.FailedToShow,()=>finish('unavailable')));
          if(settled){handles.forEach(handle=>{void handle.remove().catch(()=>{});});return;}
          // Earned-reward callback verifies the reward; dismissal releases the game.
          // Never award for an impression, click, or simply opening the ad.
          void AdMob.showRewardVideoAd({adId:ADMOB_CONFIG.rewardedId}).catch(()=>{
            if(!earned)finish('unavailable');
          });
        } catch {finish('unavailable');}
      })();
    });
  } catch {return {status:'unavailable'};}
  finally {rewardRequestActive=false;}
}
export async function openAdPrivacyOptions(): Promise<boolean> {
  if(!nativeAdsAvailable()||showing||rewardRequestActive)return false;
  try {
    await initializeAds();
    if(!privacyRequired)return false;
    consentGeneration++;
    allowed=false;ready=false;rewardReady=false;
    await bounded(AdMob.removeBanner()).catch(()=>{});
    bannerCreated=false;
    await AdMob.showPrivacyOptionsForm();
    const consent=await bounded(AdMob.requestConsentInfo());
    privacyRequired=consent.privacyOptionsRequirementStatus==='REQUIRED';
    allowed=consent.canRequestAds;
    if(allowed){void preloadInterstitial();void preloadRewarded();}
    return true;
  } catch {allowed=false;return false;}
}
