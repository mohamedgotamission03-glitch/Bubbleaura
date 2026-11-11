import { useRef, useState } from 'react';
import { Board, fits, Piece, SIZE } from '@/lib/puzzle';
import { BLOCK_COLORS } from '@/lib/block-colors';
import { MousePointer2 } from 'lucide-react';

type Props = { board: Board; pieces: (Piece | null)[]; onPlace: (index:number,row:number,col:number)=>void; disabled: boolean; highlightRows?: number[]; highlightCols?: number[]; combo?: { id: number; label: string; points: number; lines?: number } | null };
export function PieceShape({piece}: {piece:Piece}) {
  const height = Math.max(...piece.cells.map(c=>c[0]))+1;
  const width = Math.max(...piece.cells.map(c=>c[1]))+1;
  return <span className={`piece-shape ${height > 3 ? 'piece-small' : ''}`} style={{gridTemplateColumns:`repeat(${width}, 1fr)`,gridTemplateRows:`repeat(${height}, 1fr)`}}>{Array.from({length:height*width},(_,i)=> {
    const filled=piece.cells.some(([r,c])=>r===Math.floor(i/width)&&c===i%width);
    return <span key={i} className={filled?'puzzle-block':'invisible'} style={filled?{backgroundColor:BLOCK_COLORS[piece.color],opacity:1}:undefined}/>;
  })}</span>;
}
export default function PuzzleBoard({board,pieces,onPlace,disabled,highlightRows=[],highlightCols=[],combo=null}: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const start = useRef({x:0,y:0});
  const moved = useRef(false);
  const [selected,setSelected] = useState<number|null>(null);
  const [preview,setPreview] = useState<{row:number;col:number}|null>(null);
  const [dragging,setDragging] = useState(false);
  const [pointer,setPointer] = useState<{x:number;y:number}|null>(null);
  const piece = selected !== null ? pieces[selected] : null;
  const valid = piece && preview && fits(board,piece,preview.row,preview.col);
  function position(x:number,y:number,lift=0) {
    const rect=boardRef.current?.getBoundingClientRect();
    const py=y-lift;
    if (!rect || x<rect.left || x>=rect.right || py<rect.top || py>=rect.bottom) return null;
    return {row:Math.min(7,Math.floor((py-rect.top)/rect.height*SIZE)),col:Math.min(7,Math.floor((x-rect.left)/rect.width*SIZE))};
  }
  function drop(index:number,row:number,col:number) {
    if (!disabled && pieces[index] && fits(board,pieces[index]!,row,col)) {
      onPlace(index,row,col); setSelected(null);setPreview(null);
    }
  }
  return <>
    <div className={`board-shell ${highlightRows.length || highlightCols.length ? 'clearing' : ''}`}>
      <div ref={boardRef} className="puzzle-board" aria-label="8 by 8 puzzle board" onPointerLeave={()=>{if(!dragging)setPreview(null);}}>
        {board.flatMap((row,r)=>row.map((cell,c)=> {
          const ghost=piece && preview && piece.cells.some(([pr,pc])=>pr+preview.row===r&&pc+preview.col===c);
          const clearing=(highlightRows.includes(r)||highlightCols.includes(c)) && Boolean(cell);
          const color=cell?BLOCK_COLORS[cell]:ghost&&valid?BLOCK_COLORS[piece!.color]:ghost?'#ffb2c6':undefined;
          return <button key={`${r}-${c}`} disabled={disabled} style={color?{backgroundColor:color,opacity:1}:undefined} aria-label={`Row ${r+1}, column ${c+1}, ${cell ? `${cell} block` : 'empty'}`} onPointerEnter={()=>{if(piece&&!dragging)setPreview({row:r,col:c});}} onFocus={()=>{if(piece)setPreview({row:r,col:c});}} onClick={()=>{if(selected!==null)drop(selected,r,c);}} className={`board-cell ${cell ? 'puzzle-block' : ''} ${ghost&&!cell ? valid ? 'ghost' : 'ghost-invalid' : ''} ${clearing ? 'clearing' : ''}`} />;
        }))}
      </div>
      {combo&&<div key={combo.id} className={`combo-burst combo-tone-${Math.min(combo.lines??1,4)}`} aria-live="polite"><strong>{combo.label}</strong><span>+{combo.points}</span>{[1,2,3,4,5,6,7,8].map(spark=><i key={spark} className={`spark spark-${spark}`}/>)}</div>}
    </div>
    <p className="placement-hint flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#8a5a28]" aria-live="polite"><MousePointer2 size={12}/>{piece ? 'Now tap the board to place your block' : 'Drag a block, or tap it then tap the board'}</p>
    <div className="piece-tray">
      {pieces.map((p,index)=> <button key={p?.id || `empty-${index}`} disabled={!p||disabled} aria-label={p ? `Select ${p.color} piece, ${p.cells.length} blocks` : 'Piece used'} aria-pressed={selected===index} className={`piece-slot ${selected===index&&p ? 'piece-selected' : ''} ${dragging&&selected===index ? 'piece-lifting' : ''}`} onPointerDown={e=>{if(!p||disabled)return; e.currentTarget.setPointerCapture(e.pointerId); start.current={x:e.clientX,y:e.clientY};moved.current=false;setSelected(index);}} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId)){if(Math.hypot(e.clientX-start.current.x,e.clientY-start.current.y)>8){moved.current=true;setDragging(true);setPointer({x:e.clientX,y:e.clientY});setPreview(position(e.clientX,e.clientY,78));}}}} onPointerUp={e=>{e.currentTarget.hasPointerCapture(e.pointerId)&&e.currentTarget.releasePointerCapture(e.pointerId);if(moved.current){const target=position(e.clientX,e.clientY,78);if(target)drop(index,target.row,target.col);}setDragging(false);setPointer(null);setPreview(null);}} onPointerCancel={()=>{setDragging(false);setPointer(null);setPreview(null);}} onClick={e=>{if(e.detail===0)setSelected(index);}}>
        {p ? <PieceShape piece={p}/> : <span className="text-xl font-bold text-[#80629a]">✓</span>}
      </button>)}
    </div>
    {dragging&&piece&&pointer&&<div className="drag-piece" style={{left:pointer.x,top:pointer.y-78}}><PieceShape piece={piece}/></div>}
  </>;
}
