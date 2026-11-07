import { ChevronRight, CircleHelp, Crown, Flag, Layers3, Pause, RotateCcw, Settings2, Star, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PuzzleBoard from '@/components/PuzzleBoard';
import { goal, Save } from '@/lib/puzzle';
import { nativeAdsAvailable } from '@/lib/ads';

type Props = {
  save: Save;
  disabled: boolean;
  undoAvailable: boolean;
  bump: number;
  onPlace: (index: number, row: number, col: number) => void;
  onLevels: () => void;
  onSettings: () => void;
  onHelp: () => void;
  onPause: () => void;
  onUndo: () => void;
  onRestart: () => void;
};

export default function GameScreen({ save, disabled, undoAvailable, bump, onPlace, onLevels, onSettings, onHelp, onPause, onUndo, onRestart }: Props) {
  const { game } = save;
  const target = goal(game.level);
  return <div className="phone-game mx-auto flex w-full max-w-[400px] flex-col">
    <header className="game-header flex shrink-0 items-center justify-between px-4">
      <div className="flex items-center gap-2.5">
        <span className="bloom-logo" aria-hidden="true"><i/><i/><i/><i/></span>
        <h1 className="brand-text">Block<span>Bloom</span></h1>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="game-icon" aria-label="How to play" onClick={onHelp}><CircleHelp size={19}/></Button>
        <Button variant="ghost" size="icon" className="game-icon" aria-label="Settings" onClick={onSettings}><Settings2 size={19}/></Button>
      </div>
    </header>
    <main className="play-area flex flex-col gap-2 px-4" aria-label="BlockBloom game">
      <div className="score-bar flex items-center justify-between gap-3">
        <button className="level-badge" onClick={onLevels}><Flag size={13} fill="currentColor"/> Level {game.level}<ChevronRight size={13}/></button>
        <div className="text-center">
          <p className="eyebrow">SCORE</p>
          <p key={bump} className={`score-number ${bump ? 'score-pop' : ''}`} aria-live="polite">{game.score.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="flex items-center justify-end gap-1 text-[10px] font-extrabold text-[#71558f]"><Crown size={13} className="text-[#ad7510]"/> BEST</p>
          <p className="text-base font-extrabold text-[#50326c]">{save.best.toLocaleString()}</p>
        </div>
      </div>
      <div className="compact-goals grid grid-cols-2 gap-2" aria-label="Level goals">
        <div className="compact-goal"><Star size={16} className="text-[#945017]"/><span>Points <strong>{Math.min(game.score,target.score)} / {target.score}</strong></span></div>
        <div className="compact-goal"><Layers3 size={16} className="text-[#087d70]"/><span>Lines <strong>{Math.min(game.lines,target.lines)} / {target.lines}</strong></span></div>
      </div>
      <PuzzleBoard board={game.board} pieces={game.pieces} onPlace={onPlace} disabled={disabled}/>
      <div className="game-tools grid grid-cols-3 gap-2">
        <Button variant="ghost" className="tool-button" disabled={!undoAvailable||disabled} onClick={onUndo}><Undo2 size={18}/><span>Undo</span></Button>
        <Button variant="ghost" className="tool-button" onClick={onPause}><Pause size={17} fill="currentColor"/><span>Pause</span></Button>
        <Button variant="ghost" className="tool-button" onClick={onRestart}><RotateCcw size={17}/><span>Restart</span></Button>
      </div>
    </main>
    <div className="ad-dock flex shrink-0 items-end justify-center px-4" aria-label="Advertisement area">
      <div className="banner-slot"><span className="ad-label">AD</span>{!nativeAdsAvailable()&&<span>Banner preview · 320 × 50</span>}</div>
    </div>
  </div>;
}
