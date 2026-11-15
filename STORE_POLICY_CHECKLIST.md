# Bubble Aura: store policy checklist (Google Play, AdMob, Galaxy Store)

Status of the code and documents in this repository, and what you must still do in each console. Verify against the current policy pages before submitting; policies change.

## Legal pages (done in the repo, needs hosting)

- In-app: Settings → Privacy Policy / Terms of Use (routes `/privacy`, `/terms`), plus the AdMob **Privacy choices** button (UMP).
- Public static copies: `public/privacy.html` and `public/terms.html`. After you publish the web build, the Play Console privacy policy URL is `https://YOUR-DOMAIN/privacy.html` (must be a public, non-geo-blocked, non-PDF page that loads without login). Use the same URL in AdMob (app-ads/privacy) and the Galaxy Store.
- The policies name the developer (Cubellio4Fun) and point to the contact email on the store listings. Google expects a working contact in the listing; put a real support email in Play Console and Seller Portal. If you want the email printed inside the policy itself, send it and it will be added.
- Keep `app-ads.txt` hosted at the root of the developer website listed in the store listing (`public/app-ads.txt`).

## Google Play Console

- **App content → Privacy policy:** enter the public URL above.
- **Ads:** declare **Contains ads = Yes**.
- **Advertising ID declaration:** Yes. Purpose: **Advertising or marketing** (and Analytics if you enable it). The AdMob SDK merges the `AD_ID` permission.
- **Data safety form** (typical answers for this app; confirm with Google's current "AdMob data disclosure" guidance):
  - Data collected and shared: **Device or other IDs** (advertising ID), **App activity** (ad interactions), **App info and performance** (diagnostics/crash), and **approximate location** derived from IP by the ad SDK.
  - Purposes: **Advertising or marketing**, **Fraud prevention, security, and compliance**, **Analytics** (ad performance).
  - Shared with: Google (third-party ad SDK). Data is **encrypted in transit**.
  - No account; progress is local only. Deletion: no developer-held data; users can clear app data/uninstall and use Google's ad settings.
  - Optional: not collected for developer use.
- **Target audience and content:** choose adult/general audience (13+ or 18+). Do not select under-13 groups unless you complete the Families program requirements (not claimed here). Complete the **content rating (IARC)** questionnaire; the game has cartoon-style bubble shooting, no violence, gambling, or user-generated content.
- **Target API:** the release workflow targets Android API 36; confirm it meets the current minimum.
- **Store listing:** title, short and full description in `src/lib/store-listing.ts` describe the real game. The listing must not mention unrelated apps, keyword-stuff, or claim rewards that do not exist. **Use real screenshots of Bubble Aura gameplay** from the test build on a phone; the exported images from `/store-assets` still show the old block-puzzle layout and must not be uploaded.
- **Pre-launch:** new personal developer accounts must complete the required closed-testing period before production.

## AdMob

- Link the app to the Play/Galaxy listing when it is published, add `app-ads.txt` to the developer website, and complete payments/identity.
- Create the **UMP consent message** (GDPR + US states) in AdMob **Privacy & messaging**, and publish it. The app already calls UMP on each launch and exposes privacy options in Settings.
- Rewarded unit: standard rewarded, amount **1**, item **Bonus moves**.
- Never click your own ads; use the test APK workflow for device testing. Ads are never shown on a loading/splash screen or over game controls; interstitials only appear between levels.
- If you later set the app as child-directed or add child tagging, review AdMob and Families policies first.

## Samsung Galaxy Store (Seller Portal)

- Privacy policy URL: same as above. Complete the **age rating**, **ads/in-app advertising** disclosure, and **permissions** statements. Declare no in-app purchases.
- Check Samsung's current requirements for signing, 64-bit and screen support before upload.

## Not covered by code

- Trademark/name availability for "Bubble Aura".
- A published website for the policy URL and `app-ads.txt`.
- Final legal review: the pages are plain-language templates matching the app's behavior; they are not legal advice.
