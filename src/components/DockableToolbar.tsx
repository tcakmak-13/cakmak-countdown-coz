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

const TOOLBAR_H = 48; // px height when horizontal
const TOOLBAR_W = 48; // px width when vertical

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
  onDockedEdgeChange?: (edge: DockEdge) => void;
}

export default function DockableToolbar({
  tool, setTool, penSize, setPenSize, eraserSize, setEraserSize,
  colorIndex, setColorIndex, onUndo, onClear, onDockedEdgeChange,
}: DockableToolbarProps) {
  const [dockedEdge, setDockedEdge] = useState<DockEdge>('bottom');
  const [isDragging, setIsDragging] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  const isVertical = (dockedEdge === 'left' || dockedEdge === 'right') && !pos;

  const updateDockedEdge = useCallback((edge: DockEdge) => {
    setDockedEdge(edge);
    onDockedEdgeChange?.(edge);
  }, [onDockedEdgeChange]);

  // Full-edge docked styles
  const getDockedStyle = useCallback((): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'fixed',
      zIndex: 60,
      transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
    };
    switch (dockedEdge) {
      case 'bottom':
        return { ...base, bottom: 0, left: 0, right: 0, height: TOOLBAR_H };
      case 'top':
        return { ...base, top: 0, left: 0, right: 0, height: TOOLBAR_H };
      case 'left':
        return { ...base, left: 0, top: 0, bottom: 0, width: TOOLBAR_W };
      case 'right':
        return { ...base, right: 0, top: 0, bottom: 0, width: TOOLBAR_W };
    }
  }, [dockedEdge, isDragging]);

  const isButtonElement = (el: HTMLElement): boolean => {
    if (el.tagName === 'BUTTON' || el.tagName === 'SVG' || el.tagName === 'path' ||
        el.tagName === 'line' || el.tagName === 'polyline' || el.tagName === 'circle') return true;
    if (el.closest('button')) return true;
    return false;
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
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
    setPos({
      x: dragStartRef.current.px + (e.clientX - dragStartRef.current.mx),
      y: dragStartRef.current.py + (e.clientY - dragStartRef.current.my),
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

    const distances: [DockEdge, number][] = [
      ['top', cy],
      ['bottom', vh - cy],
      ['left', cx],
      ['right', vw - cx],
    ];
    distances.sort((a, b) => a[1] - b[1]);
    updateDockedEdge(distances[0][0]);
    setPos(null);
  }, [isDragging, pos, updateDockedEdge]);

  // Free-floating style while dragging
  const freeStyle: React.CSSProperties | undefined = pos ? {
    position: 'fixed',
    left: pos.x,
    top: pos.y,
    zIndex: 60,
    transition: 'none',
    width: 'auto',
    height: 'auto',
  } : undefined;

  // Tool items renderer
  const renderTools = () => (
    <>
      {/* Drag handle */}
      <div
        data-drag-handle
        className="flex items-center justify-center cursor-grab active:cursor-grabbing p-1.5 rounded-lg hover:bg-white/10 text-white/50 touch-none shrink-0"
        title="Sürükle & Yapıştır"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div className={`${isVertical ? 'w-7 h-px' : 'w-px h-7'} bg-white/15 shrink-0`} />

      {/* Pen */}
      <button
        onClick={() => setTool('pen')}
        className={`p-2 rounded-xl transition-all shrink-0 ${tool === 'pen' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
        title="Kalem"
      >
        <Pen className="h-4 w-4" />
      </button>

      {/* Eraser */}
      <button
        onClick={() => setTool('eraser')}
        className={`p-2 rounded-xl transition-all shrink-0 ${tool === 'eraser' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
        title="Silgi"
      >
        <Eraser className="h-4 w-4" />
      </button>

      <div className={`${isVertical ? 'w-7 h-px' : 'w-px h-7'} bg-white/15 shrink-0`} />

      {/* Sizes */}
      {tool === 'pen' ? PEN_SIZES.map(ps => (
        <button
          key={ps.value}
          onClick={() => setPenSize(ps.value)}
          className={`p-2 rounded-xl transition-all flex items-center justify-center shrink-0 ${penSize === ps.value ? 'bg-white/20 ring-2 ring-primary' : 'text-white/60 hover:bg-white/10'}`}
          title={ps.label}
        >
          <div className="rounded-full bg-current" style={{ width: ps.dot, height: ps.dot }} />
        </button>
      )) : ERASER_SIZES.map(es => (
        <button
          key={es.value}
          onClick={() => setEraserSize(es.value)}
          className={`p-2 rounded-xl transition-all flex items-center justify-center shrink-0 ${eraserSize === es.value ? 'bg-white/20 ring-2 ring-primary' : 'text-white/60 hover:bg-white/10'}`}
          title={es.label}
        >
          <div className="rounded-full border-2 border-current" style={{ width: es.dot, height: es.dot }} />
        </button>
      ))}

      <div className={`${isVertical ? 'w-7 h-px' : 'w-px h-7'} bg-white/15 shrink-0`} />

      {/* Colors */}
      {COLORS.map((c, i) => (
        <button
          key={c.name}
          onClick={() => { setColorIndex(i); setTool('pen'); }}
          className={`rounded-lg p-0.5 transition-all shrink-0 ${colorIndex === i && tool === 'pen' ? 'ring-2 ring-white scale-110' : 'hover:scale-110'}`}
          title={c.name}
        >
          <div
            className="w-5 h-5 rounded-md border border-white/20"
            style={{ backgroundColor: c.value, opacity: c.alpha }}
          />
        </button>
      ))}

      <div className={`${isVertical ? 'w-7 h-px' : 'w-px h-7'} bg-white/15 shrink-0`} />

      {/* Undo */}
      <button onClick={onUndo} className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all shrink-0" title="Geri Al">
        <Undo2 className="h-4 w-4" />
      </button>

      {/* Clear */}
      <button onClick={onClear} className="p-2 rounded-xl text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0" title="Tümünü Temizle">
        <Trash2 className="h-4 w-4" />
      </button>
    </>
  );

  // Container classes based on docked or floating
  const dockedContainerClass = isVertical
    ? 'flex flex-col items-center justify-center gap-1 bg-black/80 backdrop-blur-xl w-full h-full'
    : 'flex items-center justify-center gap-1 bg-black/80 backdrop-blur-xl w-full h-full overflow-x-auto scrollbar-hide';

  const floatingContainerClass = 'flex items-center gap-1 bg-black/80 backdrop-blur-xl rounded-2xl px-2 py-1.5 shadow-2xl';

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={freeStyle || getDockedStyle()}
      className={pos ? floatingContainerClass : dockedContainerClass}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {renderTools()}
    </motion.div>
  );
}

export { COLORS, PEN_SIZES, ERASER_SIZES, TOOLBAR_H, TOOLBAR_W };
export type { Tool, PenSize, EraserSize, DockEdge };
