import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { initializeAds, requestRewardedAd, rewardedAdsAvailable, setBannerVisible, showCompletionInterstitial } from '@/lib/ads';
import { ADMOB_CONFIG } from '@/config/admob';
import { BubbleEngine, EndInfo, Hud } from '@/lib/bubble-engine';
import { MAX_LEVEL, WORLDS } from '@/lib/bubbles';
import { unlockAudio } from '@/lib/audio';
import { ArrowLeft, ArrowLeftRight, Bomb, ChevronRight, Flame, Gift, Pause, Play, RotateCcw, Settings2, Star, Trophy, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import AdPrivacyControls from '@/components/AdPrivacyControls';
import '@/components/bubble-game.css';
import '@/components/bubble-game-reference.css';
import '@/components/bubble-game-space.css';
import '@/components/bubble-game-responsive.css';
import '@/components/bubble-game-polish.css';

type Screen = 'menu' | 'game' | 'levels' | 'settings';
type Save = { unlocked: number; best: number[]; stars: number[]; sound: boolean; runs: number; bombs: number; gift: string; giftStreak: number };
const SAVE_KEY = 'pop-garden-save-v1';
const freshSave = (): Save => ({ unlocked: 1, best: [], stars: [], sound: true, runs: 0, bombs: 1, gift: '', giftStreak: 0 });
const dayStamp = (offset = 0) => { const d = new Date(Date.now() + offset * 864e5); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const idleHud: Hud = { score: 0, moves: 0, moveLimit: 1, progress: 0, stars: 3, streak: 0, charge: 0 };

function readSave(): Save {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (parsed && Number.isInteger(parsed.unlocked) && Array.isArray(parsed.best)) {
      return { ...freshSave(), ...parsed, stars: Array.isArray(parsed.stars) ? parsed.stars : [], unlocked: Math.max(1, Math.min(MAX_LEVEL, parsed.unlocked)) };
    }
  } catch { /* Storage may be unavailable offline or in private mode. */ }
  return freshSave();
}

export default function Index() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<BubbleEngine | null>(null);
  const adBusy = useRef(false);
  const [screen, setScreen] = useState<Screen>('menu');
  const [save, setSave] = useState<Save>(readSave);
  const [level, setLevel] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [hud, setHud] = useState<Hud>(idleHud);
  const [paused, setPaused] = useState(false);
  const [end, setEnd] = useState<EndInfo | null>(null);
  const [newBest, setNewBest] = useState(false);
  const [revived, setRevived] = useState(false);
  const [reviveBusy, setReviveBusy] = useState(false);
  const [splash, setSplash] = useState(true);
  useEffect(() => { const t = setTimeout(() => setSplash(false), 1700); return () => clearTimeout(t); }, []);
  const giftReady = save.gift !== dayStamp();
  const claimGift = () => setSave(prev => {
    if (prev.gift === dayStamp()) return prev;
    const streak = prev.gift === dayStamp(-1) ? Math.min(7, prev.giftStreak + 1) : 1;
    return { ...prev, gift: dayStamp(), giftStreak: streak, bombs: prev.bombs + (streak >= 7 ? 3 : streak >= 4 ? 2 : 1) };
  });
  const useBooster = () => {
    if (save.bombs > 0 && engine.current?.useBomb()) setSave(prev => ({ ...prev, bombs: prev.bombs - 1 }));
  };
  const levelRef = useRef(level);
  const saveRef = useRef(save);
  levelRef.current = level;
  saveRef.current = save;

  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* Progress remains available for this session. */ }
  }, [save]);
  useEffect(() => {
    void initializeAds();
    return () => setBannerVisible(false);
  }, []);
  useEffect(() => { setBannerVisible(screen !== 'game' && !splash); }, [screen, splash]);

  const handleEnd = useCallback((info: EndInfo) => {
    setEnd(info);
    if (!info.won) return;
    const n = levelRef.current;
    setNewBest(info.score > (saveRef.current.best[n - 1] || 0));
    setSave(prev => {
      const best = [...prev.best], stars = [...prev.stars];
      best[n - 1] = Math.max(best[n - 1] || 0, info.score);
      stars[n - 1] = Math.max(stars[n - 1] || 0, info.stars);
      return { ...prev, best, stars, runs: prev.runs + 1, unlocked: Math.min(MAX_LEVEL, Math.max(prev.unlocked, n + 1)) };
    });
  }, []);

  useEffect(() => {
    if (screen !== 'game' || !canvas.current) return;
    const game = new BubbleEngine(canvas.current, level, { sound: saveRef.current.sound, haptics: true }, { onHud: setHud, onEnd: handleEnd });
    engine.current = game;
    game.start();
    return () => { game.destroy(); engine.current = null; };
  }, [screen, level, attempt, handleEnd]);

  useEffect(() => { engine.current?.setPaused(paused || Boolean(end)); }, [paused, end, screen, level, attempt]);
  useEffect(() => { engine.current?.setOptions({ sound: save.sound, haptics: true }); }, [save.sound]);
  useEffect(() => {
    const hide = () => { if (document.hidden) setPaused(true); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);

  const startLevel = useCallback((n: number) => {
    setLevel(n); setAttempt(a => a + 1); setHud(idleHud); setEnd(null); setPaused(false); setRevived(false); setNewBest(false); setScreen('game');
  }, []);

  const local = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const onDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    void unlockAudio();
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = local(event);
    engine.current?.pointerDown(p.x, p.y);
  };
  const onMove = (event: React.PointerEvent<HTMLCanvasElement>) => { const p = local(event); engine.current?.pointerMove(p.x, p.y); };
  const onUp = (event: React.PointerEvent<HTMLCanvasElement>) => { const p = local(event); engine.current?.pointerUp(p.x, p.y); };

  async function nextLevel() {
    if (saveRef.current.runs > 0 && saveRef.current.runs % ADMOB_CONFIG.puzzlesPerInterstitial === 0 && !adBusy.current) {
      adBusy.current = true;
      await showCompletionInterstitial().catch(() => ({ status: 'unavailable' as const }));
      adBusy.current = false;
    }
    startLevel(level >= MAX_LEVEL ? 1 : level + 1);
  }
  async function reviveWithAd() {
    if (reviveBusy) return;
    setReviveBusy(true);
    const result = await requestRewardedAd().catch(() => ({ status: 'unavailable' as const, rewarded: false }));
    setReviveBusy(false);
    if (result.rewarded) {
      setRevived(true);
      setEnd(null);
      engine.current?.revive();
    }
  }

  const highScore = Math.max(0, ...save.best.filter(Boolean));
  const totalStars = save.stars.reduce((sum, s) => sum + (s || 0), 0);
  const canRevive = Boolean(end && !end.won && !revived && rewardedAdsAvailable());
  const movesLow = hud.moves <= 3;

  return <main className="bubble-app">
    {splash && <div className="splash" aria-hidden="true"><div className="splash-logo">✦</div><h1>Bubblora</h1><p>by Cubellio4Fun</p><div className="splash-bar"><i /></div></div>}
    <section className={`bubble-game ${screen === 'game' ? 'is-playing' : ''}`} aria-label="Bubblora Bubble Shooter">
      <header className="bubble-header"><button className="bubble-brand" onClick={() => setScreen('menu')} aria-label="Main menu"><span className="bubble-logo">✦</span><span><b>Bubblora</b><small>Bubble Shooter</small></span></button><button className="round-control" onClick={() => setScreen('settings')} aria-label="Settings"><Settings2 size={19} /></button></header>
      {screen === 'menu' && <div className="menu-screen"><div className="menu-art"><span className="art-leaf leaf-one">✿</span><span className="art-leaf leaf-two">✿</span><div className="art-bubble bubble-a" /><div className="art-bubble bubble-b" /><div className="art-bubble bubble-c" /><div className="art-bubble bubble-d" /><div className="art-launcher">✦</div></div><p className="menu-kicker">A little pop of happiness</p><h1>Ready, aim,<br /><em>let joy bloom.</em></h1><p className="menu-copy">Chain combos, drop big clusters,<br />and light up bombs and rainbows.</p><Button className="bubble-primary" onClick={() => startLevel(save.unlocked)}><Play size={18} fill="currentColor" /> {save.unlocked > 1 ? `Play level ${save.unlocked}` : 'Play now'}</Button><Button variant="ghost" className="menu-level-button" onClick={() => setScreen('levels')}>Choose a level <ChevronRight size={17} /></Button>{giftReady ? <button className="gift-card ready" onClick={claimGift}><Gift size={20} /><span><b>Daily gift</b><small>Tap to collect a free bomb!</small></span></button> : <div className="gift-card"><Gift size={20} /><span><b>Gift collected · day {save.giftStreak}</b><small>{save.bombs} bombs ready · come back tomorrow</small></span></div>}<div className="menu-record"><Trophy size={16} /><span>BEST SCORE</span><strong>{highScore.toLocaleString()}</strong><Star size={14} /><strong>{totalStars}</strong></div></div>}
      {screen === 'levels' && <div className="levels-screen"><button className="back-link" onClick={() => setScreen('menu')}><ArrowLeft size={17} /> Main menu</button><h2>Choose a level</h2><p>{totalStars} ★ collected across {WORLDS.length} worlds.</p>{WORLDS.map((world, w) => <div key={world.name} className="world-block"><h3 className="world-title"><i style={{ background: world.top }} />{world.name}</h3><div className="levels-grid">{Array.from({ length: 10 }, (_, i) => w * 10 + i + 1).map(n => <button key={n} className={`level-tile-bubble ${n === save.unlocked ? 'current' : ''}`} disabled={n > save.unlocked} onClick={() => startLevel(n)}><span>{n > save.unlocked ? '🔒' : n}</span><small>{'★'.repeat(save.stars[n - 1] || 0) || ' '}</small></button>)}</div></div>)}</div>}
      {screen === 'settings' && <div className="settings-screen"><button className="back-link" onClick={() => setScreen('menu')}><ArrowLeft size={17} /> Main menu</button><h2>Settings</h2><p>Make the game feel like yours.</p><button className="setting-toggle" onClick={() => setSave(prev => ({ ...prev, sound: !prev.sound }))}><span>{save.sound ? <Volume2 size={19} /> : <VolumeX size={19} />} Sound effects</span><strong>{save.sound ? 'ON' : 'OFF'}</strong></button><div className="offline-note">✦ Your progress is saved on this device and works offline.</div><AdPrivacyControls /><div className="legal-links"><Link to="/privacy">Privacy Policy</Link><Link to="/terms">Terms of Use</Link></div><p className="legal-foot">Bubblora v1.0 · © {new Date().getFullYear()} Cubellio4Fun<br />Made with care for happy breaks.</p></div>}
      {screen === 'game' && <>
        <div className="play-hud">
          <div className="hud-level">LEVEL {level}</div>
          <div className="hud-progress"><div className="hud-progress-track"><i style={{ width: `${Math.max(6, hud.progress * 100)}%` }} /></div><div className="hud-stars">{[1, 2, 3].map(n => <Star key={n} size={19} fill="currentColor" className={n <= hud.stars ? 'lit' : ''} />)}</div></div>
          <div className="hud-score">{hud.score.toLocaleString()}</div>
          <div className={`hud-ammo ${movesLow ? 'low' : ''}`}><span className="ammo-bubbles"><i /><i /><i /></span><b>{hud.moves}</b></div>
          <button className="hud-settings" onClick={() => setPaused(true)} aria-label="Pause game"><Pause size={20} /></button>
        </div>
        {hud.streak >= 2 && <div className="streak-chip" key={hud.streak}><Flame size={15} /> Combo x{Math.min(hud.streak, 5)}</div>}
        <div className="bubble-canvas-wrap"><canvas ref={canvas} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => engine.current?.cancelAim()} aria-label="Drag to aim and release to shoot" /></div>
        <button className="swap-bubbles" onClick={() => engine.current?.swap()} disabled={paused || Boolean(end)} aria-label="Switch current and next bubbles" title="Switch bubbles"><ArrowLeftRight size={20} /></button>
        <button className="bomb-booster" onClick={useBooster} disabled={paused || Boolean(end) || save.bombs < 1} aria-label="Use a bomb booster"><Bomb size={20} /><b>{save.bombs}</b></button>
        {paused && !end && <div className="bubble-overlay"><div className="result-card"><span className="modal-icon">☁️</span><h2>Paused</h2><p>Your bubbles are right where you left them.</p><Button className="bubble-primary" onClick={() => setPaused(false)}><Play size={17} fill="currentColor" /> Keep playing</Button><button className="setting-toggle in-game" onClick={() => setSave(prev => ({ ...prev, sound: !prev.sound }))}><span>{save.sound ? <Volume2 size={18} /> : <VolumeX size={18} />} Sound effects</span><strong>{save.sound ? 'ON' : 'OFF'}</strong></button><AdPrivacyControls /><Button variant="ghost" className="quiet-button" onClick={() => startLevel(level)}><RotateCcw size={15} /> Restart level</Button><Button variant="ghost" className="quiet-button" onClick={() => setScreen('menu')}>Leave level</Button></div></div>}
        {end?.won && <div className="bubble-overlay"><div className="result-card"><span className="modal-icon">🎉</span><p className="result-kicker">LEVEL {String(level).padStart(2, '0')} COMPLETE</p><h2>Beautifully done!</h2><div className="star-row">{[1, 2, 3].map(n => <Star key={n} size={34} fill={n <= end.stars ? 'currentColor' : 'transparent'} className={n <= end.stars ? 'earned' : ''} />)}</div><div className="result-score"><small>{newBest ? 'NEW BEST!' : 'YOUR SCORE'}</small><strong>{end.score.toLocaleString()}</strong>{end.bonus > 0 && <span className="bonus-chip">+{end.bonus} bonus · {end.movesLeft} moves left</span>}</div><Button className="bubble-primary" onClick={() => void nextLevel()}>Next level <ChevronRight size={18} /></Button><Button variant="ghost" className="quiet-button" onClick={() => setScreen('levels')}>Level selection</Button></div></div>}
        {end && !end.won && <div className="bubble-overlay"><div className="result-card"><span className="modal-icon">🌱</span><p className="result-kicker">{end.reason === 'danger' ? 'THE GARDEN IS FULL' : 'OUT OF MOVES'}</p><h2>So close, keep going!</h2><p>You scored {end.score.toLocaleString()}. A fresh shot is ready.</p>{canRevive && <Button className="bubble-primary revive-button" disabled={reviveBusy} onClick={() => void reviveWithAd()}>{reviveBusy ? 'Loading…' : '▶ Watch ad: +5 moves'}</Button>}<Button className="bubble-primary" onClick={() => startLevel(level)}><RotateCcw size={17} /> Retry level</Button><Button variant="ghost" className="quiet-button" onClick={() => setScreen('levels')}>Level selection</Button></div></div>}
      </>}
    </section>
    {Capacitor.getPlatform() === 'web' && screen === 'menu' && <p className="web-note">A cheerful little game for your break</p>}
  </main>;
}
