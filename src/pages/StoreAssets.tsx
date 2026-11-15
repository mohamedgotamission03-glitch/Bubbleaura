import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Download, Film, ImageDown, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FULL_DESCRIPTION, SHORT_DESCRIPTION, STORE_TITLE } from '@/lib/store-listing';
import { FORMATS, PROMO_SECONDS, SLIDES, canvasToBlob, captureScene, composeFeatureGraphic, composeSlide, loadIcon, recordPromo, type FormatId } from '@/lib/store-media';
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
  const icon = useRef<HTMLImageElement | null>(null);
  const [scenes, setScenes] = useState<HTMLCanvasElement[]>([]);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [feature, setFeature] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const image = await loadIcon();
        icon.current = image;
        const captured: HTMLCanvasElement[] = [];
        for (let index = 0; index < SLIDES.length; index++) {
          const scene = await captureScene(SLIDES[index].scene);
          if (cancelled) return;
          captured.push(scene);
          setScenes([...captured]);
          const thumb = composeSlide(SLIDES[index], scene, image, 540, 960).toDataURL('image/jpeg', 0.86);
          setThumbs(prev => { const next = [...prev]; next[index] = thumb; return next; });
        }
        if (!cancelled) setFeature(composeFeatureGraphic(captured[1], image).toDataURL('image/jpeg', 0.9));
      } catch { if (!cancelled) toast.error('Could not render the game scenes. Open this page in a normal browser tab and keep it visible.'); }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 2000);
    } catch { toast.info('Clipboard access is unavailable. Select the text below to copy it, or download the text file.'); }
  }

  async function exportSlide(index: number, format: FormatId) {
    if (busy || !icon.current || !scenes[index]) return;
    setBusy(`${format}-${index}`);
    try {
      const { w, h } = FORMATS[format];
      const blob = await canvasToBlob(composeSlide(SLIDES[index], scenes[index], icon.current, w, h));
      download(blob, `Bubble-Aura-${format}-${index + 1}-${w}x${h}.png`);
      toast.success(`${FORMATS[format].label} screenshot ${index + 1} downloaded.`);
    } catch { toast.error('Could not export the screenshot. Try again.'); }
    finally { setBusy(null); }
  }

  async function exportAll(format: FormatId) {
    if (busy || scenes.length < SLIDES.length) return;
    for (let i = 0; i < SLIDES.length; i++) {
      await exportSlide(i, format);
      await new Promise(resolve => window.setTimeout(resolve, 350));
    }
  }

  async function exportFeature() {
    if (busy || !icon.current || scenes.length < 2) return;
    setBusy('feature');
    try {
      download(await canvasToBlob(composeFeatureGraphic(scenes[1], icon.current)), 'Bubble-Aura-feature-graphic-1024x500.png');
      toast.success('Feature graphic downloaded.');
    } catch { toast.error('Could not export the feature graphic.'); }
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
      context.fillStyle = '#4cb5e6';
      context.fillRect(0, 0, 512, 512);
      context.drawImage(image, 0, 0, 512, 512);
      download(await canvasToBlob(canvas), 'Bubble-Aura-icon-512.png');
      toast.success('512 × 512 icon downloaded.');
    } catch { toast.error('Could not export the icon. Try again in your browser.'); }
    finally { if (url) URL.revokeObjectURL(url); setBusy(null); }
  }

  async function makeVideo() {
    if (busy) return;
    setBusy('video'); setProgress(0);
    if (videoUrl) { URL.revokeObjectURL(videoUrl); setVideoUrl(null); }
    try {
      const blob = await recordPromo(setProgress);
      setVideoUrl(URL.createObjectURL(blob));
      toast.success('Promo video ready.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not record the video.'); }
    finally { setBusy(null); }
  }

  const rendering = scenes.length < SLIDES.length;

  return <div className="min-h-dvh bg-[#eef7fc] px-4 py-6 text-[#2c1d62] sm:px-8 sm:py-10">
    <main className="mx-auto max-w-[1200px]">
      <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-purple-700 hover:bg-purple-100"><ArrowLeft size={17}/> Back to the game</Link>
      <header className="mt-5 flex flex-col gap-5 rounded-[28px] border border-sky-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-center gap-5"><img src="/icon.svg" alt="Bubble Aura app icon" className="h-20 w-20 rounded-3xl sm:h-24 sm:w-24"/><div><p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[2px] text-purple-600"><Sparkles size={14}/> Store launch kit</p><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Bubble Aura</h1><p className="mt-2 text-sm text-[#5b4c8a]">Pop &amp; Match</p></div></div>
        <Button className="h-12 gap-2 rounded-2xl bg-purple-600 px-5 font-bold hover:bg-purple-700" disabled={Boolean(busy)} onClick={exportIcon}><Download size={18}/>{busy==='icon'?'Preparing icon…':'Download icon · 512 × 512'}</Button>
      </header>

      <section className="mt-9" aria-labelledby="screenshots-title">
        <div className="mb-5">
          <h2 id="screenshots-title" className="text-2xl font-black tracking-tight">Marketing screenshots</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5b4c8a]">Five captioned screenshots rendered from the real game in your browser. Pick a size per image, or download a whole set: phone (1080 × 1920), 7&quot; tablet (1200 × 1920) and 10&quot; tablet (1600 × 2560). Keep this tab visible while the scenes render.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.keys(FORMATS) as FormatId[]).map(format => <Button key={format} variant="outline" className="h-10 gap-2 rounded-xl border-purple-200 font-bold text-purple-700" disabled={Boolean(busy) || rendering} onClick={() => exportAll(format)}><ImageDown size={16}/> All five · {FORMATS[format].label}</Button>)}
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
          {SLIDES.map((slide, index) => <article key={slide.tag} className="rounded-[24px] border border-sky-100 bg-white p-3 shadow-sm">
            <div className="flex aspect-[9/16] items-center justify-center overflow-hidden rounded-[16px] bg-[#e4eefc]">
              {thumbs[index] ? <img src={thumbs[index]} alt={`${slide.title.join(' ')} screenshot`} className="h-full w-full object-cover"/> : <Loader2 className="animate-spin text-purple-500" size={28}/>}
            </div>
            <p className="mb-2 mt-3 text-center text-sm font-extrabold">{index + 1}. {slide.tag}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(FORMATS) as FormatId[]).map(format => <Button key={format} variant="ghost" className="h-10 rounded-lg bg-purple-50 px-1 text-[11px] font-bold text-purple-800 hover:bg-purple-100" disabled={Boolean(busy) || !scenes[index]} onClick={() => exportSlide(index, format)}>{busy === `${format}-${index}` ? '…' : FORMATS[format].label}</Button>)}
            </div>
          </article>)}
        </div>
      </section>

      <section className="mt-9 rounded-[28px] border border-sky-100 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="feature-title">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 id="feature-title" className="text-2xl font-black tracking-tight">Feature graphic · 1024 × 500</h2><p className="mt-2 text-sm text-[#5b4c8a]">Required by Google Play for your store listing header.</p></div><Button className="h-11 gap-2 rounded-xl bg-purple-600 font-bold hover:bg-purple-700" disabled={Boolean(busy) || scenes.length < 2} onClick={exportFeature}><Download size={16}/> Download PNG</Button></div>
        <div className="mt-5 flex aspect-[1024/500] max-w-[640px] items-center justify-center overflow-hidden rounded-2xl bg-[#e4eefc]">{feature ? <img src={feature} alt="Feature graphic preview" className="h-full w-full object-cover"/> : <Loader2 className="animate-spin text-purple-500" size={28}/>}</div>
      </section>

      <section className="mt-9 rounded-[28px] border border-sky-100 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="video-title">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 id="video-title" className="text-2xl font-black tracking-tight">Promo video · about {Math.round(PROMO_SECONDS)} seconds</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#5b4c8a]">A 1080 × 1920 portrait trailer recorded live from the real game: title card, four gameplay scenes with captions and a closing card. Google Play takes videos as a YouTube link, so upload the file to YouTube (public or unlisted, not age-restricted, ads off) and paste the link. It has no sound; add music you own the rights to in YouTube Studio or a video editor.</p></div><Button className="h-11 gap-2 rounded-xl bg-pink-600 font-bold hover:bg-pink-700" disabled={Boolean(busy)} onClick={makeVideo}>{busy === 'video' ? <Loader2 className="animate-spin" size={16}/> : <Film size={16}/>}{busy === 'video' ? `Recording ${Math.round(progress * 100)}%` : 'Record promo video'}</Button></div>
        {busy === 'video' && <p className="mt-4 text-sm font-bold text-pink-700">Recording… keep this tab open and visible until it reaches 100%.</p>}
        {videoUrl && <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start"><video src={videoUrl} controls playsInline className="max-h-[520px] rounded-2xl bg-black"/><Button className="h-11 gap-2 rounded-xl bg-purple-600 font-bold hover:bg-purple-700" onClick={async () => { const blob = await (await fetch(videoUrl)).blob(); download(blob, 'Bubble-Aura-promo.webm'); }}><Download size={16}/> Download .webm</Button></div>}
      </section>

      <section className="mt-9 rounded-[28px] border border-sky-100 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="copy-title">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 id="copy-title" className="text-2xl font-black tracking-tight">Store listing text</h2><p className="mt-2 text-sm text-[#5b4c8a]">Clear keywords and only features the game actually has.</p></div><Button variant="outline" className="h-11 gap-2 rounded-xl border-purple-200 font-bold text-purple-700" onClick={()=>download(new Blob([`APP TITLE\n${STORE_TITLE}\n\nSHORT DESCRIPTION\n${SHORT_DESCRIPTION}\n\nFULL DESCRIPTION\n${FULL_DESCRIPTION}\n`], {type:'text/plain;charset=utf-8'}), 'Bubble-Aura-store-description.txt')}><Download size={16}/> Download copy</Button></div>
        <div className="mt-7 space-y-6">
          {[{key:'title', label:'App title', text:STORE_TITLE, limit:30, rows:2},{key:'short', label:'Short description', text:SHORT_DESCRIPTION, limit:80, rows:3},{key:'full', label:'Full description', text:FULL_DESCRIPTION, limit:4000, rows:18}].map(item=><div key={item.key}><div className="mb-2 flex items-center justify-between gap-3"><label htmlFor={`copy-${item.key}`} className="text-sm font-extrabold">{item.label} <span className="ml-2 text-xs font-normal text-[#5b4c8a]">{item.text.length}/{item.limit}</span></label><Button variant="ghost" className="h-11 gap-1.5 rounded-xl text-xs font-bold text-purple-700" onClick={()=>copy(item.text,item.key)}>{copied===item.key?<Check size={15}/>:<Copy size={15}/>} {copied===item.key?'Copied':'Copy'}</Button></div><Textarea id={`copy-${item.key}`} readOnly value={item.text} rows={item.rows} className="resize-y rounded-2xl border-sky-100 bg-[#f6fbff] p-4 text-sm leading-6 text-[#2c1d62] focus-visible:ring-purple-400"/></div>)}
        </div>
      </section>
      <p className="mx-auto mt-6 max-w-3xl pb-5 text-center text-xs leading-6 text-[#5b4c8a]">These images and the video are rendered from the web version of the game with marketing captions, not native Android device captures. Review each file before submitting. Stores may also require real device screenshots; take those from the test APK if asked.</p>
    </main>
  </div>;
}
