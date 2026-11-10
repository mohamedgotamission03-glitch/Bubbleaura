import { readFileSync, writeFileSync } from 'node:fs';

const path='src/config/admob.ts';
const source=readFileSync(path,'utf8');
const marker='export const GOOGLE_TEST_AD_IDS =';
const markerIndex=source.indexOf(marker);
if(markerIndex<0)throw new Error('Google test ID configuration is missing.');
let active=source.slice(0,markerIndex);
const testIds=source.slice(markerIndex);
if(!/\btestMode:\s*(?:true|false)\b/.test(active))throw new Error('Missing testMode configuration.');
active=active.replace(/\btestMode:\s*(?:true|false)\b/,'testMode: true');
for(const field of ['appId','bannerId','interstitialId','rewardedId']) {
  const pattern=new RegExp(`\\b${field}:\\s*'([^']+)'`);
  const testId=testIds.match(pattern)?.[1];
  if(!testId||!/^ca-app-pub-3940256099942544[~/]\d+$/.test(testId)||!pattern.test(active))throw new Error(`Missing official Google test ${field}.`);
  active=active.replace(pattern,`${field}: '${testId}'`);
}
writeFileSync(path,active+testIds);
console.log('This isolated APK build uses Google demo ads, including rewarded.');
