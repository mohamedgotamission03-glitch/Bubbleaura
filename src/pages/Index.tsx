import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronRight, CircleHelp, Crown, Flag, Heart, Layers3, LockKeyhole, Map, Maximize2, Pause, Play, RotateCcw, Settings2, ShieldCheck, Sparkles, Star, Target, Trophy, Undo2, Volume2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import PuzzleBoard from '@/components/PuzzleBoard';
import { canPlay, Game, goal, newGame, place, readSave, revive, won } from '@/lib/puzzle';
import { nativeAdsAvailable, requestAd } from '@/lib/ads';
import { toast } from 'sonner';

type Modal = 'levels'|'settings'|'help'|'pause'|'restart'|'win'|'over'|'ad'|'reward'|null;
function BloomLogo() {
  return <span className="bloom-logo" aria-hidden="true"><i/><i/><i/><i/></span>;
}
const Index = () => {
  const [save,setSave] = useState(readSave);
  const game=save.game;
  const [modal,setModal] = useState<Modal>(null);
  const [undo,setUndo] = useState<Game|null>(null);
  const [busy,setBusy] = useState(false);
  const [bump,setBump] = useState(0);
  const [storageWarning,setStorageWarning] = useState(false);
  const audio = useRef<AudioContext|null>(null);
  const lastAd = useRef(0);
  const currentGoal=goal(game.level);
  const progress=Math.min(100,Math.round(Math.min(game.score/currentGoal.score,game.lines/currentGoal.lines)*100));
  useEffect(()=>{
    try {localStorage.setItem('blockbloom-v1',JSON.stringify(save));} catch {setStorageWarning(true);}
  },[save]);
  useEffect(()=>{
    if(won(game)) {
      setSave(prev=>({...prev,unlocked:Math.min(12,Math.max(prev.unlocked,game.level+1)),completed:Array.from(new Set([...prev.completed,game.level]))}));
      setModal('win');
    } else if(!canPlay(game)) setModal('over');
  },[game]);
  useEffect(()=>{
    try {window.BlockBloomAds?.setBannerVisible(!modal);} catch { /* A banner failure must not interrupt play. */ }
    return ()=>{try{window.BlockBloomAds?.setBannerVisible(false);}catch{ /* Native view may be detached. */ }};
  },[modal]);
  function feedback(clear:boolean) {
    if(save.haptics&&navigator.vibrate)navigator.vibrate(clear ? [20,30,20] : 12);
    if(save.sound) {
      try {
        if(!audio.current)audio.current=new AudioContext();
        void audio.current.resume();
        const oscillator=audio.current.createOscillator();const gain=audio.current.createGain();
        oscillator.type='sine';oscillator.frequency.setValueAtTime(clear?740:420,audio.current.currentTime);
        gain.gain.setValueAtTime(0.055,audio.current.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,audio.current.currentTime+0.15);
        oscillator.connect(gain);gain.connect(audio.current.destination);oscillator.start();oscillator.stop(audio.current.currentTime+0.16);
      } catch { /* Play continues when the browser disallows audio. */ }
    }
  }
  function onPlace(index:number,row:number,col:number) {
    if(modal||busy)return;
    const next=place(game,index,row,col);if(!next)return;
    setUndo(game);setSave(prev=>({...prev,game:next,best:Math.max(prev.best,next.score)}));
    feedback(next.lines>game.lines);setBump(n=>n+1);
    if(next.lines>game.lines)toast.success(`${next.lines-game.lines>1?'Beautiful combo!':'Nice bloom!'} +${next.score-game.score} points`,{duration:1700});
  }
  function startLevel(level:number) {
    setSave(prev=>({...prev,game:newGame(level)}));setUndo(null);setModal(null);
  }
  async function retry() {
    if(busy)return;
    if(!nativeAdsAvailable()){setModal('ad');return;}
    setBusy(true);
    if(Date.now()-lastAd.current>90000){await requestAd('interstitial');lastAd.current=Date.now();}
    setBusy(false);startLevel(game.level);
  }
  async function reward() {
    if(!nativeAdsAvailable()){setModal('reward');return;}
    setBusy(true);const result=await requestAd('rewarded');setBusy(false);
    if(result.status==='completed'&&result.rewarded===true)applyRevive();
    else toast.info(result.status==='unavailable'?'No ad available right now. Try again later.':'Ad not completed. No reward was used.');
  }
  function applyRevive(){setSave(prev=>({...prev,game:revive(prev.game)}));setUndo(null);setModal(null);}
  const titles: Record<Exclude<Modal,null>,string>={levels:'Your blooming journey',settings:'Make yourself at home',help:'Small blocks. Big possibilities.',pause:'Take a little breather',restart:'A fresh start?',win:'You made it bloom!',over:'Out of room, not out of chances',ad:'Interstitial placement preview',reward:'A second chance to bloom'};
  const descriptions: Record<Exclude<Modal,null>,string>={levels:'One little challenge at a time. Complete both goals to unlock the next level.',settings:'Your preferences and progress stay on this device.',help:'No timer. No rush. Just find your flow.',pause:'Your board is right where you left it.',restart:'Your current board will be cleared. Unlocked levels and best score stay saved.',win:'Both goals complete. Your next challenge is ready.',over:'There is no space for your remaining blocks.',ad:'Preview only — no live advertisement is being shown.',reward:nativeAdsAvailable()?'Watch a video to clear the board and keep your score.':'Demo only — live rewarded ads require the Android SDK.'};
  return <div className="app-shell min-h-screen">
    <header className="mx-auto flex h-[88px] max-w-[1280px] items-center justify-between px-5 sm:px-8 lg:px-12">
      <a href="/" className="flex items-center gap-3" aria-label="BlockBloom home"><BloomLogo/><span className="brand-text">block<span>bloom</span><span className="ml-1 inline-block text-purple-500">.</span></span></a>
      <nav className="hidden items-center gap-1 sm:flex" aria-label="Main navigation"><Button variant="ghost" className="nav-button nav-active" onClick={()=>setModal(null)}><Play size={15} fill="currentColor"/> Let's play</Button><Button variant="ghost" className="nav-button" onClick={()=>setModal('levels')}><Map size={17}/> Levels</Button><Button variant="ghost" className="nav-button" onClick={()=>setModal('help')}><CircleHelp size={17}/> How to play</Button></nav>
      <Button variant="ghost" size="icon" className="soft-icon" aria-label="Open settings" onClick={()=>setModal('settings')}><Settings2 size={20}/></Button>
    </header>
    <main className="mx-auto grid max-w-[1280px] grid-cols-1 gap-7 px-4 pb-8 sm:px-8 lg:grid-cols-[1fr_420px_1fr] lg:gap-8 lg:px-12 xl:grid-cols-[1fr_440px_1fr]">
      <aside className="hidden flex-col pt-14 lg:flex">
        <span className="pill w-fit"><span className="h-1.5 w-1.5 rounded-full bg-purple-500"/> YOUR DAILY DOSE OF PLAY</span>
        <h1 className="hero-title mt-6">A little focus.<br/>A lot of <span>fun.</span></h1>
        <p className="mt-5 max-w-[260px] text-[15px] leading-7 text-muted-foreground">Make space. Find your rhythm.<br/>Turn a few little blocks into<br/>something brilliant.</p>
        <div className="hero-art relative -ml-4 mt-6"><img src="/assets/block-buddies.png" alt="A smiling purple block with colorful puzzle friends and golden stars" className="w-full max-w-[310px] rounded-[40px] mix-blend-multiply"/><span className="art-tag"><Sparkles size={13}/> Good vibes, great moves</span></div>
        <div className="mt-7 flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-teal-600"><ShieldCheck size={20}/></span><div><p className="text-xs font-bold">A little escape, just for you</p><p className="mt-1 text-[11px] text-muted-foreground">No timers. Play at your own pace.</p></div></div>
      </aside>
      <section className="game-card mx-auto w-full max-w-[440px]" aria-label="BlockBloom game">
        <div className="flex items-center justify-between"><button className="level-badge" onClick={()=>setModal('levels')}><Flag size={14} fill="currentColor"/> LEVEL {game.level}<ChevronRight size={13}/></button><div className="flex gap-1.5"><Button variant="ghost" size="icon" className="game-icon" aria-label="How to play" onClick={()=>setModal('help')}><CircleHelp size={17}/></Button><Button variant="ghost" size="icon" className="game-icon" aria-label="Pause game" onClick={()=>setModal('pause')}><Pause size={17} fill="currentColor"/></Button></div></div>
        <div className="mb-5 mt-5 flex items-center justify-between px-1"><div><p className="eyebrow">CURRENT SCORE</p><div key={bump} className={`score-number ${bump ? 'score-pop' : ''}`} aria-live="polite">{game.score.toLocaleString()}<Sparkles size={22} className="mb-1 ml-2 inline text-[#e7b638]"/></div></div><div className="text-right"><span className="flex items-center justify-end gap-1.5 text-[11px] font-semibold text-[#8e7caa]"><Crown size={14} className="text-[#ce9a26]"/> PERSONAL BEST</span><p className="mt-1 text-xl font-extrabold text-[#69547f]">{save.best.toLocaleString()}</p></div></div>
        <div className="goal-strip mb-5"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-purple-600"><Target size={18}/></div><div className="min-w-0 flex-1"><div className="mb-2 flex justify-between text-[11px] font-bold"><span>Let's reach {currentGoal.score.toLocaleString()} points</span><span className="text-purple-600">{progress}%</span></div><div className="progress-track"><div className="progress-fill" style={{width:`${progress}%`}}/></div></div></div>
        <PuzzleBoard board={game.board} pieces={game.pieces} onPlace={onPlace} disabled={Boolean(modal)||busy}/>
        <div className="mt-5 flex items-center justify-between border-t border-[#f0ebf5] pt-4"><Button variant="ghost" className="tool-button" disabled={!undo||busy} onClick={()=>{if(undo){setSave(prev=>({...prev,game:undo}));setUndo(null);}}}><Undo2 size={15}/> Undo</Button><span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8b7b9d]"><Zap size={13} className="text-[#d3a130]"/>{game.moves} moves made</span><Button variant="ghost" className="tool-button" onClick={()=>setModal('restart')}><RotateCcw size={14}/> Restart</Button></div>
        <div className="banner-slot mt-5" aria-label="Reserved bottom banner advertisement space"><span className="ad-label">AD</span>{!nativeAdsAvailable()&&<span>Banner space <span className="mx-1 text-[#cec4db]">·</span> 320 × 50</span>}</div>
      </section>
      <aside className="mx-auto flex w-full max-w-[440px] flex-col gap-5 lg:max-w-none lg:pt-6">
        <div className="side-card"><div className="flex items-center justify-between"><h2 className="text-sm font-extrabold">A little goal, a big win</h2><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff7df] text-[#bd891a]"><Trophy size={17}/></span></div><p className="mt-2 text-xs leading-5 text-muted-foreground">Your mission for level {game.level}</p><div className="goal-item mt-5"><span className="goal-icon bg-[#f1e9ff] text-purple-600"><Star size={17}/></span><div className="flex-1"><p>Score {currentGoal.score.toLocaleString()} points</p><span>{Math.min(game.score,currentGoal.score).toLocaleString()} / {currentGoal.score.toLocaleString()} points</span></div>{game.score>=currentGoal.score?<Check size={17} className="text-teal-600"/>:<div className="goal-dot"/>}</div><div className="goal-item mt-4"><span className="goal-icon bg-[#e5f7f2] text-teal-600"><Layers3 size={17}/></span><div className="flex-1"><p>Clear {currentGoal.lines} lines</p><span>{Math.min(game.lines,currentGoal.lines)} / {currentGoal.lines} lines cleared</span></div>{game.lines>=currentGoal.lines?<Check size={17} className="text-teal-600"/>:<div className="goal-dot"/>}</div><div className="mt-5 rounded-xl bg-[#faf7fe] px-3 py-2.5 text-[11px] font-medium leading-5 text-[#8b729f]">Complete both to unlock the next level <span className="text-purple-600">✦</span></div></div>
        <div className="side-card"><div className="flex items-center justify-between"><h2 className="text-sm font-extrabold">Keep on blooming</h2><button className="text-[11px] font-bold text-purple-600 hover:underline" onClick={()=>setModal('levels')}>View all <span aria-hidden="true">→</span></button></div><div className="mt-5 flex justify-between gap-2">{Array.from({length:4},(_,i)=>{const level=Math.max(1,Math.min(game.level-1,9))+i;return <button key={level} onClick={()=>{if(level<=save.unlocked&&level!==game.level){if(game.moves>0){setModal('levels');}else startLevel(level);}}} disabled={level>save.unlocked} aria-label={`Level ${level}${level>save.unlocked?', locked':''}`} className={`mini-level ${level===game.level?'mini-level-active':''} ${save.completed.includes(level)?'mini-level-done':''}`}><span>{level>save.unlocked?<LockKeyhole size={15}/>:save.completed.includes(level)?<Check size={18}/>:level}</span><span className="text-[8px]">{level===game.level?'PLAYING':save.completed.includes(level)?'DONE':level>save.unlocked?'LOCKED':'READY'}</span></button>;})}</div><p className="mt-4 text-center text-[11px] text-muted-foreground">{save.completed.length} of 12 levels completed</p></div>
        <div className="tip-card"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fbe9bd] text-[#a77816]"><Sparkles size={19}/></span><div><h3 className="text-xs font-extrabold text-[#805b28]">A blooming good tip</h3><p className="mt-2 text-xs leading-[1.8] text-[#927347]">Leave room for the bigger blocks. A little planning goes a long way!</p></div></div>
        <button className="mx-auto flex items-center gap-2 text-[11px] font-semibold text-[#8b7b9d] lg:mt-1" onClick={()=>setModal('help')}><CircleHelp size={14}/> New here? Here's how to play <ArrowRight size={13}/></button>
      </aside>
    </main>
    <footer className="mx-auto flex max-w-[1184px] flex-wrap items-center justify-between gap-3 border-t border-[#e9e0f2] px-5 py-5 text-[10px] font-medium text-[#8e7f9d]"><span>© {new Date().getFullYear()} BlockBloom <span className="mx-2">·</span> Little blocks. Happy moments.</span><span className="flex items-center gap-1.5">Made for a little me-time <Heart size={11} className="text-pink-400"/></span></footer>
    {storageWarning&&<p className="pb-3 text-center text-xs text-amber-700">Device storage is unavailable. Progress will last only for this session.</p>}
    <Dialog open={Boolean(modal)} onOpenChange={open=>{if(!open&&!busy){if(modal==='win'||modal==='over')setModal('pause');else if(modal==='ad'||modal==='reward')setModal('over');else setModal(null);}}}>
      <DialogContent className="bloom-dialog max-h-[90dvh] overflow-y-auto rounded-[28px] border-0 p-7 sm:max-w-[430px]" onEscapeKeyDown={e=>{if(busy)e.preventDefault();}} onPointerDownOutside={e=>{if(busy)e.preventDefault();}}>
        <DialogHeader><DialogTitle className="text-center text-2xl font-extrabold tracking-tight">{modal?titles[modal]:''}</DialogTitle><DialogDescription className="pt-2 text-center text-sm leading-6">{modal?descriptions[modal]:''}</DialogDescription></DialogHeader>
        {modal==='levels'&&<div><div className="mt-2 grid grid-cols-3 gap-3">{Array.from({length:12},(_,i)=>i+1).map(level=><Button key={level} disabled={level>save.unlocked} className={`level-tile ${level===game.level?'selected':''}`} variant="outline" onClick={()=>{if(level===game.level)setModal(null);else if(game.moves>0&&!won(game)&&canPlay(game)){if(window.confirm('Switch levels? Your current board will be replaced.'))startLevel(level);}else startLevel(level);}}><span>{level>save.unlocked?<LockKeyhole size={20}/>:level}</span><span className="text-[10px]">{save.completed.includes(level)?'✓ Completed':level===game.level?'Current':level>save.unlocked?'Locked':'Play level'}</span></Button>)}</div></div>}
        {modal==='settings'&&<div className="space-y-5 py-3"><div className="setting-row"><span><Volume2 size={18}/> Game sounds</span><Switch aria-label="Game sounds" checked={save.sound} onCheckedChange={sound=>setSave(prev=>({...prev,sound}))}/></div><div className="setting-row"><span><Zap size={18}/> Haptic feedback</span><Switch aria-label="Haptic feedback" checked={save.haptics} onCheckedChange={haptics=>setSave(prev=>({...prev,haptics}))}/></div><p className="rounded-2xl bg-[#f7f3fd] p-4 text-xs leading-6 text-muted-foreground">Progress is saved locally, with no account needed. Haptics work on supported Android devices. {nativeAdsAvailable()?'Native ad bridge connected.':'Browser preview: ad spaces are demos, not live ads.'}</p><Button className="bloom-button w-full" onClick={()=>setModal(null)}>All set <Check size={17}/></Button></div>}
        {modal==='help'&&<div className="space-y-5 py-3">{[{n:'01',title:'Find a home for your blocks',text:'Drag a block onto the board, or tap a block then tap a square. The top-left of the shape lands where you point.'},{n:'02',title:'Make a line. Make some space.',text:'Fill any full row or column to clear it. Clear several at once for a bonus. Blocks cannot be rotated.'},{n:'03',title:'Let your progress bloom',text:'Reach the score goal and clear the required lines. New blocks arrive when you use all three. No space left? Try a one-time revive.'}].map(step=><div className="flex gap-3" key={step.n}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-xs font-bold text-purple-600">{step.n}</span><div><h3 className="text-sm font-bold">{step.title}</h3><p className="mt-1 text-xs leading-6 text-muted-foreground">{step.text}</p></div></div>)}<Button className="bloom-button w-full" onClick={()=>setModal(null)}>Let's play <Play size={15} fill="currentColor"/></Button></div>}
        {modal==='pause'&&<div className="space-y-3 pt-3"><div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[25px] bg-purple-100 text-purple-600"><Pause size={32} fill="currentColor"/></div><Button className="bloom-button w-full" onClick={()=>setModal(won(game)?'win':!canPlay(game)?'over':null)}><Play size={16}/> Back to the blocks</Button><Button className="secondary-button w-full" variant="outline" onClick={()=>setModal('levels')}>Choose a level <Map size={16}/></Button></div>}
        {modal==='restart'&&<div className="space-y-3 pt-4"><Button className="bloom-button w-full" onClick={()=>startLevel(game.level)}><RotateCcw size={17}/> Restart level {game.level}</Button><Button className="secondary-button w-full" variant="outline" onClick={()=>setModal(null)}>Keep playing</Button></div>}
        {modal==='win'&&<div className="text-center"><img src="/assets/block-buddies.png" className="mx-auto h-44 w-44 rounded-3xl" alt="Happy blocks celebrating"/><div className="mb-5 flex justify-center gap-2 text-[#e9b936]">{[1,2,3].map(i=><Star key={i} fill="currentColor" size={27}/>)}</div><p className="mb-5 text-sm font-bold">{game.score.toLocaleString()} points · {game.lines} lines cleared</p><Button className="bloom-button w-full" onClick={()=>game.level<12?startLevel(game.level+1):setModal('levels')}>{game.level<12?`On to level ${game.level+1}`:'All 12 levels complete! Play again'}<ArrowRight size={17}/></Button></div>}
        {modal==='over'&&<div className="space-y-3 pt-3"><div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[25px] bg-[#fce9f1] text-pink-500"><Heart size={35}/></div><div className="mb-4 text-center text-sm font-bold">{game.score.toLocaleString()} points · Level {game.level}</div>{!game.revived&&<Button disabled={busy} className="bloom-button w-full" onClick={reward}><Play size={16}/>{busy?'Opening ad…':nativeAdsAvailable()?'Watch & revive':'Preview rewarded revive'}</Button>}{!game.revived&&<p className="text-center text-[11px] text-muted-foreground">Clear the board. Keep your score. Once per game.</p>}<Button disabled={busy} className="secondary-button w-full" variant="outline" onClick={retry}><RotateCcw size={16}/>{busy?'Please wait…':'Try again'}</Button>{undo&&<Button variant="ghost" className="tool-button w-full" onClick={()=>{setSave(prev=>({...prev,game:undo}));setUndo(null);setModal(null);}}>Undo last move</Button>}</div>}
        {modal==='ad'&&<div className="space-y-4"><div className="ad-demo"><span className="pill">DEVELOPER PREVIEW</span><Maximize2 size={38} className="my-6 text-purple-400"/><p className="font-bold">Full-screen ad goes here</p><p className="mt-2 text-xs leading-6 text-muted-foreground">Shown between games, never during a move.<br/>Connect AdMob or LevelPlay in the Android app.</p></div><Button className="bloom-button w-full" onClick={()=>startLevel(game.level)}>Continue to new game <ArrowRight size={16}/></Button></div>}
        {modal==='reward'&&<div className="space-y-4"><div className="ad-demo"><span className="pill">DEVELOPER PREVIEW</span><Heart size={38} className="my-6 text-pink-400"/><p className="font-bold">Rewarded video placement</p><p className="mt-2 text-xs leading-6 text-muted-foreground">In the Android app, a revive is granted only after the SDK confirms the reward.</p></div><Button className="bloom-button w-full" onClick={applyRevive}>Try demo revive <Sparkles size={17}/></Button><Button variant="ghost" className="tool-button w-full" onClick={()=>setModal('over')}><ArrowLeft size={15}/> Not now</Button></div>}
      </DialogContent>
    </Dialog>
  </div>;
};
export default Index;
