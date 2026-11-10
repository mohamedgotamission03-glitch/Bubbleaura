import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { configureNativeBranding } from './configure-branding.mjs';

if (process.env.CAPACITOR_PLATFORM_NAME === 'android') {
  configureNativeBranding();
  const manifestPath = 'android/app/src/main/AndroidManifest.xml';
  if (!existsSync(manifestPath)) throw new Error('Generate the Capacitor Android project before syncing AdMob.');
  const config = readFileSync('src/config/admob.ts', 'utf8');
  const appId = config.match(/\bappId:\s*'([^']+)'/)?.[1];
  if (!appId || !/^ca-app-pub-\d+~\d+$/.test(appId)) throw new Error('Invalid AdMob appId in src/config/admob.ts');
  let manifest = readFileSync(manifestPath, 'utf8');
  const metadata = `<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="${appId}" />`;
  const existing = /<meta-data\b[^>]*android:name=["']com\.google\.android\.gms\.ads\.APPLICATION_ID["'][^>]*(?:\/>|>\s*<\/meta-data>)/;
  manifest = existing.test(manifest)
    ? manifest.replace(existing, metadata)
    : manifest.replace('</application>', `    ${metadata}\n    </application>`);
  if (!manifest.includes(metadata)) throw new Error('Could not configure AdMob inside the Android application manifest.');
  writeFileSync(manifestPath, manifest);
}
