export const SIZE = 8;
export const COLORS = ['purple', 'pink', 'teal', 'gold', 'blue'] as const;
export type Color = typeof COLORS[number];
export type Board = (Color | null)[][];
export type Piece = { id: string; cells: [number, number][]; color: Color };
export type Game = { board: Board; pieces: (Piece | null)[]; score: number; lines: number; level: number; moves: number; revived: boolean; completionCounted?: boolean };
const SHAPES: [number, number][][] = [
  [[0,0]], [[0,0],[0,1]], [[0,0],[1,0]], [[0,0],[0,1],[0,2]],
  [[0,0],[1,0],[2,0]], [[0,0],[0,1],[1,0],[1,1]],
  [[0,0],[1,0],[1,1]], [[0,1],[1,0],[1,1]],
  [[0,0],[0,1],[0,2],[1,1]], [[0,0],[1,0],[2,0],[2,1]],
  [[0,0],[0,1],[0,2],[0,3]], [[0,0],[1,0],[2,0],[3,0]],
  [[0,0],[0,1],[1,1],[1,2]],
];
export const emptyBoard = (): Board => Array.from({ length: SIZE }, () => Array<Color | null>(SIZE).fill(null));
export function makePieces(): Piece[] {
  return Array.from({length: 3}, () => ({id: crypto.randomUUID(), cells: SHAPES[Math.floor(Math.random()*SHAPES.length)], color: COLORS[Math.floor(Math.random()*COLORS.length)]}));
}
export function newGame(level = 1): Game {
  const board = emptyBoard();
  board[7] = ['purple','purple','pink','pink','teal','teal',null,null];
  board[6] = ['purple',null,null,'pink',null,'teal',null,null];
  board[5][0] = 'purple';
  return { board, pieces: [{id: crypto.randomUUID(), cells: [[0,0],[0,1]], color:'gold'}, {id:crypto.randomUUID(), cells:[[0,0],[1,0],[1,1]], color:'pink'}, {id:crypto.randomUUID(), cells:[[0,0],[0,1],[0,2]], color:'teal'}], score: 0, lines: 0, level, moves: 0, revived: false };
}
export function fits(board: Board, piece: Piece, row: number, col: number) {
  return piece.cells.every(([r,c]) => row+r >= 0 && row+r < SIZE && col+c >= 0 && col+c < SIZE && !board[row+r][col+c]);
}
export function canPlay(game: Game) {
  return game.pieces.some(piece => piece && game.board.some((row,r) => row.some((_,c) => fits(game.board,piece,r,c))));
}
export function place(game: Game, index: number, row: number, col: number): Game | null {
  const staged = stagePlace(game, index, row, col);
  return staged?.final ?? null;
}
export type StagedPlacement = { filled: Game; final: Game; rows: number[]; cols: number[] };
export function stagePlace(game: Game, index: number, row: number, col: number): StagedPlacement | null {
  const piece = game.pieces[index];
  if (!piece || !fits(game.board,piece,row,col)) return null;
  const board = game.board.map(line => [...line]);
  piece.cells.forEach(([r,c]) => { board[row+r][col+c] = piece.color; });
  const rows = board.flatMap((line,r) => line.every(Boolean) ? [r] : []);
  const cols = Array.from({length:SIZE},(_,c)=>c).filter(c => board.every(line => line[c]));
  const clearedBoard = board.map(line => [...line]);
  rows.forEach(r => clearedBoard[r].fill(null));
  cols.forEach(c => clearedBoard.forEach(line => { line[c] = null; }));
  const pieces = game.pieces.map((p,i) => i === index ? null : p);
  const cleared = rows.length + cols.length;
  const final: Game = { ...game, board: clearedBoard, pieces: pieces.every(p => !p) ? makePieces() : pieces, score: game.score + piece.cells.length*10 + cleared*100 + Math.max(0,cleared-1)*50, lines: game.lines+cleared, moves: game.moves+1 };
  return { filled: cleared ? { ...game, board, pieces, moves: game.moves+1 } : final, final, rows, cols };
}
export const comboLabel = (lines: number) => lines >= 3 ? 'Perfect!' : lines === 2 ? 'Combo' : '';
export const goal = (level: number) => ({score: 300 + level*150, lines: 2+Math.floor(level/3)});
export const won = (game: Game) => game.score >= goal(game.level).score && game.lines >= goal(game.level).lines;
export function revive(game: Game): Game {
  return {...game, board:emptyBoard(), pieces:makePieces(), revived:true};
}
export type Save = { game: Game; unlocked: number; best: number; sound: boolean; music: boolean; haptics: boolean; completed: number[]; puzzlesCompleted: number; lastInterstitialAt: number };
export function readSave(): Save {
  const fresh: Save = {game:newGame(),unlocked:1,best:0,sound:true,music:true,haptics:true,completed:[],puzzlesCompleted:0,lastInterstitialAt:0};
  try {
    const raw = JSON.parse(localStorage.getItem('blockbloom-v1') || 'null');
    if (raw && Number.isInteger(raw.game?.level) && raw.game.level >= 1 && raw.game.level <= 12 && Array.isArray(raw.game.board) && raw.game.board.length === SIZE && raw.game.board.every((row: unknown) => Array.isArray(row) && row.length === SIZE && row.every(cell => cell === null || COLORS.includes(cell))) && Array.isArray(raw.game.pieces) && raw.game.pieces.length === 3 && raw.game.pieces.every((p: Piece | null) => p === null || (COLORS.includes(p.color) && Array.isArray(p.cells) && p.cells.length > 0 && p.cells.every(cell => Array.isArray(cell) && cell.length === 2 && cell.every(n => Number.isInteger(n) && n >= 0 && n < SIZE)))) && typeof raw.game.score === 'number' && typeof raw.game.lines === 'number' && Array.isArray(raw.completed)) {
      const puzzlesCompleted=Number.isInteger(raw.puzzlesCompleted)&&raw.puzzlesCompleted>=0?raw.puzzlesCompleted:0;
      return {...fresh,...raw,
        game:{...raw.game,completionCounted:raw.game.completionCounted??won(raw.game)},
        music:typeof raw.music==='boolean'?raw.music:true,
        puzzlesCompleted,
        lastInterstitialAt:Number.isInteger(raw.lastInterstitialAt)&&raw.lastInterstitialAt>=0&&raw.lastInterstitialAt<=puzzlesCompleted?raw.lastInterstitialAt:0,
      };
    }
  } catch { /* Device storage can be unavailable in private browsing. */ }
  return fresh;
}
