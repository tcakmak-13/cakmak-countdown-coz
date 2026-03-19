import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Pen, Eraser, Undo2, Trash2, GripVertical } from 'lucide-react';

type Tool = 'pen' | 'eraser';
type PenSize = 4 | 8 | 14;
type EraserSize = 16 | 32 | 56;
type DockEdge = 'top' | 'bottom' | 'left' | 'right';

const COLORS = [
  { name: 'Turuncu', value: '#FF5A01', alpha: 1 },
  { name: 'Kırmızı', value: '#EF4444', alpha: 1 },
  { name: 'Mavi', value: '#3B82F6', alpha: 1 },
  { name: 'Yeşil', value: '#22C55E', alpha: 1 },
  { name: 'Beyaz', value: '#FFFFFF', alpha: 1 },
  { name: 'Fosforlu', value: '#FACC15', alpha: 0.5 },
  { name: 'Siyah', value: '#000000', alpha: 1 },
];

const PEN_SIZES: { label: string; value: PenSize; dot: number }[] = [
  { label: 'İnce', value: 4, dot: 8 },
  { label: 'Orta', value: 8, dot: 13 },
  { label: 'Kalın', value: 14, dot: 18 },
];

const ERASER_SIZES: { label: string; value: EraserSize; dot: number }[] = [
  { label: 'Küçük', value: 16, dot: 12 },
  { label: 'Orta', value: 32, dot: 18 },
  { label: 'Büyük', value: 56, dot: 24 },
];

interface DockableToolbarProps {
  tool: Tool;
  setTool: (t: Tool) => void;
  penSize: PenSize;
  setPenSize: (s: PenSize) => void;
  eraserSize: EraserSize;
  setEraserSize: (s: EraserSize) => void;
  colorIndex: number;
  setColorIndex: (i: number) => void;
  onUndo: () => void;
  onClear: () => void;
}

const EDGE_MARGIN = 8;

export default function DockableToolbar({
  tool, setTool, penSize, setPenSize, eraserSize, setEraserSize,
  colorIndex, setColorIndex, onUndo, onClear,
}: DockableToolbarProps) {
  const [dockedEdge, setDockedEdge] = useState<DockEdge>('bottom');
  const [isDragging, setIsDragging] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  const isVertical = dockedEdge === 'left' || dockedEdge === 'right';

  // Calculate docked position - full edge coverage
  const getDockedStyle = useCallback((): React.CSSProperties => {
    const base: React.CSSProperties = { position: 'fixed', zIndex: 50, transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4,0,0.2,1)' };
    switch (dockedEdge) {
      case 'bottom':
        return { ...base, bottom: EDGE_MARGIN, left: '50%', transform: 'translateX(-50%)' };
      case 'top':
        return { ...base, top: EDGE_MARGIN + 48, left: '50%', transform: 'translateX(-50%)' };
      case 'left':
        return { ...base, left: EDGE_MARGIN, top: '50%', transform: 'translateY(-50%)' };
      case 'right':
        return { ...base, right: EDGE_MARGIN, top: '50%', transform: 'translateY(-50%)' };
    }
  }, [dockedEdge, isDragging]);

  const isButtonElement = (el: HTMLElement): boolean => {
    if (el.tagName === 'BUTTON' || el.tagName === 'SVG' || el.tagName === 'path' || el.tagName === 'line' || el.tagName === 'polyline' || el.tagName === 'circle') return true;
    if (el.closest('button')) return true;
    return false;
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    // Allow drag from any non-button area (empty space or grip handle)
    if (isButtonElement(target) && !target.closest('[data-drag-handle]')) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    dragStartRef.current = { mx: e.clientX, my: e.clientY, px: rect.left, py: rect.top };
    setPos({ x: rect.left, y: rect.top });
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    e.preventDefault();
    const dx = e.clientX - dragStartRef.current.mx;
    const dy = e.clientY - dragStartRef.current.my;
    setPos({
      x: dragStartRef.current.px + dx,
      y: dragStartRef.current.py + dy,
    });
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    dragStartRef.current = null;

    const panel = panelRef.current;
    if (!panel || !pos) { setPos(null); return; }

    const rect = panel.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Determine closest edge
    const distances: [DockEdge, number][] = [
      ['top', cy],
      ['bottom', vh - cy],
      ['left', cx],
      ['right', vw - cx],
    ];
    distances.sort((a, b) => a[1] - b[1]);
    
    setDockedEdge(distances[0][0]);
    setPos(null);
  }, [isDragging, pos]);

  const freeStyle: React.CSSProperties | undefined = pos ? {
    position: 'fixed',
    left: pos.x,
    top: pos.y,
    zIndex: 50,
    transition: 'none',
  } : undefined;

  const containerClass = isVertical && !pos
    ? 'flex flex-col items-center gap-1.5 bg-card/90 backdrop-blur-xl border border-border rounded-2xl px-2 py-3 shadow-2xl'
    : 'flex items-center gap-1.5 bg-card/90 backdrop-blur-xl border border-border rounded-2xl px-3 py-2 shadow-2xl max-w-[95vw] overflow-x-auto scrollbar-hide';

  const dividerClass = isVertical && !pos ? 'w-6 h-px bg-border' : 'w-px h-6 bg-border mx-0.5';

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      style={freeStyle || getDockedStyle()}
      className={containerClass}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Drag handle */}
      <div
        data-drag-handle
        className="flex items-center justify-center cursor-grab active:cursor-grabbing p-1 rounded-lg hover:bg-secondary/50 text-muted-foreground touch-none"
        title="Sürükle & Yapıştır"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div className={dividerClass} />

      {/* Pen */}
      <button
        onClick={() => setTool('pen')}
        className={`p-2 rounded-xl transition-all ${tool === 'pen' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
        title="Kalem"
      >
        <Pen className="h-4 w-4" />
      </button>

      {/* Eraser */}
      <button
        onClick={() => setTool('eraser')}
        className={`p-2 rounded-xl transition-all ${tool === 'eraser' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
        title="Silgi"
      >
        <Eraser className="h-4 w-4" />
      </button>

      <div className={dividerClass} />

      {/* Sizes */}
      {tool === 'pen' ? PEN_SIZES.map(ps => (
        <button
          key={ps.value}
          onClick={() => setPenSize(ps.value)}
          className={`p-2 rounded-xl transition-all flex items-center justify-center ${penSize === ps.value ? 'bg-primary/20 ring-2 ring-primary' : 'text-muted-foreground hover:bg-secondary'}`}
          title={ps.label}
        >
          <div className="rounded-full bg-current" style={{ width: ps.dot, height: ps.dot }} />
        </button>
      )) : ERASER_SIZES.map(es => (
        <button
          key={es.value}
          onClick={() => setEraserSize(es.value)}
          className={`p-2 rounded-xl transition-all flex items-center justify-center ${eraserSize === es.value ? 'bg-primary/20 ring-2 ring-primary' : 'text-muted-foreground hover:bg-secondary'}`}
          title={es.label}
        >
          <div className="rounded-full border-2 border-current" style={{ width: es.dot, height: es.dot }} />
        </button>
      ))}

      <div className={dividerClass} />

      {/* Colors */}
      {COLORS.map((c, i) => (
        <button
          key={c.name}
          onClick={() => { setColorIndex(i); setTool('pen'); }}
          className={`rounded-xl p-1 transition-all ${colorIndex === i && tool === 'pen' ? 'ring-2 ring-white/80 scale-110' : 'hover:scale-105'}`}
          title={c.name}
        >
          <div
            className="w-6 h-6 rounded-lg border border-white/20"
            style={{ backgroundColor: c.value, opacity: c.alpha }}
          />
        </button>
      ))}

      <div className={dividerClass} />

      {/* Undo */}
      <button onClick={onUndo} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all" title="Geri Al">
        <Undo2 className="h-4 w-4" />
      </button>

      {/* Clear */}
      <button onClick={onClear} className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all" title="Tümünü Temizle">
        <Trash2 className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

export { COLORS, PEN_SIZES, ERASER_SIZES };
export type { Tool, PenSize, EraserSize };
