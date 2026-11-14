import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAdDiagnostics, initializeAds, nativeAdsAvailable, openAdPrivacyOptions, privacyOptionsRequired, subscribeAdDiagnostics } from '@/lib/ads';
import { toast } from 'sonner';

export default function AdPrivacyControls() {
  const [required,setRequired]=useState(false);
  const [busy,setBusy]=useState(false);
  const [diagnostics,setDiagnostics]=useState(getAdDiagnostics);
  useEffect(()=>{
    let active=true;
    const unsubscribe=subscribeAdDiagnostics(value=>{if(active)setDiagnostics(value);});
    if(nativeAdsAvailable())void initializeAds().then(()=>{if(active)setRequired(privacyOptionsRequired());});
    return ()=>{active=false;unsubscribe();};
  },[]);
  async function openOptions() {
    setBusy(true);
    try {
      const updated=await openAdPrivacyOptions();
      setRequired(privacyOptionsRequired());
      if(!updated)toast.info('Privacy choices could not be opened. Please try again.');
    } finally {setBusy(false);}
  }
  return <div className="space-y-3">
    {required&&<Button variant="outline" className="secondary-button w-full" disabled={busy} onClick={openOptions}><ShieldCheck size={18}/>{busy?'Opening privacy choices…':'Privacy choices'}</Button>}
    <details className="ad-diagnostics">
      <summary>Ad diagnostics</summary>
      <div className="ad-diagnostics-grid">{Object.entries(diagnostics).map(([key,value])=><div className="ad-diagnostic-row" key={key}><span>{key.replace(/[A-Z]/g,letter=>` ${letter.toLowerCase()}`)}</span><strong>{String(value)}</strong></div>)}</div>
      <p>Wait a few seconds after opening the game, then screenshot this section. It includes public ad IDs and technical status only.</p>
    </details>
  </div>;
}
