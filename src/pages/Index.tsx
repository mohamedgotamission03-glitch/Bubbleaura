import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Heart, LockKeyhole, Map, Maximize2, Pause, Play, RotateCcw, Sparkles, Star, Volume2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import GameScreen from '@/components/GameScreen';
import { canPlay, Game, newGame, place, readSave, revive, won } from '@/lib/puzzle';
import { nativeAdsAvailable, requestAd } from '@/lib/ads';
import { toast } from 'sonner';

type Modal = 'levels'|'settings'|'help'|'pause'|'restart'|'win'|'over'|'ad'|'reward'|null;
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
  return <div className="app-shell">
    <GameScreen
      save={save}
      disabled={Boolean(modal)||busy}
      undoAvailable={Boolean(undo)}
      bump={bump}
      onPlace={onPlace}
      onLevels={()=>setModal('levels')}
      onSettings={()=>setModal('settings')}
      onHelp={()=>setModal('help')}
      onPause={()=>setModal('pause')}
      onRestart={()=>setModal('restart')}
      onUndo={()=>{if(undo){setSave(prev=>({...prev,game:undo}));setUndo(null);}}}
    />
    {storageWarning&&<p className="mx-auto max-w-[400px] px-4 py-2 text-center text-xs text-amber-700">Device storage is unavailable. Progress will last only for this session.</p>}
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
