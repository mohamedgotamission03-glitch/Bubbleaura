import { useState } from 'react';
import { Copy, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAdDiagnostics, nativeAdsAvailable, runAdDiagnostics, type AdDiagnostics } from '@/lib/ads';
import { toast } from 'sonner';

function hints(report: AdDiagnostics): string[] {
  const text = `${report.banner} ${report.interstitial} ${report.rewarded}`;
  const out: string[] = [];
  if (report.initialization.startsWith('Ads blocked')) out.push('Consent is blocking ads. Accept the consent form or use Privacy choices to allow ads.');
  if (/code 3/.test(text)) out.push('Code 3 means no fill: AdMob has no ad to serve right now. This is normal for a new unit or an app still under AdMob review. Wait and test again.');
  if (/code 1\b/.test(text)) out.push('Code 1 means an invalid request: check the app ID and ad unit IDs in AdMob.');
  if (/code 2\b/.test(text)) out.push('Code 2 means a network error: check the internet connection.');
  if (/code 0\b/.test(text)) out.push('Code 0 means an internal AdMob error: try again later.');
  if (/timed out/i.test(text)) out.push('A request timed out: check the connection and try again.');
  if (!out.length && /Loaded/.test(report.interstitial) && /Loaded/.test(report.rewarded) && /loaded/i.test(report.banner)) out.push('All three ad types loaded. Ads are working.');
  return out;
}

function toText(report: AdDiagnostics) {
  return [
    `Mode: ${report.mode}`,
    `App ID: ${report.appId}`,
    `Banner unit: ${report.bannerId}`,
    `Interstitial unit: ${report.interstitialId}`,
    `Rewarded unit: ${report.rewardedId}`,
    `Initialization: ${report.initialization}`,
    `Consent: ${report.consent}`,
    `Banner: ${report.banner}`,
    `Interstitial: ${report.interstitial}`,
    `Rewarded: ${report.rewarded}`,
  ].join('\n');
}

export default function AdStatusNote() {
  const [report, setReport] = useState<AdDiagnostics | null>(null);
  const [busy, setBusy] = useState(false);
  if (!nativeAdsAvailable()) return <p className="offline-note" role="status">Ad diagnostics are available in the Android app.</p>;

  async function run() {
    setBusy(true);
    setReport(getAdDiagnostics());
    try { setReport(await runAdDiagnostics()); }
    finally { setBusy(false); }
  }
  async function copy() {
    if (!report) return;
    try { await navigator.clipboard.writeText(toText(report)); toast.success('Report copied.'); }
    catch { toast.info('Could not copy. Take a screenshot of the report instead.'); }
  }

  return <div className="ad-diagnostics">
    <Button variant="outline" className="secondary-button w-full" disabled={busy} onClick={run}><Stethoscope size={18} />{busy ? 'Testing ads… (about 5 seconds)' : 'Run ad diagnostics'}</Button>
    {report && <div className="offline-note" role="status">
      <pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-5">{toText(report)}</pre>
      {hints(report).map(line => <p key={line} className="mt-2 font-bold">{line}</p>)}
      <Button variant="ghost" className="mt-2 h-9 gap-1.5 px-2 text-xs font-bold" onClick={copy}><Copy size={14} /> Copy report</Button>
    </div>}
  </div>;
}
