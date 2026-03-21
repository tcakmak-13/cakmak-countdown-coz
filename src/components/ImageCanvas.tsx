import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCcw, Pen, Send } from 'lucide-react';
import { toast } from 'sonner';
import DockableToolbar, { COLORS, TOOLBAR_H, TOOLBAR_W } from './DockableToolbar';
import type { Tool, PenSize, EraserSize, DockEdge } from './DockableToolbar';

// Eraser cursor component
function EraserCursor({ size, canvasRef, containerRef, show }: { size: number; canvasRef: React.RefObject<HTMLCanvasElement>; containerRef: React.RefObject<HTMLDivElement>; show: boolean }) {
  const [pos, setPos] = useState({ x: 0, y: 0, visible: false });

  useEffect(() => {
    if (!show) return;
    const container = containerRef.current;
    if (!container) return;

    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
      if (clientX == null || clientY == null) return;
      setPos({ x: clientX, y: clientY, visible: true });
    };
    const onLeave = () => setPos(p => ({ ...p, visible: false }));

    container.addEventListener('mousemove', onMove);
    container.addEventListener('touchmove', onMove as any);
    container.addEventListener('mouseleave', onLeave);
    return () => {
      container.removeEventListener('mousemove', onMove);
      container.removeEventListener('touchmove', onMove as any);
      container.removeEventListener('mouseleave', onLeave);
    };
  }, [show, containerRef]);

  if (!show || !pos.visible) return null;

  const canvas = canvasRef.current;
  let displaySize = size;
  if (canvas) {
    const rect = canvas.getBoundingClientRect();
    displaySize = size * (rect.width / canvas.width);
  }

  return (
    <div
      className="pointer-events-none fixed z-[200] rounded-full border-2 border-white/80 bg-white/15"
      style={{
        width: displaySize,
        height: displaySize,
        left: pos.x - displaySize / 2,
        top: pos.y - displaySize / 2,
        transition: 'width 0.1s, height 0.1s',
      }}
    />
  );
}

interface ImageCanvasProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
  onShareAsAnswer?: (blob: Blob) => void;
  showShareButton?: boolean;
}

export default function ImageCanvas({ src, alt = 'Görsel', onClose, onShareAsAnswer, showShareButton = false }: ImageCanvasProps) {
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [tool, setTool] = useState<Tool>('pen');
  const [penSize, setPenSize] = useState<PenSize>(8);
  const [eraserSize, setEraserSize] = useState<EraserSize>(32);
  const [colorIndex, setColorIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [sharing, setSharing] = useState(false);
  const sharingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [toolbarEdge, setToolbarEdge] = useState<DockEdge>('bottom');

  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasSizeRef = useRef({ w: 0, h: 0 });
  const historyRef = useRef<ImageData[]>([]);
  const imageLoadedRef = useRef(false);

  // Touch gesture tracking
  const isPanningRef = useRef(false);
  const wasPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOffsetStartRef = useRef({ x: 0, y: 0 });
  const lastTouchDist = useRef<number | null>(null);
  const touchStartTimeRef = useRef(0);
  const touchStartPosRef = useRef({ x: 0, y: 0 });

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

    const ctx = drawCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, w, h);
      historyRef.current = [ctx.getImageData(0, 0, w, h)];
    }
  }, []);

  useEffect(() => {
    if (!src) return;
    imageLoadedRef.current = false;
    setScale(1);
    setPanOffset({ x: 0, y: 0 });
    setShowTools(false);
    setHasDrawn(false);
    setToolbarEdge('bottom');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      imageLoadedRef.current = true;
      setupCanvas();
    };
    img.src = src;
  }, [src, setupCanvas]);

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
    if (historyRef.current.length <= 1) setHasDrawn(false);
  }, []);

  const clearDrawing = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveHistory();
    setHasDrawn(false);
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

  const drawDot = useCallback((x: number, y: number) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1;
      ctx.arc(x, y, eraserSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalCompositeOperation = 'source-over';
      const color = COLORS[colorIndex];
      ctx.fillStyle = color.value;
      ctx.globalAlpha = color.alpha;
      ctx.arc(x, y, penSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.closePath();
  }, [tool, penSize, colorIndex, eraserSize]);

  const startDraw = useCallback((x: number, y: number) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);

    // Draw an immediate dot for tap responsiveness
    drawDot(x, y);

    ctx.beginPath();
    ctx.moveTo(x, y);

    if (tool === 'eraser') {
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
  }, [tool, penSize, colorIndex, eraserSize, drawDot]);

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
    setHasDrawn(true);
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.closePath();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    saveHistory();
  }, [isDrawing, saveHistory]);

  // --- Mouse handlers ---
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!showTools) return;
    const pos = getCanvasPos(e.clientX, e.clientY);
    startDraw(pos.x, pos.y);
  }, [getCanvasPos, startDraw, showTools]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!showTools) return;
    const pos = getCanvasPos(e.clientX, e.clientY);
    draw(pos.x, pos.y);
  }, [getCanvasPos, draw, showTools]);

  const handleMouseUp = useCallback(() => endDraw(), [endDraw]);

  // --- Touch handlers (with pan/zoom separation) ---
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Two fingers: start pan + pinch zoom
      isPanningRef.current = true;
      wasPanningRef.current = true;

      // Cancel any ongoing draw immediately
      if (isDrawing) {
        setIsDrawing(false);
        const canvas = drawCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.closePath();
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
          }
        }
        // Restore to state before this stroke
        if (historyRef.current.length > 0) {
          const prev = historyRef.current[historyRef.current.length - 1];
          const canvas = drawCanvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.putImageData(prev, 0, 0);
          }
        }
      }

      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDist.current = dist;

      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      panStartRef.current = { x: midX, y: midY };
      panOffsetStartRef.current = { ...panOffset };

    } else if (e.touches.length === 1 && showTools) {
      // Single finger: drawing — but only if we weren't just panning
      if (wasPanningRef.current) return;

      e.preventDefault();
      touchStartTimeRef.current = Date.now();
      touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const pos = getCanvasPos(e.touches[0].clientX, e.touches[0].clientY);
      startDraw(pos.x, pos.y);
    }
  }, [getCanvasPos, startDraw, showTools, isDrawing, panOffset]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      if (lastTouchDist.current !== null) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const delta = (dist - lastTouchDist.current) * 0.008;
        lastTouchDist.current = dist;
        setScale(prev => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta)));
      }

      // Pan
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const dx = midX - panStartRef.current.x;
      const dy = midY - panStartRef.current.y;
      setPanOffset({
        x: panOffsetStartRef.current.x + dx,
        y: panOffsetStartRef.current.y + dy,
      });

    } else if (e.touches.length === 1 && showTools && !isPanningRef.current && !wasPanningRef.current) {
      e.preventDefault();
      const pos = getCanvasPos(e.touches[0].clientX, e.touches[0].clientY);
      draw(pos.x, pos.y);
    }
  }, [getCanvasPos, draw, showTools]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      // All fingers lifted
      if (isPanningRef.current || wasPanningRef.current) {
        isPanningRef.current = false;
        // Keep wasPanningRef true briefly to block the ghost single-touch
        setTimeout(() => { wasPanningRef.current = false; }, 80);
        lastTouchDist.current = null;
        // Do NOT call endDraw — no drawing happened
        setIsDrawing(false);
        return;
      }
      lastTouchDist.current = null;
      endDraw();
    } else if (e.touches.length === 1 && isPanningRef.current) {
      // Went from 2 fingers to 1 — still considered panning, don't draw
      isPanningRef.current = true;
    }
  }, [endDraw]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setScale(prev => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta)));
  }, []);

  useEffect(() => {
    if (!src) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [src, onClose, undo]);

  const handleShare = useCallback(async () => {
    if (sharingRef.current) return;
    const drawCanvas = drawCanvasRef.current;
    const img = imageRef.current;
    if (!drawCanvas || !img || !onShareAsAnswer) return;

    sharingRef.current = true;
    setSharing(true);
    try {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = img.naturalWidth;
      exportCanvas.height = img.naturalHeight;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context error');

      ctx.drawImage(img, 0, 0);
      ctx.drawImage(drawCanvas, 0, 0, img.naturalWidth, img.naturalHeight);

      const blob = await new Promise<Blob>((resolve, reject) => {
        exportCanvas.toBlob(b => b ? resolve(b) : reject(new Error('Blob oluşturulamadı')), 'image/png', 1);
      });

      await onShareAsAnswer(blob);
    } catch (err: any) {
      console.error('Görsel oluşturma hatası:', err);
      toast.error('Görsel oluşturulamadı. Lütfen tekrar deneyin.');
      sharingRef.current = false;
      setSharing(false);
    }
  }, [onShareAsAnswer]);

  const resetView = useCallback(() => {
    setScale(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  if (!src) return null;

  const { w, h } = canvasSizeRef.current;

  const getSendButtonStyle = (): React.CSSProperties => {
    const gap = 10;
    if (!showTools) {
      return { position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 55 };
    }
    switch (toolbarEdge) {
      case 'bottom':
        return { position: 'fixed', bottom: TOOLBAR_H + gap, left: '50%', transform: 'translateX(-50%)', zIndex: 55 };
      case 'top':
        return { position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 55 };
      case 'left':
        return { position: 'fixed', bottom: 24, left: TOOLBAR_W + gap + 50, transform: 'translateX(-50%)', zIndex: 55 };
      case 'right':
        return { position: 'fixed', bottom: 24, right: TOOLBAR_W + gap + 50, transform: 'translateX(50%)', zIndex: 55 };
    }
  };

  const getContentPadding = (): React.CSSProperties => {
    if (!showTools) return {};
    switch (toolbarEdge) {
      case 'bottom': return { paddingBottom: TOOLBAR_H };
      case 'top': return { paddingTop: TOOLBAR_H };
      case 'left': return { paddingLeft: TOOLBAR_W };
      case 'right': return { paddingRight: TOOLBAR_W };
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      >
        <div className="absolute inset-0 bg-black/95" onClick={onClose} />

        {/* Top controls */}
        <div className="absolute top-3 right-3 z-[70] flex items-center gap-1.5">
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
        <div className="absolute top-3 left-3 z-[70] flex items-center gap-2">
          {scale !== 1 && (
            <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white text-xs font-medium">
              {Math.round(scale * 100)}%
            </div>
          )}
        </div>

        {/* Canvas area */}
        <div
          ref={containerRef}
          className="relative z-10 flex items-center justify-center overflow-hidden w-full h-full"
          onWheel={handleWheel}
          style={{
            cursor: showTools ? (tool === 'eraser' ? 'none' : 'crosshair') : 'default',
            ...getContentPadding(),
            transition: 'padding 0.3s ease',
          }}
        >
          <div style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
            transition: isPanningRef.current ? 'none' : 'transform 0.15s ease-out',
            position: 'relative',
          }}>
            {imageRef.current && (
              <img
                src={src}
                alt={alt}
                className="rounded-lg shadow-2xl block select-none pointer-events-none"
                draggable={false}
                style={{ width: w || 'auto', height: h || 'auto' }}
              />
            )}
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

        {/* Floating pen button */}
        {scale === 1 && !showTools && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={() => setShowTools(true)}
            className="absolute bottom-5 left-5 z-[65] p-3.5 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/40 hover:shadow-primary/60 hover:scale-105 active:scale-95 transition-all"
            title="Çizim yap"
          >
            <Pen className="h-5 w-5" />
          </motion.button>
        )}

        {/* Dockable drawing toolbar */}
        <AnimatePresence>
          {showTools && (
            <DockableToolbar
              tool={tool}
              setTool={setTool}
              penSize={penSize}
              setPenSize={setPenSize}
              eraserSize={eraserSize}
              setEraserSize={setEraserSize}
              colorIndex={colorIndex}
              setColorIndex={setColorIndex}
              onUndo={undo}
              onClear={clearDrawing}
              onDockedEdgeChange={setToolbarEdge}
            />
          )}
        </AnimatePresence>

        {/* Eraser cursor - visible at ALL zoom levels */}
        <EraserCursor
          size={eraserSize}
          canvasRef={drawCanvasRef}
          containerRef={containerRef}
          show={showTools && tool === 'eraser'}
        />

        {/* Send Solution button */}
        {showShareButton && onShareAsAnswer && (
          <div style={getSendButtonStyle()}>
            <button
              onClick={handleShare}
              disabled={!hasDrawn || sharing}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-xl ${
                sharing
                  ? 'bg-primary/70 text-primary-foreground cursor-not-allowed opacity-80'
                  : hasDrawn
                    ? 'bg-primary text-primary-foreground hover:opacity-90 shadow-primary/30'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
              }`}
              title={hasDrawn ? 'Çözüm Olarak Gönder' : 'Önce görsel üzerinde çizim yapın'}
            >
              {sharing ? (
                <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>{sharing ? 'Gönderiliyor...' : 'Çözümü Gönder'}</span>
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}