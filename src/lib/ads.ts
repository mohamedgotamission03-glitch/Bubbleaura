import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { AdMob, AdmobConsentStatus, BannerAdPluginEvents, BannerAdPosition, BannerAdSize, InterstitialAdPluginEvents, RewardAdPluginEvents } from '@capacitor-community/admob';
import { ADMOB_CONFIG } from '@/config/admob';

export type AdResult = { status: 'completed' | 'dismissed' | 'unavailable'; rewarded?: boolean };
export type AdDiagnostics = { platform: string; pluginAvailable: boolean; appId: string; bannerId: string; testMode: boolean; initialization: string; consent: string; banner: string; lastError: string; updatedAt: string };
const diagnosticListeners = new Set<(diagnostics: AdDiagnostics) => void>();
const diagnostics: AdDiagnostics = { platform: Capacitor.getPlatform(), pluginAvailable: Capacitor.isPluginAvailable('AdMob'), appId: ADMOB_CONFIG.appId, bannerId: ADMOB_CONFIG.bannerId, testMode: ADMOB_CONFIG.testMode, initialization: 'Not started', consent: 'Not checked', banner: 'Not requested', lastError: 'None', updatedAt: '—' };
function updateDiagnostics(patch: Partial<AdDiagnostics>) {
  Object.assign(diagnostics, patch, { updatedAt: new Date().toLocaleTimeString() });
  diagnosticListeners.forEach(listener => listener({ ...diagnostics }));
}
export function getAdDiagnostics(): AdDiagnostics { return { ...diagnostics }; }
export function subscribeAdDiagnostics(listener: (diagnostics: AdDiagnostics) => void) {
  diagnosticListeners.add(listener);
  return () => diagnosticListeners.delete(listener);
}
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : String(error);
}
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
  if(!nativeAdsAvailable()) {
    updateDiagnostics({ initialization: 'Unavailable on this platform', consent: 'Not applicable' });
    return Promise.resolve(false);
  }
  if(initialization)return initialization.then(()=>allowed);
  updateDiagnostics({ initialization: 'Initializing', lastError: 'None' });
  initialization=(async()=>{
    try {
      await bounded(AdMob.initialize({initializeForTesting:ADMOB_CONFIG.testMode}));
      updateDiagnostics({ initialization: 'Initialized' });
      let consent=await bounded(AdMob.requestConsentInfo());
      if(consent.status===AdmobConsentStatus.REQUIRED&&consent.isConsentFormAvailable)consent=await AdMob.showConsentForm();
      privacyRequired=consent.privacyOptionsRequirementStatus==='REQUIRED';
      updateDiagnostics({ consent: `${consent.canRequestAds ? 'Requests allowed' : 'Requests not allowed'}; status ${consent.status}; privacy options ${privacyRequired ? 'required' : 'not required'}` });
      await AdMob.addListener(BannerAdPluginEvents.SizeChanged,size=>{
        if(size.height>0){
          document.documentElement.style.setProperty('--ad-banner-height',`${size.height}px`);
          updateDiagnostics({ banner: `Loaded; height ${size.height}px` });
        }
      });
      await AdMob.addListener(BannerAdPluginEvents.FailedToLoad,error=>{
        bannerCreated=false;
        updateDiagnostics({ banner: 'Load failed', lastError: `Banner ${error.code}: ${error.message}` });
        void AdMob.removeBanner().catch(()=>{});
        document.documentElement.style.setProperty('--ad-banner-height','50px');
      });
      if(!consent.canRequestAds) {
        updateDiagnostics({ initialization: 'Initialized; ad requests blocked by consent' });
        return false;
      }
      allowed=true;
      updateDiagnostics({ initialization: 'Ready to request ads' });
      void preloadInterstitial();
      void preloadRewarded();
      return true;
    } catch (error) {
      updateDiagnostics({ initialization: 'Initialization failed', lastError: errorMessage(error) });
      return false;
    }
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
    if(bannerCreated){await bounded(AdMob.resumeBanner());updateDiagnostics({ banner: 'Resumed' });return;}
    updateDiagnostics({ banner: 'Requesting banner' });
    const slot=document.querySelector('.banner-slot')?.getBoundingClientRect();
    await bounded(AdMob.showBanner({
      adId:ADMOB_CONFIG.bannerId,
      adSize:BannerAdSize.ADAPTIVE_BANNER,
      position:BannerAdPosition.BOTTOM_CENTER,
      margin:slot?Math.max(0,Math.round(window.innerHeight-slot.bottom)):0,
      isTesting:ADMOB_CONFIG.testMode,
    }));
    bannerCreated=true;
    updateDiagnostics({ banner: 'Request submitted; waiting for load result' });
    if(!bannerWanted)await bounded(AdMob.hideBanner());
  }).catch(error=>{
    bannerCreated=false;
    updateDiagnostics({ banner: 'Request failed', lastError: errorMessage(error) });
    void AdMob.removeBanner().catch(()=>{});
  });
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
