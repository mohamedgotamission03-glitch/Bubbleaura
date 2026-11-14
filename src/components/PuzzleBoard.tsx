import { useRef, useState } from 'react';
import { Board, fits, Piece, SIZE } from '@/lib/puzzle';
import { BLOCK_COLORS } from '@/lib/block-colors';
import { MousePointer2 } from 'lucide-react';

type Props = {
  board: Board;
  pieces: (Piece | null)[];
  onPlace: (index: number, row: number, col: number) => void;
  disabled: boolean;
  highlightRows?: number[];
  highlightCols?: number[];
  combo?: { id: number; label: string; points: number; lines?: number; streak?: number } | null;
};

const DRAG_LIFT = 64;
const DRAG_SCALE = 1.3;

export function PieceShape({ piece }: { piece: Piece }) {
  const height = Math.max(...piece.cells.map(cell => cell[0])) + 1;
  const width = Math.max(...piece.cells.map(cell => cell[1])) + 1;
  return <span className={`piece-shape ${height > 3 ? 'piece-small' : ''}`} style={{ gridTemplateColumns: `repeat(${width}, 1fr)`, gridTemplateRows: `repeat(${height}, 1fr)` }}>
    {Array.from({ length: height * width }, (_, index) => {
      const filled = piece.cells.some(([row, col]) => row === Math.floor(index / width) && col === index % width);
      return <span key={index} className={filled ? 'puzzle-block' : 'invisible'} style={filled ? { backgroundColor: BLOCK_COLORS[piece.color], opacity: 1 } : undefined} />;
    })}
  </span>;
}

export default function PuzzleBoard({ board, pieces, onPlace, disabled, highlightRows = [], highlightCols = [], combo = null }: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const start = useRef({ x: 0, y: 0 });
  const grabOffset = useRef({ x: 0, y: 0 });
  const moved = useRef(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [preview, setPreview] = useState<{ row: number; col: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const piece = selected !== null ? pieces[selected] : null;
  const valid = piece && preview && fits(board, piece, preview.row, preview.col);

  function position(x: number, y: number) {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect || x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) return null;
    const gap = 2;
    const cellWidth = (rect.width - (SIZE - 1) * gap) / SIZE;
    const cellHeight = (rect.height - (SIZE - 1) * gap) / SIZE;
    return {
      row: Math.min(SIZE - 1, Math.floor((y - rect.top) / (cellHeight + gap))),
      col: Math.min(SIZE - 1, Math.floor((x - rect.left) / (cellWidth + gap))),
    };
  }

  function dragTarget(x: number, y: number) {
    return position(x - grabOffset.current.x, y - grabOffset.current.y - DRAG_LIFT);
  }

  function drop(index: number, row: number, col: number) {
    if (!disabled && pieces[index] && fits(board, pieces[index]!, row, col)) {
      onPlace(index, row, col);
      setSelected(null);
      setPreview(null);
    }
  }

  return <>
    <div className={`board-shell ${highlightRows.length || highlightCols.length ? 'clearing' : ''}`}>
      <div ref={boardRef} className="puzzle-board" aria-label="8 by 8 puzzle board" onPointerLeave={() => { if (!dragging) setPreview(null); }}>
        {board.flatMap((row, rowIndex) => row.map((cell, colIndex) => {
          const ghost = piece && preview && piece.cells.some(([pieceRow, pieceCol]) => pieceRow + preview.row === rowIndex && pieceCol + preview.col === colIndex);
          const clearing = (highlightRows.includes(rowIndex) || highlightCols.includes(colIndex)) && Boolean(cell);
          const color = cell ? BLOCK_COLORS[cell] : ghost && valid ? BLOCK_COLORS[piece!.color] : ghost ? '#ffb2c6' : undefined;
          return <button
            key={`${rowIndex}-${colIndex}`}
            disabled={disabled}
            style={color ? { backgroundColor: color, opacity: 1 } : undefined}
            aria-label={`Row ${rowIndex + 1}, column ${colIndex + 1}, ${cell ? `${cell} block` : 'empty'}`}
            onPointerEnter={() => { if (piece && !dragging) setPreview({ row: rowIndex, col: colIndex }); }}
            onFocus={() => { if (piece) setPreview({ row: rowIndex, col: colIndex }); }}
            onClick={() => { if (selected !== null) drop(selected, rowIndex, colIndex); }}
            className={`board-cell ${cell ? 'puzzle-block' : ''} ${ghost && !cell ? valid ? 'ghost' : 'ghost-invalid' : ''} ${clearing ? 'clearing' : ''}`}
          />;
        }))}
      </div>
      {highlightRows.map((row, index) => <div key={`row-${row}`} className="line-beam" style={{ top: `calc(8px + ${row} * (100% - 16px) / 8)`, height: 'calc((100% - 16px) / 8)' }}>{index === 0 && <span>+{combo?.points ?? 0}</span>}</div>)}
      {highlightCols.map(col => <div key={`col-${col}`} className="line-beam column-beam" style={{ left: `calc(8px + ${col} * (100% - 16px) / 8)`, width: 'calc((100% - 16px) / 8)', top: '8px', height: 'calc(100% - 16px)' }} />)}
      {combo?.label && <div key={combo.id} className={`combo-burst combo-tone-${Math.min(combo.streak ?? combo.lines ?? 1, 4)}`} aria-live="polite"><strong>{combo.streak && combo.streak > 1 ? `Combo ${combo.streak}` : combo.label}</strong>{(combo.streak ?? 0) > 1 && <em>{combo.label}</em>}</div>}
    </div>
    <p className="placement-hint flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#e7ecff]" aria-live="polite"><MousePointer2 size={12} />{piece ? 'Now tap the board to place your block' : 'Drag a block, or tap it then tap the board'}</p>
    <div className="piece-tray">
      {pieces.map((currentPiece, index) => <button
        key={currentPiece?.id || `empty-${index}`}
        disabled={!currentPiece || disabled}
        aria-label={currentPiece ? `Select ${currentPiece.color} piece, ${currentPiece.cells.length} blocks` : 'Piece used'}
        aria-pressed={selected === index}
        className={`piece-slot ${selected === index && currentPiece ? 'piece-selected' : ''} ${dragging && selected === index ? 'piece-lifting' : ''}`}
        onPointerDown={event => {
          if (!currentPiece || disabled) return;
          const shape = event.currentTarget.querySelector('.piece-shape')?.getBoundingClientRect();
          grabOffset.current = shape ? {
            x: Math.max(0, Math.min(shape.width, event.clientX - shape.left)),
            y: Math.max(0, Math.min(shape.height, event.clientY - shape.top)),
          } : { x: 0, y: 0 };
          event.currentTarget.setPointerCapture(event.pointerId);
          start.current = { x: event.clientX, y: event.clientY };
          moved.current = false;
          setSelected(index);
        }}
        onPointerMove={event => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          if (Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 8) {
            moved.current = true;
            setDragging(true);
            setPointer({ x: event.clientX, y: event.clientY });
            setPreview(dragTarget(event.clientX, event.clientY));
          }
        }}
        onPointerUp={event => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          if (moved.current) {
            const target = dragTarget(event.clientX, event.clientY);
            if (target) drop(index, target.row, target.col);
          }
          setDragging(false);
          setPointer(null);
          setPreview(null);
        }}
        onPointerCancel={() => { setDragging(false); setPointer(null); setPreview(null); }}
        onClick={event => { if (event.detail === 0) setSelected(index); }}
      >
        {currentPiece ? <PieceShape piece={currentPiece} /> : <span className="text-xl font-bold text-[#d7defa]">✓</span>}
      </button>)}
    </div>
    {dragging && piece && pointer && <div
      className="drag-piece"
      style={{
        left: pointer.x - grabOffset.current.x * DRAG_SCALE,
        top: pointer.y - DRAG_LIFT - grabOffset.current.y * DRAG_SCALE,
      }}
    ><PieceShape piece={piece} /></div>}
  </>;
}
