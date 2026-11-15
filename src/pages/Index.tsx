import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { initializeAds, setBannerVisible, showCompletionInterstitial } from '@/lib/ads';
import { ADMOB_CONFIG } from '@/config/admob';
import { Aim, RotateCcw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import '@/components/bubble-game.css';

type Bubble = { row: number; col: number; color: number };
const COLORS = ['#ff668a', '#38c8b4', '#ffc34f', '#9c73f5', '#57a8f5'];
const ROWS = 9, COLS = 8;
const makeBoard = (): Bubble[] => Array.from({ length: 5 }, (_, row) =>
  Array.from({ length: COLS - (row % 2) }, (_, col) => ({
    row,
    col,
    color: (row + col * 2 + Math.floor(Math.random() * 3)) % COLORS.length,
  })),
).flat();
const randomColor = () => Math.floor(Math.random() * COLORS.length);

export default function Index() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [board, setBoard] = useState<Bubble[]>(makeBoard);
  const [shot, setShot] = useState(randomColor);
  const [next, setNext] = useState(randomColor);
  const [score, setScore] = useState(0);
  const [shots, setShots] = useState(0);
  const [round, setRound] = useState(1);
  const [aim, setAim] = useState({ x: 0, y: 0 });
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<'win'|'over'|null>(null);
  const busy = useRef(false);
  const adBusy = useRef(false);
  const colors = COLORS;

  useEffect(() => {
    void initializeAds().then(allowed => { if (allowed) setBannerVisible(true); });
    return () => setBannerVisible(false);
  }, []);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const ctx = element.getContext('2d');
    if (!ctx) return;
    const width = element.clientWidth, height = element.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    element.width = width * dpr; element.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    const cell = Math.min((width - 32) / COLS, 38);
    const radius = cell * .45;
    const ox = (width - (COLS * cell)) / 2 + radius;
    const oy = 24;
    const coords = (row:number,col:number) => ({x:ox+col*cell+(row%2 ? cell/2 : 0),y:oy+row*cell*.87});
    board.forEach(b => {
      const {x,y}=coords(b.row,b.col);
      const gradient=ctx.createRadialGradient(x-radius*.35,y-radius*.4,1,x,y,radius*1.15);
      gradient.addColorStop(0,'#ffffff'); gradient.addColorStop(.16,colors[b.color]); gradient.addColorStop(1,colors[b.color]);
      ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fillStyle=gradient;ctx.fill();
      ctx.beginPath();ctx.arc(x-radius*.28,y-radius*.3,radius*.12,0,Math.PI*2);ctx.fillStyle='#ffffffa8';ctx.fill();
    });
    const launcher={x:width/2,y:height-43};
    ctx.setLineDash([4,7]);ctx.strokeStyle='#ffffff70';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(launcher.x,launcher.y);ctx.lineTo(aim.x||launcher.x,aim.y||launcher.y-120);ctx.stroke();ctx.setLineDash([]);
    ctx.beginPath();ctx.arc(launcher.x,launcher.y,radius+2,0,Math.PI*2);ctx.fillStyle=colors[shot];ctx.fill();
  },[board,shot,aim]);

  async function resetRound(nextRound=round, completed=false) {
    if (completed && nextRound>1 && (nextRound-1)%ADMOB_CONFIG.puzzlesPerInterstitial===0 && !adBusy.current) {
      adBusy.current=true;
      await showCompletionInterstitial().catch(()=>({status:'unavailable' as const}));
      adBusy.current=false;
    }
    setRound(nextRound);setBoard(makeBoard());setScore(0);setShots(0);setShot(randomColor());setNext(randomColor());setResult(null);setPaused(false);
  }

  function shoot(event: React.PointerEvent<HTMLCanvasElement>) {
    if (paused||result||busy.current) return;
    const rect=event.currentTarget.getBoundingClientRect();
    const targetX=event.clientX-rect.left, targetY=event.clientY-rect.top;
    const originX=rect.width/2, originY=rect.height-43;
    if(targetY>originY-14)return;
    busy.current=true;
    const cell=Math.min((rect.width-32)/COLS,38), radius=cell*.45;
    const ox=(rect.width-COLS*cell)/2+radius, oy=24;
    const col=Math.max(0,Math.min(COLS-1,Math.round((targetX-ox-(Math.round((originY-targetY)/cell)%2)*cell/2)/cell)));
    const row=Math.max(0,Math.min(ROWS-1,Math.round((targetY-oy)/(cell*.87))));
    const placement={row,col,color:shot};
    const existing=board.some(b=>b.row===row&&b.col===col);
    let settled={...placement};
    if(existing){
      const candidate=Array.from({length:ROWS},(_,r)=>Array.from({length:COLS},(_,c)=>({row:r,col:c}))).flat().filter(p=>!board.some(b=>b.row===p.row&&b.col===p.col)).sort((a,b)=>Math.hypot(a.col-col,a.row-row)-Math.hypot(b.col-col,b.row-row))[0];
      if(candidate)settled={...candidate,color:shot};
    }
    let updated=[...board,settled];
    const key=(r:number,c:number)=>`${r}:${c}`;
    const neighbors=(b:Bubble)=>[[b.row,b.col-1],[b.row,b.col+1],[b.row-1,b.col+(b.row%2?0:-1)],[b.row-1,b.col+(b.row%2?1:0)],[b.row+1,b.col+(b.row%2?0:-1)],[b.row+1,b.col+(b.row%2?1:0)]];
    const same=new Set([key(settled.row,settled.col)]), queue=[settled];
    while(queue.length){const node=queue.pop()!;for(const [r,c] of neighbors(node)){const match=updated.find(b=>b.row===r&&b.col===c&&b.color===shot);if(match&&!same.has(key(r,c))){same.add(key(r,c));queue.push(match);}}}
    if(same.size>=3){updated=updated.filter(b=>!same.has(key(b.row,b.col)));let dropped=true;while(dropped){dropped=false;const attached=new Set(updated.filter(b=>b.row===0).map(b=>key(b.row,b.col)));const q=updated.filter(b=>b.row===0);while(q.length){const node=q.pop()!;for(const [r,c] of neighbors(node)){const k=key(r,c), found=updated.find(b=>b.row===r&&b.col===c);if(found&&!attached.has(k)){attached.add(k);q.push(found);}}}const before=updated.length;updated=updated.filter(b=>attached.has(key(b.row,b.col)));dropped=updated.length<before;}setScore(v=>v+same.size*10);}
    const newShots=shots+1;setShots(newShots);setBoard(updated);setShot(next);setNext(randomColor());
    if(!updated.length)setResult('win');else if(newShots>=5&&newShots%5===0){const descended=updated.map(b=>({...b,row:b.row+1}));if(descended.some(b=>b.row>=ROWS-1)){setBoard(descended);setResult('over');}else setBoard(descended);}
    setTimeout(()=>{busy.current=false;},160);
  }

  function handlePointer(event:React.PointerEvent<HTMLCanvasElement>){const rect=event.currentTarget.getBoundingClientRect();setAim({x:event.clientX-rect.left,y:event.clientY-rect.top});}

  return <main className="bubble-app">
    <section className="bubble-game" aria-label="Bubble Pop game">
      <header className="bubble-header"><div><span className="bubble-logo">✦</span><div><h1>Pop Garden</h1><p>Little bubbles, big joy</p></div></div><span className="bubble-tag">BUBBLE SHOOTER</span></header>
      <div className="bubble-stats"><div><small>LEVEL</small><strong>{String(round).padStart(2,'0')}</strong></div><div className="score-pill"><Trophy size={16}/><span>{score.toLocaleString()} <small>POINTS</small></span></div><button className="round-control" onClick={()=>setPaused(!paused)} aria-label={paused?'Resume':'Pause'}>{paused?'▶':'Ⅱ'}</button></div>
      <div className="bubble-instruction">{result?'Lovely round!':paused?'Take a breather':'Match 3 or more bubbles to pop them'}</div>
      <div className="bubble-canvas-wrap"><canvas ref={canvas} onPointerMove={handlePointer} onPointerDown={shoot} aria-label="Aim and tap to shoot bubbles"/></div>
      <div className="shooter-footer"><div className="next-bubble"><span>UP NEXT</span><i style={{background:colors[next]}}/></div><div className="aim-badge"><Aim size={16}/> TAP TO AIM & POP</div><Button variant="ghost" className="restart-bubble" onClick={()=>void resetRound()} aria-label="Restart level"><RotateCcw size={18}/></Button></div>
      <div className="ad-dock" aria-hidden="true"><div className="banner-slot"/></div>
      {result&&<div className="bubble-overlay"><div className="result-card"><div className="result-emoji">{result==='win'?'🎉':'🌷'}</div><h2>{result==='win'?'All popped!':'Keep blooming!'}</h2><p>{result==='win'?'You cleared the garden.':'A fresh board is ready when you are.'} {score} points</p><Button className="bubble-primary" onClick={()=>void resetRound(result==='win'?round+1:round,result==='win')}>{result==='win'?'Next level':'Try again'}</Button></div></div>}
      {paused&&!result&&<div className="bubble-overlay"><div className="result-card"><div className="result-emoji">☁️</div><h2>Paused</h2><p>Your bubbles are waiting.</p><Button className="bubble-primary" onClick={()=>setPaused(false)}>Back to popping</Button></div></div>}
    </section>
    {Capacitor.getPlatform()==='web'&&<p className="web-note">A cheerful little game for your break</p>}
  </main>;
}
