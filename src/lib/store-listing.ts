import { canPlay, Game, newGame, place, Save, SIZE, won } from '@/lib/puzzle';

export const STORE_TITLE = 'Bubble Aura: Pop & Match';
export const SHORT_DESCRIPTION = 'Aim, pop and chain colorful bubbles across 60 levels with bombs and rainbows.';
export const FULL_DESCRIPTION = `Aim. Pop. Chain. Your next favorite bubble break.

Bubble Aura: Pop & Match is a colorful bubble shooter made for quick sessions and satisfying combos. Aim, shoot and match bubbles to clear the board before you run out of moves.

AIM AND POP
Line up a shot, match colors and pop whole clusters at once. Drop big groups of bubbles for chain reactions and a higher score.

60 LEVELS TO EXPLORE
Move through colorful worlds with new layouts and goals. Earn up to three stars on every level and replay any unlocked level to beat your best.

BOMBS AND RAINBOWS
Light up bombs and rainbow bubbles for explosive combos. Collect a free daily gift to keep a bomb ready for the toughest levels.

LITTLE DETAILS THAT MAKE A DIFFERENCE
• Smooth, easy one-thumb aiming.
• Bright, cheerful bubbles and effects.
• Optional sound and vibration feedback.
• Progress and best scores saved locally on your device.
• No account required.

OUT OF MOVES?
Restart and try a new approach. When a rewarded video is available, you can choose to watch it for bonus moves.

Core play works offline. Bubble Aura contains ads (Google AdMob): a banner, occasional full-screen ads between levels, and optional rewarded videos. Ads need an internet connection and may not always be available. Progress is stored on your device, not in a cloud account.

Download Bubble Aura and start popping.`;

function advance(game: Game, moves: number): Game {
  let current = game;
  for (let move = 0; move < moves && !won(current); move++) {
    let next: Game | null = null;
    let rank = -Infinity;
    for (let index = 0; index < current.pieces.length; index++) {
      if (!current.pieces[index]) continue;
      for (let row = SIZE - 1; row >= 0; row--) {
        for (let col = 0; col < SIZE; col++) {
          const candidate = place(current, index, row, col);
          if (!candidate || won(candidate) || !canPlay(candidate)) continue;
          const value = (candidate.lines - current.lines) * 1000 + row * 10 - col;
          if (value > rank) { rank = value; next = candidate; }
        }
      }
    }
    if (!next) break;
    current = next;
  }
  return current;
}

export function createStoreScenes(): Save[] {
  const opening = newGame();
  const clear = place(opening, 0, 7, 6)!;
  const games = [advance(opening, 5), clear, advance(newGame(3), 7), advance(newGame(), 9)];
  return games.map(game => ({ game, unlocked: game.level, best: game.score, sound: true, music: true, haptics: true, completed: Array.from({length: game.level - 1}, (_, i) => i + 1), puzzlesCompleted: game.level - 1, lastInterstitialAt: 0 }));
}

export const SCREENSHOT_COPY = [
  { title: 'Your next little\npuzzle obsession.', subtitle: 'Colorful blocks. Clever moves. Satisfying clears.', tag: 'PLACE. CLEAR. POP!', background: '#f5f0ff', ink: '#4b2e71', accent: '#7c3aed', decoration: '#e4d5ff' },
  { title: 'Make a line.\nMake some space.', subtitle: 'Fill rows and columns. Keep the possibilities open.', tag: 'SATISFYING LINE CLEARS', background: '#e9faf4', ink: '#155f50', accent: '#167c66', decoration: '#c3efdf' },
  { title: 'Small goals.\nBig satisfaction.', subtitle: '12 levels. Two goals. One move at a time.', tag: 'UNLOCK YOUR NEXT CHALLENGE', background: '#fff4df', ink: '#754619', accent: '#945416', decoration: '#ffe5ae' },
  { title: 'No timer.\nJust your flow.', subtitle: 'Take a breath. Plan a move. Enjoy the clear.', tag: 'PLAY AT YOUR OWN PACE', background: '#ffedf3', ink: '#7c2c50', accent: '#b72c65', decoration: '#ffd0e1' },
] as const;
