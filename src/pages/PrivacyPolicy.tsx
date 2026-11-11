import { Link } from 'react-router-dom';
import LegalDocument from '@/components/LegalDocument';

export default function PrivacyPolicy() {
  return <LegalDocument title="Privacy Policy" updated="11 November 2026">
    <p>This policy explains how Cubellio, published by cubellio4fun, handles information when you play the Android game Cubellio (package name <strong>com.cubellio4fun.blockpuzzle</strong>). Cubellio does not ask you to create an account.</p>
    <h2>Information stored on your device</h2>
    <p>The game saves your progress, unlocked levels, best score, and sound and vibration preferences locally on your device. That information stays on the device. Uninstalling the app or clearing its storage deletes it. Cubellio does not upload that saved game progress to a developer server.</p>
    <h2>Advertising and consent</h2>
    <p>Cubellio uses Google AdMob and Google’s User Messaging Platform. These services may process device and advertising information, such as an advertising identifier, IP address, and device details, to request ads, measure them, and show a consent or privacy-options form where required. The current game screen does not display a banner, but an interstitial ad may appear between completed puzzles, and you may choose to watch a rewarded video after a game ends. A rewarded video grants one revive only when the ad service confirms the reward. Ads need an internet connection and may be unavailable.</p>
    <p>Google’s handling of advertising information is described in the <a href="https://policies.google.com/privacy" rel="noopener noreferrer">Google Privacy Policy</a>. You can change eligible ad privacy choices from Cubellio’s settings when the consent tool requires that option.</p>
    <h2>What this app does not do</h2>
    <ul>
      <li>It does not require a Cubellio account, and it does not ask for your name, email, or precise location.</li>
      <li>The developer does not sell your personal information.</li>
      <li>The game is a general-audience puzzle and is not directed to children under 13. It is not claimed to be a Google Play Families app.</li>
    </ul>
    <h2>Security and retention</h2>
    <p>Local progress is protected by your device. Advertising requests are handled by Google’s services. Local game data remains until you clear it or remove the app. Advertising data is retained according to Google’s own policies.</p>
    <h2>Your choices</h2>
    <p>You can turn sound effects and vibration off in the game. You can refuse or withdraw available ad consent through the privacy choices shown by the consent tool. You can also limit ad personalization in your device settings. Some of those choices may reduce ad availability, but the puzzle can still be restarted normally.</p>
    <h2>Contact</h2>
    <p>For privacy questions, use the support email published on the Cubellio Google Play listing. No separate developer email, postal address, or company registration number has been supplied for this page, so none is invented here. See also the <Link to="/terms">Terms of Use</Link>.</p>
    <h2>Changes</h2>
    <p>If this policy changes, the updated date above will change and the new version will be published at this page.</p>
  </LegalDocument>;
}
