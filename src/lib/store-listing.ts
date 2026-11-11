import { canPlay, Game, newGame, place, Save, SIZE, won } from '@/lib/puzzle';

export const STORE_TITLE = 'Cubellio: Block Puzzle';
export const SHORT_DESCRIPTION = 'Place colorful blocks, clear lines, and unwind with relaxing puzzle challenges.';
export const FULL_DESCRIPTION = `Small blocks. Satisfying clears. Your next favorite puzzle break.

Meet Cubellio, a colorful block puzzle game that turns a little free time into a rewarding challenge. Place shapes on an 8×8 board, fill rows and columns, and make room for your next move. Easy to learn, with plenty of room for clever thinking.

PLACE. CLEAR. POP!
Drag a block onto the board, or tap a piece and then tap a square. Complete a row or column to clear it. Clear several lines in one move for a satisfying score bonus. Every placement matters: blocks cannot be rotated, so planning ahead is part of the fun.

12 LEVELS TO EXPLORE
Each level gives you two goals: reach the target score and clear the required number of lines. Complete both to unlock your next challenge, then return to unlocked levels whenever you feel like playing again.

PLAY AT YOUR OWN PACE
No countdown. No rushing your next move. Enjoy a relaxed puzzle session during a quiet break or settle in and challenge your best score.

LITTLE DETAILS THAT MAKE A DIFFERENCE
• Bright, colorful blocks and a compact, easy-to-read board.
• Drag-and-drop or tap-to-place controls.
• Bonus points for clearing multiple lines at once.
• One-move undo to rethink your latest placement.
• Pause and resume your current puzzle.
• Optional sound and haptic feedback on supported devices.
• Progress and best score saved locally on your device.
• No account required.

OUT OF SPACE? YOU HAVE OPTIONS
Restart and try a new approach. When a rewarded video is available, you can choose to watch it to earn one revive per run, clearing the board while keeping your score and line progress.

Core puzzle play works offline. Advertising and rewarded videos need an internet connection and may not always be available. Cubellio contains ads. Progress is stored on your device, not in a cloud account.

Make a little space for a little fun. Download Cubellio and find your next satisfying clear.`;

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
  return games.map(game => ({ game, unlocked: game.level, best: game.score, sound: true, haptics: true, completed: Array.from({length: game.level - 1}, (_, i) => i + 1), puzzlesCompleted: game.level - 1, lastInterstitialAt: 0 }));
}

export const SCREENSHOT_COPY = [
  { title: 'Your next little\npuzzle obsession.', subtitle: 'Colorful blocks. Clever moves. Satisfying clears.', tag: 'PLACE. CLEAR. POP!', background: '#f5f0ff', ink: '#4b2e71', accent: '#7c3aed', decoration: '#e4d5ff' },
  { title: 'Make a line.\nMake some space.', subtitle: 'Fill rows and columns. Keep the possibilities open.', tag: 'SATISFYING LINE CLEARS', background: '#e9faf4', ink: '#155f50', accent: '#167c66', decoration: '#c3efdf' },
  { title: 'Small goals.\nBig satisfaction.', subtitle: '12 levels. Two goals. One move at a time.', tag: 'UNLOCK YOUR NEXT CHALLENGE', background: '#fff4df', ink: '#754619', accent: '#945416', decoration: '#ffe5ae' },
  { title: 'No timer.\nJust your flow.', subtitle: 'Take a breath. Plan a move. Enjoy the clear.', tag: 'PLAY AT YOUR OWN PACE', background: '#ffedf3', ink: '#7c2c50', accent: '#b72c65', decoration: '#ffd0e1' },
] as const;
