import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCcw, Undo2, Eraser, Trash2, Pen, Send } from 'lucide-react';
import { toast } from 'sonner';

interface ImageCanvasProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
  onShareAsAnswer?: (blob: Blob) => void;
  showShareButton?: boolean;
}

type Tool = 'pen' | 'eraser';
type PenSize = 4 | 8 | 14;
type EraserSize = 16 | 32 | 56;

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

export default function ImageCanvas({ src, alt = 'Görsel', onClose, onShareAsAnswer, showShareButton = false }: ImageCanvasProps) {
  const [scale, setScale] = useState(1);
  const [tool, setTool] = useState<Tool>('pen');
  const [penSize, setPenSize] = useState<PenSize>(8);
  const [eraserSize, setEraserSize] = useState<EraserSize>(32);
  const [colorIndex, setColorIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showTools, setShowTools] = useState(true);
  const [sharing, setSharing] = useState(false);

  // Two-canvas approach: bgCanvas = image only, drawCanvas = drawing overlay
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasSizeRef = useRef({ w: 0, h: 0 });
  // History stores drawing layer ImageData snapshots only
  const historyRef = useRef<ImageData[]>([]);
  const imageLoadedRef = useRef(false);

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 5;

  const setupCanvas = useCallback(() => {
    const drawCanvas = drawCanvasRef.current;
    const img = imageRef.current;
    if (!drawCanvas || !img) return;

    const maxW = window.innerWidth * 0.92;
    const maxH = window.innerHeight * 0.78;
    const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
    const w = Math.round(img.naturalWidth * ratio);
    const h = Math.round(img.naturalHeight * ratio);

    canvasSizeRef.current = { w, h };

    drawCanvas.width = w;
    drawCanvas.height = h;
    drawCanvas.style.width = `${w}px`;
    drawCanvas.style.height = `${h}px`;

    // Clear drawing layer
    const ctx = drawCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, w, h);
      historyRef.current = [ctx.getImageData(0, 0, w, h)];
    }
  }, []);

  // Load image
  useEffect(() => {
    if (!src) return;
    imageLoadedRef.current = false;
    setScale(1);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      imageLoadedRef.current = true;
      setupCanvas();
    };
    img.src = src;
  }, [src, setupCanvas]);

  // Resize handler
  useEffect(() => {
    if (!src) return;
    const handler = () => { if (imageLoadedRef.current) setupCanvas(); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [src, setupCanvas]);

  const saveHistory = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (historyRef.current.length > 30) historyRef.current.shift();
  }, []);

  const undo = useCallback(() => {
    if (historyRef.current.length <= 1) return;
    historyRef.current.pop();
    const prev = historyRef.current[historyRef.current.length - 1];
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(prev, 0, 0);
  }, []);

  const clearDrawing = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveHistory();
  }, [saveHistory]);

  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const startDraw = useCallback((x: number, y: number) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);

    if (tool === 'eraser') {
      // Eraser clears the drawing layer only (reveals image underneath)
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = eraserSize;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.globalAlpha = 1;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      const color = COLORS[colorIndex];
      ctx.strokeStyle = color.value;
      ctx.globalAlpha = color.alpha;
      ctx.lineWidth = penSize;
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [tool, penSize, colorIndex]);

  const draw = useCallback((x: number, y: number) => {
    if (!isDrawing) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing]);

  const endDraw = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.closePath();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    saveHistory();
  }, [isDrawing, saveHistory]);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) return;
    const pos = getCanvasPos(e.clientX, e.clientY);
    startDraw(pos.x, pos.y);
  }, [scale, getCanvasPos, startDraw]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (scale > 1) return;
    const pos = getCanvasPos(e.clientX, e.clientY);
    draw(pos.x, pos.y);
  }, [scale, getCanvasPos, draw]);

  const handleMouseUp = useCallback(() => endDraw(), [endDraw]);

  // Touch events
  const lastTouchDist = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDist.current = dist;
    } else if (e.touches.length === 1 && scale <= 1) {
      e.preventDefault();
      const pos = getCanvasPos(e.touches[0].clientX, e.touches[0].clientY);
      startDraw(pos.x, pos.y);
    }
  }, [scale, getCanvasPos, startDraw]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (dist - lastTouchDist.current) * 0.008;
      lastTouchDist.current = dist;
      setScale(prev => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta)));
    } else if (e.touches.length === 1 && scale <= 1) {
      e.preventDefault();
      const pos = getCanvasPos(e.touches[0].clientX, e.touches[0].clientY);
      draw(pos.x, pos.y);
    }
  }, [scale, getCanvasPos, draw]);

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = null;
    endDraw();
  }, [endDraw]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setScale(prev => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta)));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!src) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [src, onClose, undo]);

  // Share: merge image + drawing into one blob
  const handleShare = useCallback(async () => {
    const drawCanvas = drawCanvasRef.current;
    const img = imageRef.current;
    if (!drawCanvas || !img || !onShareAsAnswer) return;

    setSharing(true);
    try {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = img.naturalWidth;
      exportCanvas.height = img.naturalHeight;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context error');

      ctx.drawImage(img, 0, 0);
      // Scale drawing layer up to full resolution
      ctx.drawImage(drawCanvas, 0, 0, img.naturalWidth, img.naturalHeight);

      const blob = await new Promise<Blob>((resolve, reject) => {
        exportCanvas.toBlob(b => b ? resolve(b) : reject(new Error('Blob oluşturulamadı')), 'image/png', 1);
      });

      onShareAsAnswer(blob);
    } catch (err: any) {
      console.error('Görsel oluşturma hatası:', err);
      toast.error('Görsel oluşturulamadı. Lütfen tekrar deneyin.');
    }
    setSharing(false);
  }, [onShareAsAnswer]);

  const resetView = useCallback(() => setScale(1), []);

  if (!src) return null;

  const { w, h } = canvasSizeRef.current;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/95" onClick={onClose} />

        {/* Top controls */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
          <button onClick={() => setScale(s => Math.min(MAX_SCALE, s + 0.3))} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors" title="Yakınlaştır">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button onClick={() => setScale(s => Math.max(MIN_SCALE, s - 0.3))} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors" title="Uzaklaştır">
            <ZoomOut className="h-4 w-4" />
          </button>
          <button onClick={resetView} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors" title="Sıfırla">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur-sm transition-colors" title="Kapat">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Zoom indicator */}
        {scale !== 1 && (
          <div className="absolute top-3 left-3 z-20 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white text-xs font-medium">
            {Math.round(scale * 100)}%
          </div>
        )}

        {/* Two-layer canvas area: image underneath, drawing on top */}
        <div
          ref={containerRef}
          className="relative z-10 flex items-center justify-center overflow-hidden"
          onWheel={handleWheel}
          style={{ cursor: scale > 1 ? 'grab' : 'crosshair' }}
        >
          <div style={{ transform: `scale(${scale})`, transition: 'transform 0.15s ease-out', position: 'relative' }}>
            {/* Background image */}
            {imageRef.current && (
              <img
                src={src}
                alt={alt}
                className="rounded-lg shadow-2xl block select-none pointer-events-none"
                draggable={false}
                style={{ width: w || 'auto', height: h || 'auto' }}
              />
            )}
            {/* Drawing overlay canvas - positioned exactly on top of image */}
            <canvas
              ref={drawCanvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="absolute top-0 left-0 rounded-lg touch-none"
              style={{ display: 'block', width: w || 0, height: h || 0 }}
            />
          </div>
        </div>

        {/* Bottom toolbar */}
        <AnimatePresence>
          {showTools && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-card/90 backdrop-blur-xl border border-border rounded-2xl px-3 py-2 shadow-2xl max-w-[95vw] overflow-x-auto scrollbar-hide"
            >
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

              <div className="w-px h-6 bg-border mx-0.5" />

              {/* Sizes - show pen sizes or eraser sizes based on active tool */}
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

              <div className="w-px h-6 bg-border mx-0.5" />

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

              <div className="w-px h-6 bg-border mx-0.5" />

              {/* Undo */}
              <button onClick={undo} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all" title="Geri Al (Ctrl+Z)">
                <Undo2 className="h-4 w-4" />
              </button>

              {/* Clear */}
              <button onClick={clearDrawing} className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all" title="Tümünü Temizle">
                <Trash2 className="h-4 w-4" />
              </button>

              {/* Share as answer */}
              {showShareButton && onShareAsAnswer && (
                <>
                  <div className="w-px h-6 bg-border mx-0.5" />
                  <button
                    onClick={handleShare}
                    disabled={sharing}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                    title="Çözüm Olarak Gönder"
                  >
                    {sharing ? (
                      <div className="h-3.5 w-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden sm:inline">Çözüm Gönder</span>
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle tools on mobile */}
        <button
          onClick={() => setShowTools(!showTools)}
          className="absolute bottom-3 right-3 z-20 sm:hidden p-2 rounded-full bg-white/10 text-white backdrop-blur-sm"
        >
          {showTools ? <X className="h-4 w-4" /> : <Pen className="h-4 w-4" />}
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
