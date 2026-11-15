import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { initializeAds, setBannerVisible, showCompletionInterstitial } from '@/lib/ads';
import { ADMOB_CONFIG } from '@/config/admob';
import { ArrowLeft, ArrowLeftRight, ChevronRight, Pause, Play, RotateCcw, Settings2, Star, Trophy, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import '@/components/bubble-game.css';
import '@/components/bubble-game-reference.css';
import '@/components/bubble-game-space.css';
import '@/components/bubble-game-responsive.css';

type Bubble = { row: number; col: number; color: number };
type Screen = 'menu' | 'game' | 'levels' | 'settings' | 'won' | 'lost';
const COLORS = ['#ffc83d', '#327fff', '#f0443f', '#26c9d4', '#9b58f4', '#56d88f'];
const MAX_LEVEL = 60, COLS = 9, ROW_GAP = Math.sqrt(3) / 2;
const SAVE_KEY = 'pop-garden-save-v1';
type Save = { unlocked: number; best: number[]; stars: number[]; sound: boolean };
const freshSave = (): Save => ({ unlocked: 1, best: [], stars: [], sound: true });
function readSave(): Save {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (parsed && Number.isInteger(parsed.unlocked) && Array.isArray(parsed.best)) return { ...freshSave(), ...parsed, stars: Array.isArray(parsed.stars) ? parsed.stars : [], unlocked: Math.max(1, Math.min(MAX_LEVEL, parsed.unlocked)) };
  } catch { /* Storage may be unavailable offline or in private mode. */ }
  return freshSave();
}
const colorCount = (level: number) => Math.min(3 + Math.floor((level - 1) / 4), COLORS.length);
function makeLevel(level: number): Bubble[] {
  const rows = Math.min(7 + Math.floor((level - 1) / 3), 9);
  const colors = colorCount(level);
  return Array.from({ length: rows }, (_, row) => Array.from({ length: COLS }, (_, col) => {
    const shape = level % 4;
    const present = shape === 0 ? (row + col) % 5 !== 0 : shape === 1 ? (col > 0 && col < COLS - 1) || row % 2 === 0 : shape === 2 ? row < rows - 1 || (col > 1 && col < COLS - 2) : true;
    const color = (Math.floor(col / 3) + Math.floor(row / 2) + Math.floor((col + row) / 6)) % colors;
    return present ? { row, col, color } : null;
  }).filter((bubble): bubble is Bubble => bubble !== null)).flat();
}
const randColor = (level: number) => Math.floor(Math.random() * colorCount(level));
function playPop(enabled: boolean) {
  if(!enabled||!window.AudioContext)return;
  const context=new AudioContext();
  const oscillator=context.createOscillator(),gain=context.createGain();
  oscillator.type='sine';oscillator.frequency.setValueAtTime(640,context.currentTime);oscillator.frequency.exponentialRampToValueAtTime(260,context.currentTime+.12);
  gain.gain.setValueAtTime(.12,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.14);
  oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.14);oscillator.onended=()=>void context.close();
}
const neighbors = (b: Bubble) => [[b.row,b.col-1],[b.row,b.col+1],[b.row-1,b.col+(b.row%2?0:-1)],[b.row-1,b.col+(b.row%2?1:0)],[b.row+1,b.col+(b.row%2?0:-1)],[b.row+1,b.col+(b.row%2?1:0)]] as [number,number][];
const key = (row: number, col: number) => `${row}:${col}`;

export default function Index() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [screen, setScreen] = useState<Screen>('menu');
  const [save, setSave] = useState<Save>(readSave);
  const [level, setLevel] = useState(1);
  const [board, setBoard] = useState<Bubble[]>([]);
  const [current, setCurrent] = useState(0);
  const [next, setNext] = useState(0);
  const [score, setScore] = useState(0);
  const [shots, setShots] = useState(0);
  const [aim, setAim] = useState<{x:number;y:number}|null>(null);
  const [paused, setPaused] = useState(false);
  const [bestThisRun, setBestThisRun] = useState(0);
  const [earnedStars, setEarnedStars] = useState(1);
  const [shotLimit, setShotLimit] = useState(24);
  const shotsRef = useRef(0);
  const scoreRef = useRef(0);
  const activeShot = useRef(false);
  const adBusy = useRef(false);
  const boardRef = useRef(board);
  const shotRef = useRef<{x:number;y:number;vx:number;vy:number;color:number}|null>(null);
  const aimRef = useRef<{x:number;y:number}|null>(null);
  const lastPointer = useRef<{x:number;y:number}|null>(null);
  const particles = useRef<{x:number;y:number;r:number;color:string;life:number;vx:number;vy:number}[]>([]);
  boardRef.current = board;
  aimRef.current = aim;

  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* Progress remains available for this session. */ }
  }, [save]);
  useEffect(() => {
    void initializeAds();
    setBannerVisible(false);
    return () => setBannerVisible(false);
  }, []);

  const startLevel = useCallback((levelNumber: number) => {
    setLevel(levelNumber); setBoard(makeLevel(levelNumber)); setScore(0); setShots(0); shotsRef.current=0; scoreRef.current=0; setShotLimit(24 + Math.min(6, Math.floor(levelNumber / 8)));
    setCurrent(randColor(levelNumber)); setNext(randColor(levelNumber)); setAim(null); setPaused(false); setScreen('game');
    shotRef.current = null; particles.current = []; activeShot.current = false;
  }, []);

  const completeLevel = useCallback((won: boolean, finalScore: number) => {
    if (won) {
      setBestThisRun(finalScore);
      const stars=shotsRef.current <= shotLimit * .25 ? 3 : shotsRef.current <= shotLimit * .6 ? 2 : 1;
      setEarnedStars(stars);
      setSave(prev => {
        const best=[...prev.best];
        const savedStars=[...prev.stars];
        best[level-1]=Math.max(best[level-1]||0,finalScore);
        savedStars[level-1]=Math.max(savedStars[level-1]||0,stars);
        return {...prev,unlocked:Math.min(MAX_LEVEL,Math.max(prev.unlocked,level+1)),best,stars:savedStars};
      });
      setScreen('won');
    } else setScreen('lost');
  }, [level, shotLimit]);

  const metrics = useCallback(() => {
    const c = canvas.current;
    if (!c) return null;
    const width = c.clientWidth, height = c.clientHeight;
    const game = c.closest('.bubble-game');
    const safeTop = game ? parseFloat(getComputedStyle(game).getPropertyValue('--safe-top')) || 0 : 0;
    const safeBottom = game ? parseFloat(getComputedStyle(game).getPropertyValue('--safe-bottom')) || 0 : 0;
    const rows = Math.max(7, ...boardRef.current.map(b => b.row + 1));
    const heightCell = Math.max(15, (height - safeTop - safeBottom - 190) / (Math.max(1, rows - 1) * ROW_GAP + 2.6));
    const cell = Math.min((width - 24) / (COLS + .5), 42, heightCell);
    const radius = cell * .47;
    return { width, height, cell, radius, left: (width - (COLS + .5) * cell) / 2 + radius, top: safeTop + 78, launcherX: width / 2, launcherY: height - Math.max(94, safeBottom + 72) };
  }, []);

  useEffect(() => {
    if(screen!=='game')return;
    let frame = 0;
    let previous = 0;
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      const c = canvas.current, ctx = c?.getContext('2d'), m = metrics();
      if (!c || !ctx || !m) return;
      const dpr = window.devicePixelRatio || 1;
      if (c.width !== Math.round(m.width * dpr) || c.height !== Math.round(m.height * dpr)) { c.width = m.width * dpr; c.height = m.height * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, m.width, m.height);
      const point = (row:number,col:number) => ({x:m.left+(col+(row%2)*.5)*m.cell,y:m.top+row*m.cell*ROW_GAP});
      const drawBubble = (x:number,y:number,color:number,r=m.radius) => {
        const g=ctx.createRadialGradient(x-r*.38,y-r*.42,r*.04,x,y,r);
        g.addColorStop(0,'#ffffff');g.addColorStop(.15,COLORS[color]);g.addColorStop(.72,COLORS[color]);g.addColorStop(1,'#172342');
        ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=g;ctx.shadowColor=`${COLORS[color]}66`;ctx.shadowBlur=5;ctx.fill();ctx.shadowBlur=0;
        ctx.beginPath();ctx.ellipse(x-r*.27,y-r*.32,r*.2,r*.12,-.5,0,Math.PI*2);ctx.fillStyle='#ffffffc7';ctx.fill();
        ctx.beginPath();ctx.arc(x+r*.22,y+r*.27,r*.055,0,Math.PI*2);ctx.fillStyle='#ffffff65';ctx.fill();
      };
      boardRef.current.forEach(b => { const p=point(b.row,b.col); drawBubble(p.x,p.y,b.color); });
      if (screen === 'game' && !paused) {
        const origin={x:m.launcherX,y:m.launcherY-44};
        const a=aimRef.current;
        if (a && !shotRef.current) {
          let dx=a.x-origin.x,dy=a.y-origin.y; if(dy>-m.height*.08)dy=-m.height*.08;
          const length=Math.hypot(dx,dy)||1;let x=origin.x,y=origin.y,vx=dx/length,vy=dy/length;
          ctx.beginPath();ctx.moveTo(x,y);ctx.strokeStyle='#ffffffa8';ctx.lineWidth=2;ctx.setLineDash([3,6]);
          for(let i=0;i<90;i++){x+=vx*7;y+=vy*7;if(x<m.radius||x>m.width-m.radius){vx=-vx;x=Math.max(m.radius,Math.min(m.width-m.radius,x));}ctx.lineTo(x,y);if(y<m.top||boardRef.current.some(b=>{const p=point(b.row,b.col);return Math.hypot(x-p.x,y-p.y)<m.radius*2;}))break;}
          ctx.stroke();ctx.setLineDash([]);
        }
        if (shotRef.current) {
          const s=shotRef.current,dt=Math.min(32,time-(previous||time))/16.67; s.x+=s.vx*7*dt;s.y+=s.vy*7*dt;
          if(s.x<m.radius){s.x=m.radius;s.vx=Math.abs(s.vx);}if(s.x>m.width-m.radius){s.x=m.width-m.radius;s.vx=-Math.abs(s.vx);}
          const collided=s.y<=m.top+m.radius||boardRef.current.some(b=>{const p=point(b.row,b.col);return Math.hypot(s.x-p.x,s.y-p.y)<m.radius*1.92;});
          if(collided){
            const occupied=new Set(boardRef.current.map(b=>key(b.row,b.col)));
            let candidate:Bubble|null=null,best=Infinity;
            for(let row=0;row<14;row++)for(let col=0;col<COLS;col++){if(occupied.has(key(row,col)))continue;const p=point(row,col),d=Math.hypot(s.x-p.x,s.y-p.y);if(d<m.cell*1.04&&d<best){best=d;candidate={row,col,color:s.color};}}
            if(!candidate){for(let row=0;row<14;row++)for(let col=0;col<COLS;col++){if(occupied.has(key(row,col)))continue;const p=point(row,col),d=Math.hypot(s.x-p.x,s.y-p.y);if(d<best){best=d;candidate={row,col,color:s.color};}}}
            const added=candidate?[...boardRef.current,candidate]:boardRef.current;
            let cluster=new Set<string>();
            if(candidate){const queue=[candidate];cluster.add(key(candidate.row,candidate.col));while(queue.length){const node=queue.pop()!;for(const [r,col] of neighbors(node)){const found=added.find(b=>b.row===r&&b.col===col&&b.color===s.color);if(found&&!cluster.has(key(r,col))){cluster.add(key(r,col));queue.push(found);}}}}
            let popped=added;
            if(cluster.size>=3){popped=added.filter(b=>!cluster.has(key(b.row,b.col)));const connected=new Set(popped.filter(b=>b.row===0).map(b=>key(b.row,b.col)));const q=popped.filter(b=>b.row===0);while(q.length){const b=q.pop()!;for(const [r,col] of neighbors(b)){const k=key(r,col),found=popped.find(item=>key(item.row,item.col)===k);if(found&&!connected.has(k)){connected.add(k);q.push(found);}}}const floating=popped.filter(b=>!connected.has(key(b.row,b.col)));popped=popped.filter(b=>connected.has(key(b.row,b.col)));const earned=(cluster.size*10)+(floating.length*15);scoreRef.current+=earned;setScore(scoreRef.current);playPop(save.sound);floating.forEach(b=>{const p=point(b.row,b.col);for(let i=0;i<4;i++)particles.current.push({x:p.x,y:p.y,r:m.radius*.28,color:COLORS[b.color],life:1,vx:(Math.random()-.5)*5,vy:Math.random()*-5});});}
            if(candidate){const p=point(candidate.row,candidate.col);for(let i=0;i<(cluster.size>=3?10:3);i++)particles.current.push({x:p.x,y:p.y,r:m.radius*.18,color:COLORS[s.color],life:1,vx:(Math.random()-.5)*6,vy:(Math.random()-.6)*6});}
            boardRef.current=popped;setBoard(popped);shotRef.current=null;activeShot.current=false;
            const total=scoreRef.current;
            if(!popped.length)completeLevel(true,total);
            else if(shotsRef.current>=shotLimit)completeLevel(false,total);
          } else drawBubble(s.x,s.y,s.color);
        }
        if(!shotRef.current){
          const ringY=m.launcherY;
          ctx.beginPath();ctx.arc(m.launcherX,ringY,43,0,Math.PI*2);ctx.strokeStyle='#ffffff';ctx.lineWidth=6;ctx.shadowColor='#ffffffb8';ctx.shadowBlur=16;ctx.stroke();ctx.shadowBlur=0;
          ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 27px Nunito, sans-serif';ctx.lineWidth=4;ctx.strokeStyle='#4032a7';ctx.strokeText(String(Math.max(0,shotLimit-shots)),m.launcherX,ringY+1);ctx.fillStyle='#ffffff';ctx.fillText(String(Math.max(0,shotLimit-shots)),m.launcherX,ringY+1);
          drawBubble(origin.x,origin.y,current,m.radius*1.08);drawBubble(m.launcherX+52,ringY,next,m.radius*.9);
        }
        const now=time;const elapsed=Math.min(32,now-(previous||now));previous=now;
        particles.current=particles.current.filter(p=>p.life>0);
        particles.current.forEach(p=>{p.x+=p.vx*elapsed/16;p.y+=p.vy*elapsed/16;p.vy+=.12;p.life-=elapsed/500;ctx.globalAlpha=Math.max(0,p.life);ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=p.color;ctx.fill();});ctx.globalAlpha=1;
      } else { previous=0; }
    };
    frame=requestAnimationFrame(draw);
    return()=>cancelAnimationFrame(frame);
  },[metrics,screen,paused,current,score,shots,shotLimit,completeLevel,save.sound]);

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if(screen!=='game'||paused||activeShot.current)return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect=event.currentTarget.getBoundingClientRect();lastPointer.current={x:event.clientX-rect.left,y:event.clientY-rect.top};setAim(lastPointer.current);
  }
  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if(screen!=='game'||paused)return;
    const rect=event.currentTarget.getBoundingClientRect(),point={x:event.clientX-rect.left,y:event.clientY-rect.top};
    if(event.buttons||event.pointerType==='touch'){lastPointer.current=point;setAim(point);}
  }
  function pointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if(!lastPointer.current||screen!=='game'||paused||activeShot.current)return;
    const rect=event.currentTarget.getBoundingClientRect(),target={x:event.clientX-rect.left,y:event.clientY-rect.top},m=metrics();lastPointer.current=null;
    if(!m)return;
    let dx=target.x-m.launcherX,dy=target.y-m.launcherY;if(dy>-24)dy=-24;
    const length=Math.hypot(dx,dy)||1;shotRef.current={x:m.launcherX,y:m.launcherY-44,vx:dx/length,vy:dy/length,color:current};
    activeShot.current=true;shotsRef.current+=1;setShots(shotsRef.current);setCurrent(next);setNext(randColor(level));setAim(null);
  }

  async function continueLevel() {
    const nextLevel=level+1;
    if((level%ADMOB_CONFIG.puzzlesPerInterstitial)===0&&!adBusy.current){adBusy.current=true;await showCompletionInterstitial().catch(()=>({status:'unavailable' as const}));adBusy.current=false;}
    startLevel(nextLevel>MAX_LEVEL?1:nextLevel);
  }
  function restart() { startLevel(level); }
  function switchBubbles() {
    if(activeShot.current||paused)return;
    setCurrent(next);
    setNext(current);
  }
  const highScore=Math.max(0,...save.best);

  return <main className="bubble-app">
    <section className={`bubble-game ${screen==='game'?'is-playing':''}`} aria-label="Pop Garden Bubble Shooter">
      <header className="bubble-header"><button className="bubble-brand" onClick={()=>setScreen('menu')} aria-label="Main menu"><span className="bubble-logo">✦</span><span><b>Pop Garden</b><small>Bubble Shooter</small></span></button>{screen==='game'?<button className="round-control" onClick={()=>setPaused(true)} aria-label="Pause game"><Pause size={18}/></button>:<button className="round-control" onClick={()=>setScreen('settings')} aria-label="Settings"><Settings2 size={19}/></button>}</header>
      {screen==='menu'&&<div className="menu-screen"><div className="menu-art"><span className="art-leaf leaf-one">✿</span><span className="art-leaf leaf-two">✿</span><div className="art-bubble bubble-a"/><div className="art-bubble bubble-b"/><div className="art-bubble bubble-c"/><div className="art-bubble bubble-d"/><div className="art-launcher">✦</div></div><p className="menu-kicker">A little pop of happiness</p><h1>Ready, aim,<br/><em>let joy bloom.</em></h1><p className="menu-copy">Match colors, clear the board,<br/>and enjoy a moment of calm.</p><Button className="bubble-primary" onClick={()=>startLevel(save.unlocked)}><Play size={18} fill="currentColor"/> Play now</Button><Button variant="ghost" className="menu-level-button" onClick={()=>setScreen('levels')}>Choose a level <ChevronRight size={17}/></Button><div className="menu-record"><Trophy size={16}/><span>BEST SCORE</span><strong>{highScore.toLocaleString()}</strong></div></div>}
      {screen==='levels'&&<div className="levels-screen"><button className="back-link" onClick={()=>setScreen('menu')}><ArrowLeft size={17}/> Main menu</button><h2>Choose a level</h2><p>Every level is a fresh little challenge.</p><div className="levels-grid">{Array.from({length:MAX_LEVEL},(_,index)=>index+1).map(n=><button key={n} className={`level-tile-bubble ${n===level?'current':''}`} disabled={n>save.unlocked} onClick={()=>startLevel(n)}><span>{n>save.unlocked?'🔒':n}</span><small>{'★'.repeat(save.stars[n-1]||0)||' '}</small></button>)}</div></div>}
      {screen==='settings'&&<div className="settings-screen"><button className="back-link" onClick={()=>setScreen('menu')}><ArrowLeft size={17}/> Main menu</button><h2>Settings</h2><p>Make the garden feel like yours.</p><button className="setting-toggle" onClick={()=>setSave(prev=>({...prev,sound:!prev.sound}))}><span>{save.sound?<Volume2 size={19}/>:<VolumeX size={19}/>} Sound effects</span><strong>{save.sound?'ON':'OFF'}</strong></button><div className="offline-note">✦ Your progress is saved on this device and works offline.</div></div>}
      {screen==='game'&&<><div className="play-hud"><div className="hud-level">LEVEL {level}</div><div className="hud-progress"><div className="hud-progress-track"><i style={{width:`${Math.min(100,Math.max(8,score/(level*500)*100))}%`}}/></div><div className="hud-stars"><Star size={19} fill="currentColor"/><Star size={19} fill="currentColor"/><Star size={19}/></div></div><div className="hud-score">{score.toLocaleString()}</div><div className="hud-ammo"><span className="ammo-bubbles"><i/><i/><i/></span><b>{Math.max(0,shotLimit-shots)}</b></div><button className="hud-settings" onClick={()=>setPaused(true)} aria-label="Pause game"><Settings2 size={24}/></button></div><div className="bubble-canvas-wrap"><canvas ref={canvas} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={()=>{lastPointer.current=null;setAim(null);}} aria-label="Drag to aim and release to shoot"/></div><button className="swap-bubbles" onClick={switchBubbles} disabled={paused||Boolean(shotRef.current)} aria-label="Switch current and next bubbles" title="Switch bubbles"><ArrowLeftRight size={20}/></button>{paused&&<div className="bubble-overlay"><div className="result-card"><span className="modal-icon">☁️</span><h2>Paused</h2><p>Your bubbles are right where you left them.</p><Button className="bubble-primary" onClick={()=>setPaused(false)}><Play size={17} fill="currentColor"/> Keep playing</Button><Button variant="ghost" className="quiet-button" onClick={()=>setScreen('menu')}>Leave level</Button></div></div>}</>}
      {screen==='won'&&<div className="result-screen"><span className="result-emoji">🎉</span><p className="result-kicker">LEVEL {String(level).padStart(2,'0')} COMPLETE</p><h2>Beautifully done!</h2><div className="star-row">{[1,2,3].map(n=><Star key={n} size={34} fill={n<=earnedStars?'currentColor':'transparent'} className={n<=earnedStars?'earned':''}/>)}</div><div className="result-score"><small>YOUR SCORE</small><strong>{bestThisRun.toLocaleString()}</strong></div><Button className="bubble-primary" onClick={()=>void continueLevel()}>Next level <ChevronRight size={18}/></Button><Button variant="ghost" className="quiet-button" onClick={()=>setScreen('levels')}>Level selection</Button></div>}
      {screen==='lost'&&<div className="result-screen"><span className="result-emoji">🌱</span><p className="result-kicker">ONE MORE TRY?</p><h2>Keep going, you’ve got this.</h2><p className="result-description">A fresh shot at this level is ready.</p><Button className="bubble-primary" onClick={restart}><RotateCcw size={17}/> Retry level</Button><Button variant="ghost" className="quiet-button" onClick={()=>setScreen('levels')}>Level selection</Button></div>}
    </section>
    {Capacitor.getPlatform()==='web'&&screen==='menu'&&<p className="web-note">A cheerful little game for your break</p>}
  </main>;
}
