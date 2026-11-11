import { CSSProperties, forwardRef } from 'react';
import GameScreen from '@/components/GameScreen';
import { Save } from '@/lib/puzzle';
import { SCREENSHOT_COPY } from '@/lib/store-listing';
import '@/components/store-assets.css';

const StoreScreenshot = forwardRef<HTMLDivElement, { index: number; save: Save }>(({ index, save }, ref) => {
  const copy = SCREENSHOT_COPY[index];
  const style = { '--store-background': copy.background, '--store-ink': copy.ink, '--store-accent': copy.accent, '--store-decoration': copy.decoration } as CSSProperties;
  return <div ref={ref} style={style} className="store-capture relative flex h-[640px] w-[360px] shrink-0 flex-col overflow-hidden px-5 pt-5">
    <div className="store-orbit absolute -right-12 top-16 h-40 w-40 rounded-full" aria-hidden="true"/>
    <div className="store-orbit absolute -bottom-14 -left-14 h-48 w-48 rounded-full" aria-hidden="true"/>
    <header className="relative z-10 shrink-0">
      <p className="store-tag text-[9px] font-extrabold tracking-[1.5px]">{copy.tag}</p>
      <h2 className="mt-3 whitespace-pre-line text-[28px] font-black leading-[1.08] tracking-[-1px]">{copy.title}</h2>
      <p className="mt-3 max-w-[285px] text-[12px] font-semibold leading-[1.5]">{copy.subtitle}</p>
    </header>
    <div className="relative z-10 mx-auto mt-4 h-[418px] w-[266px] shrink-0 overflow-hidden rounded-[23px] border-[3px] border-white bg-[#f5f0ff] shadow-xl" inert>
      <div className="w-[360px] origin-top-left scale-[0.72]">
        <GameScreen save={save} disabled={false} undoAvailable={save.game.moves > 0} bump={0} onPlace={()=>{}} onLevels={()=>{}} onSettings={()=>{}} onHelp={()=>{}} onPause={()=>{}} onUndo={()=>{}} onRestart={()=>{}}/>
      </div>
    </div>
    <footer className="relative z-10 mt-auto flex items-center justify-center gap-2 pb-4 pt-3">
      <img src="/icon.svg" alt="" className="h-6 w-6 rounded-lg"/>
      <span className="text-[13px] font-black tracking-tight">Cubellio <span className="text-[10px] font-bold">· Block Puzzle</span></span>
    </footer>
  </div>;
});
StoreScreenshot.displayName = 'StoreScreenshot';
export default StoreScreenshot;
