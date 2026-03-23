import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImageLightboxProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export default function ImageLightbox({ src, alt = 'Görsel', onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const MIN_SCALE = 1;
  const MAX_SCALE = 5;

  const resetView = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleZoom = useCallback((delta: number, clientX?: number, clientY?: number) => {
    setScale(prev => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta));
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.3 : 0.3;
    handleZoom(delta, e.clientX, e.clientY);
  }, [handleZoom]);

  // Touch pinch zoom
  const lastTouchDist = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDist.current = dist;
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      posStart.current = { ...position };
    }
  }, [scale, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (dist - lastTouchDist.current) * 0.01;
      lastTouchDist.current = dist;
      handleZoom(delta);
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      const dx = e.touches[0].clientX - dragStart.current.x;
      const dy = e.touches[0].clientY - dragStart.current.y;
      setPosition({ x: posStart.current.x + dx, y: posStart.current.y + dy });
    }
  }, [isDragging, scale, handleZoom]);

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = null;
    setIsDragging(false);
  }, []);

  // Mouse drag for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      posStart.current = { ...position };
    }
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPosition({ x: posStart.current.x + dx, y: posStart.current.y + dy });
    }
  }, [isDragging, scale]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Close on overlay click
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      onClose();
    }
  }, [onClose]);

  return (
    <AnimatePresence>
      {src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/90" />

          {/* Controls */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2 pt-safe">
            <button
              onClick={() => handleZoom(0.5)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors"
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleZoom(-0.5)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            <button
              onClick={resetView}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur-sm transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Zoom indicator */}
          {scale > 1 && (
            <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white text-xs font-medium pt-safe">
              {Math.round(scale * 100)}%
            </div>
          )}

          {/* Image container */}
          <div
            ref={containerRef}
            className="relative w-full h-full flex items-center justify-center overflow-hidden"
            onClick={handleOverlayClick}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
          >
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              src={src}
              alt={alt}
              className="max-w-[90vw] max-h-[85vh] object-contain select-none pointer-events-none"
              draggable={false}
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
