import { Link } from 'react-router-dom';
import LegalDocument from '@/components/LegalDocument';

export default function TermsOfUse() {
  return <LegalDocument title="Terms of Use" updated="11 November 2026">
    <p>These terms are an agreement between you and cubellio4fun for your use of Cubellio, the block-puzzle game published under the Android package name <strong>com.cubellio4fun.blockpuzzle</strong>. By installing or playing Cubellio, you agree to these terms. If you do not agree, do not use the game.</p>
    <h2>The game</h2>
    <p>Cubellio lets you place blocks, clear lines, and play its included levels. You do not need an account. Progress and preferences are stored on your device and may be lost if the app is removed, storage is cleared, or the device cannot save data.</p>
    <h2>License</h2>
    <p>cubellio4fun grants you a personal, non-exclusive, non-transferable license to use Cubellio for your own entertainment. You may not copy, resell, reverse engineer, or redistribute the game except where applicable law allows it. The Cubellio name, original graphics, and game content remain the property of their owner.</p>
    <h2>Advertising and optional rewards</h2>
    <p>The game may show advertising through Google AdMob. An interstitial may appear between completed puzzles. A rewarded video is optional and, when the ad service confirms it, can grant one revive for that run. Ads and rewards are not guaranteed. You can always restart without watching a video. Advertising is also described in the <Link to="/privacy">Privacy Policy</Link>.</p>
    <h2>Acceptable use</h2>
    <p>Do not misuse the game, interfere with its ads or rewards, attempt to access it without authorization, or use it in a way that breaks the law or another person’s rights.</p>
    <h2>Availability and changes</h2>
    <p>The game and these pages may change, pause, or stop. A store update may be required to receive changes. These terms will show a new updated date when they change.</p>
    <h2>Disclaimers and liability</h2>
    <p>Cubellio is provided as available. cubellio4fun does not promise uninterrupted play, ad availability, or that saved progress will always remain. Nothing in these terms limits rights that consumer law does not allow to be limited. Where permitted by law, cubellio4fun is not liable for indirect or consequential loss arising from use of the game. Mandatory consumer protections in your country still apply.</p>
    <h2>Contact</h2>
    <p>Use the support email published on the Cubellio Google Play listing for questions about these terms. No postal address or company registration number is stated here because none was supplied.</p>
  </LegalDocument>;
}
