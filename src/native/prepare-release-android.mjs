import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const config=readFileSync('src/config/admob.ts','utf8').split('export const GOOGLE_TEST_AD_IDS =')[0];
if(!/\btestMode:\s*false\b/.test(config))throw new Error('Store release requires production ad configuration.');
for(const field of ['appId','bannerId','interstitialId','rewardedId']) {
  const id=config.match(new RegExp(`\\b${field}:\\s*'([^']+)'`))?.[1];
  if(!id||!/^ca-app-pub-\d+[~/]\d+$/.test(id)||id.startsWith('ca-app-pub-3940256099942544'))throw new Error(`Store release requires a real ${field}.`);
}
const versionCode=Number(process.env.ANDROID_VERSION_CODE);
const versionName=process.env.ANDROID_VERSION_NAME;
if(!Number.isInteger(versionCode)||versionCode<1||versionCode>2100000000)throw new Error('Version code must be a positive Android version integer.');
if(!versionName||!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,40}$/.test(versionName))throw new Error('Use a valid version name such as 1.0.0.');
for(const name of ['ANDROID_KEYSTORE_PATH','ANDROID_KEYSTORE_PASSWORD','ANDROID_KEY_ALIAS','ANDROID_KEY_PASSWORD']) {
  if(!process.env[name])throw new Error(`Missing release signing configuration: ${name}`);
}
if(!existsSync(process.env.ANDROID_KEYSTORE_PATH))throw new Error('Release keystore file was not decoded.');
const manifestPath='android/app/src/main/AndroidManifest.xml';
let manifest=readFileSync(manifestPath,'utf8');
const appId=config.match(/\bappId:\s*'([^']+)'/)[1];
if(!manifest.includes(`android:value="${appId}"`))throw new Error('Production AdMob app ID is missing from the native manifest.');
let foundActivity=false;
manifest=manifest.replace(/<activity\b[^>]*>/g,activity=>{
  if(!/android:name=["'](?:\.MainActivity|com\.cubellio4fun\.blockpuzzle\.MainActivity)["']/.test(activity))return activity;
  foundActivity=true;
  return /android:screenOrientation=["'][^"']*["']/.test(activity)
    ?activity.replace(/android:screenOrientation=["'][^"']*["']/,'android:screenOrientation="portrait"')
    :activity.replace(/>$/,' android:screenOrientation="portrait">');
});
if(!foundActivity)throw new Error('Generated Android MainActivity is missing.');
writeFileSync(manifestPath,manifest);

// Secret values remain in environment variables, never in generated source/artifacts.
writeFileSync('android/app/blockbloom-release.gradle',`android {
    compileSdkVersion 36
    defaultConfig {
        targetSdkVersion 36
        versionCode ${versionCode}
        versionName '${versionName}'
    }
    signingConfigs {
        blockbloomRelease {
            storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            keyAlias System.getenv('ANDROID_KEY_ALIAS')
            keyPassword System.getenv('ANDROID_KEY_PASSWORD')
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.blockbloomRelease
        }
    }
}
`);
const gradlePath='android/app/build.gradle';
const gradle=readFileSync(gradlePath,'utf8');
const apply="apply from: 'blockbloom-release.gradle'";
if(!gradle.includes(apply))writeFileSync(gradlePath,`${gradle}\n${apply}\n`);
console.log('Prepared API 36 production release with environment-based signing.');
