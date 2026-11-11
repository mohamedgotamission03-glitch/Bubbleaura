import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Download, ImageDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import StoreScreenshot from '@/components/StoreScreenshot';
import { createStoreScenes, FULL_DESCRIPTION, SCREENSHOT_COPY, SHORT_DESCRIPTION, STORE_TITLE } from '@/lib/store-listing';
import { toast } from 'sonner';

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function StoreAssets() {
  const scenes = useMemo(createStoreScenes, []);
  const captures = useRef<(HTMLDivElement | null)[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 2000);
    } catch { toast.info('Clipboard access is unavailable. Select the text below to copy it, or download the text file.'); }
  }
  async function exportScreenshot(index: number) {
    if (busy) return;
    const node = captures.current[index];
    if (!node) return;
    setBusy(`screen-${index}`);
    try {
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(node, { width: 360, height: 640, pixelRatio: 3, skipFonts: true, backgroundColor: SCREENSHOT_COPY[index].background, cacheBust: true });
      if (!blob) throw new Error('Image export returned no data.');
      download(blob, `Cubellio-screenshot-${index + 1}-1080x1920.png`);
      toast.success(`Screenshot ${index + 1} downloaded.`);
    } catch { toast.error('Could not export the screenshot. Try again in your browser outside the preview iframe.'); }
    finally { setBusy(null); }
  }
  async function exportIcon() {
    if (busy) return;
    setBusy('icon');
    let url: string | null = null;
    try {
      const response = await fetch('/icon.svg');
      if (!response.ok) throw new Error('Icon could not be loaded.');
      url = URL.createObjectURL(await response.blob());
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 512;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable.');
      // Store icons use a full square; stores apply their own corner mask.
      context.fillStyle = '#7c3aed';
      context.fillRect(0, 0, 512, 512);
      context.drawImage(image, 0, 0, 512, 512);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Icon export failed.')), 'image/png'));
      download(blob, 'Cubellio-icon-512.png');
      toast.success('512 × 512 icon downloaded.');
    } catch { toast.error('Could not export the icon. Try again in your browser.'); }
    finally { if (url) URL.revokeObjectURL(url); setBusy(null); }
  }

  return <div className="min-h-dvh bg-[#f5f0ff] px-4 py-6 text-[#4b2e71] sm:px-8 sm:py-10">
    <main className="mx-auto max-w-[1200px]">
      <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-purple-700 hover:bg-purple-100"><ArrowLeft size={17}/> Back to the game</Link>
      <header className="mt-5 flex flex-col gap-5 rounded-[28px] border border-purple-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-center gap-5"><img src="/icon.svg" alt="Cubellio app icon" className="h-20 w-20 rounded-3xl sm:h-24 sm:w-24"/><div><p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[2px] text-purple-600"><Sparkles size={14}/> Store launch kit</p><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Cubellio</h1><p className="mt-2 text-sm text-[#71558f]">A little puzzle. A lot of possibility.</p></div></div>
        <Button className="h-12 gap-2 rounded-2xl bg-purple-600 px-5 font-bold hover:bg-purple-700" disabled={Boolean(busy)} onClick={exportIcon}><Download size={18}/>{busy==='icon'?'Preparing icon…':'Download icon · 512 × 512'}</Button>
      </header>
      <section className="mt-9" aria-labelledby="screenshots-title">
        <div className="mb-5"><h2 id="screenshots-title" className="text-2xl font-black tracking-tight">Four moments worth a download</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#71558f]">Portrait promotional images, exported as 1080 × 1920 PNGs. These use the real web game interface with representative states and marketing captions, not native Android device captures. The browser ad placeholder is cropped out. Review each image before submitting.</p></div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {scenes.map((save, index) => <article key={index} className="rounded-[24px] border border-purple-100 bg-white p-4 shadow-sm">
            <div className="mx-auto h-[416px] w-[234px] overflow-hidden rounded-[18px] border border-purple-100"><div className="origin-top-left scale-[0.65]"><StoreScreenshot ref={node=>{captures.current[index]=node;}} index={index} save={save}/></div></div>
            <p className="mb-3 mt-4 text-center text-sm font-extrabold">{index+1}. {['Colorful gameplay', 'Line clearing', 'Level challenges', 'Relaxed play'][index]}</p>
            <Button className="h-11 w-full gap-2 rounded-xl bg-purple-100 text-purple-800 hover:bg-purple-200" disabled={Boolean(busy)} onClick={()=>exportScreenshot(index)}><ImageDown size={17}/>{busy===`screen-${index}`?'Exporting…':'Download PNG'}</Button>
          </article>)}
        </div>
      </section>
      <section className="mt-9 rounded-[28px] border border-purple-100 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="copy-title">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 id="copy-title" className="text-2xl font-black tracking-tight">Words that earn the next tap</h2><p className="mt-2 text-sm text-[#71558f]">Clear keywords, a playful voice, and only features the game actually has.</p></div><Button variant="outline" className="h-11 gap-2 rounded-xl border-purple-200 font-bold text-purple-700" onClick={()=>download(new Blob([`APP TITLE\n${STORE_TITLE}\n\nSHORT DESCRIPTION\n${SHORT_DESCRIPTION}\n\nFULL DESCRIPTION\n${FULL_DESCRIPTION}\n`], {type:'text/plain;charset=utf-8'}), 'Cubellio-store-description.txt')}><Download size={16}/> Download copy</Button></div>
        <div className="mt-7 space-y-6">
          {[{key:'title', label:'App title', text:STORE_TITLE, limit:30, rows:2},{key:'short', label:'Short description', text:SHORT_DESCRIPTION, limit:80, rows:3},{key:'full', label:'Full description', text:FULL_DESCRIPTION, limit:4000, rows:18}].map(item=><div key={item.key}><div className="mb-2 flex items-center justify-between gap-3"><label htmlFor={`copy-${item.key}`} className="text-sm font-extrabold">{item.label} <span className="ml-2 text-xs font-normal text-[#71558f]">{item.text.length}/{item.limit}</span></label><Button variant="ghost" className="h-11 gap-1.5 rounded-xl text-xs font-bold text-purple-700" onClick={()=>copy(item.text,item.key)}>{copied===item.key?<Check size={15}/>:<Copy size={15}/>} {copied===item.key?'Copied':'Copy'}</Button></div><Textarea id={`copy-${item.key}`} readOnly value={item.text} rows={item.rows} className="resize-y rounded-2xl border-purple-100 bg-[#faf7ff] p-4 text-sm leading-6 text-[#50326c] focus-visible:ring-purple-400"/></div>)}
        </div>
      </section>
      <p className="mx-auto mt-6 max-w-3xl pb-5 text-center text-xs leading-6 text-[#71558f]">These downloads are listing assets, not a guarantee of store approval or name availability. Native launcher icons already use this artwork. Rebuild the APK/AAB to include the latest game changes; use test ads for device validation.</p>
    </main>
  </div>;
}
