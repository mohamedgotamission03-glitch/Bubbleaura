import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { initializeAds, nativeAdsAvailable, openAdPrivacyOptions, privacyOptionsRequired } from '@/lib/ads';
import { toast } from 'sonner';

export default function AdPrivacyControls() {
  const [required,setRequired]=useState(false);
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    let active=true;
    if(nativeAdsAvailable())void initializeAds().then(()=>{if(active)setRequired(privacyOptionsRequired());});
    return ()=>{active=false;};
  },[]);
  if(!required)return null;
  async function openOptions() {
    setBusy(true);
    try {
      const updated=await openAdPrivacyOptions();
      setRequired(privacyOptionsRequired());
      if(!updated)toast.info('Privacy choices could not be opened. Please try again.');
    } finally {setBusy(false);}
  }
  return <Button variant="outline" className="secondary-button w-full" disabled={busy} onClick={openOptions}><ShieldCheck size={18}/>{busy?'Opening privacy choices…':'Ad privacy choices'}</Button>;
}
