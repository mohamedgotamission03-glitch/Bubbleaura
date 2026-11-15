import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const config = readFileSync('src/config/admob.ts', 'utf8');
if (!/\btestMode:\s*true\b/.test(config)) throw new Error('The test APK builder requires testMode: true. It will not build live ads.');
const ids = {};
for (const field of ['appId', 'bannerId', 'interstitialId', 'rewardedId']) {
  const id = config.match(new RegExp(`\\b${field}:\\s*'([^']+)'`))?.[1];
  if (!id || !/^ca-app-pub-3940256099942544[~/]\d+$/.test(id)) throw new Error(`The test APK builder requires an official Google demo ${field}.`);
  ids[field] = id;
}

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
if (!process.argv.includes('--config-only') && existsSync(manifestPath)) {
  let manifest = readFileSync(manifestPath, 'utf8');
  if (!manifest.includes(`android:value="${ids.appId}"`)) throw new Error('AdMob test app ID is missing from AndroidManifest.xml. The Android sync hook must complete first.');
  let foundMainActivity = false;
  manifest = manifest.replace(/<activity\b[^>]*>/g, activity => {
    if (!/android:name=["'](?:\.MainActivity|com\.cubellio4fun\.bubblorashooter\.MainActivity)["']/.test(activity)) return activity;
    foundMainActivity = true;
    if (/android:screenOrientation=["'][^"']*["']/.test(activity)) return activity.replace(/android:screenOrientation=["'][^"']*["']/, 'android:screenOrientation="portrait"');
    return activity.replace(/>$/, ' android:screenOrientation="portrait">');
  });
  if (!foundMainActivity) throw new Error('Could not find the generated Cubellio MainActivity.');
  writeFileSync(manifestPath, manifest);
}

console.log('Verified official AdMob demo IDs and test mode.');
