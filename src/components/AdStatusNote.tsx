import { useEffect, useState } from 'react';
import { getBannerStatus, nativeAdsAvailable } from '@/lib/ads';

export default function AdStatusNote() {
  const [status, setStatus] = useState(getBannerStatus);
  useEffect(() => {
    const timer = window.setInterval(() => setStatus(getBannerStatus()), 1500);
    return () => window.clearInterval(timer);
  }, []);
  if (!nativeAdsAvailable()) return null;
  return <p className="offline-note" role="status">Ads status: {status}</p>;
}
