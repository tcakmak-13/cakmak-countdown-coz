import { useState, useRef, useCallback } from 'react';
import { Camera, ZoomIn, ZoomOut, RotateCw, Check, X, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-9 w-9',
  md: 'h-14 w-14',
  lg: 'h-20 w-20',
};

const iconSizes = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

const textSizes = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl',
};

export default function AvatarUpload({ size = 'md', className = '' }: Props) {
  const { user, profile, profileId, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
      toast.error('Yalnızca JPG, PNG veya WebP yükleyebilirsiniz.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu 5MB\'dan küçük olmalı.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
    setShowDialog(true);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setDragging(true);
    setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const touch = e.touches[0];
    setPan({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y });
  };

  const renderToCanvas = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!previewUrl) { resolve(null); return; }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) { resolve(null); return; }
        const outputSize = 400;
        canvas.width = outputSize;
        canvas.height = outputSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }

        ctx.clearRect(0, 0, outputSize, outputSize);

        // Clip to circle
        ctx.beginPath();
        ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
        ctx.clip();

        ctx.save();
        ctx.translate(outputSize / 2, outputSize / 2);
        ctx.rotate((rotation * Math.PI) / 180);

        // Scale image to fit, then apply zoom and pan
        const scale = Math.max(outputSize / img.width, outputSize / img.height) * zoom;
        const panScale = outputSize / 256; // normalize pan to canvas size
        ctx.drawImage(
          img,
          -img.width * scale / 2 + pan.x * panScale,
          -img.height * scale / 2 + pan.y * panScale,
          img.width * scale,
          img.height * scale
        );
        ctx.restore();

        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
      };
      img.src = previewUrl;
    });
  }, [previewUrl, zoom, rotation, pan]);

  const handleConfirm = async () => {
    if (!user?.id || !profileId || !selectedFile) return;
    setUploading(true);

    const blob = await renderToCanvas();
    if (!blob) {
      toast.error('Fotoğraf işlenemedi.');
      setUploading(false);
      return;
    }

    const filePath = `${user.id}/avatar.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, { upsert: true, contentType: 'image/jpeg' });

    if (uploadError) {
      toast.error('Yükleme hatası: ' + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const avatarUrl = urlData.publicUrl + '?t=' + Date.now();

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', profileId);

    if (updateError) {
      toast.error('Profil güncellenemedi.');
    } else {
      toast.success('Profil fotoğrafı güncellendi!');
      await refreshProfile();
    }
    setUploading(false);
    handleClose();
  };

  const handleRemoveAvatar = async () => {
    if (!user?.id || !profileId) return;
    setUploading(true);
    
    // Remove from storage (ignore errors if file doesn't exist)
    await supabase.storage.from('avatars').remove([`${user.id}/avatar.jpg`, `${user.id}/avatar.png`, `${user.id}/avatar.webp`, `${user.id}/avatar.jpeg`]);
    
    const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', profileId);
    if (error) {
      toast.error('Fotoğraf kaldırılamadı.');
    } else {
      toast.success('Profil fotoğrafı kaldırıldı.');
      await refreshProfile();
    }
    setUploading(false);
  };

  const handleClose = () => {
    setShowDialog(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  return (
    <>
      <div className={`relative ${className}`}>
      <label className="relative cursor-pointer group">
        <div className={`${sizeClasses[size]} rounded-full bg-gradient-orange flex items-center justify-center shadow-orange overflow-hidden ring-2 ring-primary/30 ${uploading ? 'opacity-60' : ''}`}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <span className={`font-display font-bold text-primary-foreground ${textSizes[size]}`}>
              {profile?.full_name?.charAt(0) || '?'}
            </span>
          )}
        </div>
        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className={`${iconSizes[size]} text-white`} />
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
      </label>
      {profile?.avatar_url && (
        <button
          onClick={handleRemoveAvatar}
          disabled={uploading}
          className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground hover:opacity-80 transition-opacity shadow-md"
          title="Fotoğrafı kaldır"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Fotoğrafı Düzenle</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview area */}
            <div
              className="relative mx-auto w-64 h-64 rounded-full overflow-hidden border-2 border-primary/30 bg-secondary cursor-move select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
            >
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Önizleme"
                  className="absolute pointer-events-none"
                  draggable={false}
                  style={{
                    transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) rotate(${rotation}deg) scale(${zoom})`,
                    top: '50%',
                    left: '50%',
                    minWidth: '100%',
                    minHeight: '100%',
                    objectFit: 'cover',
                    transformOrigin: 'center center',
                  }}
                />
              )}
              {/* Grid overlay */}
              <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-primary/20 rounded-full" />
            </div>

            <p className="text-xs text-muted-foreground text-center">Sürükleyerek konumlandır</p>

            {/* Controls */}
            <div className="space-y-3">
              {/* Zoom */}
              <div className="flex items-center gap-3">
                <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
                <Slider
                  value={[zoom]}
                  onValueChange={([v]) => setZoom(v)}
                  min={0.5}
                  max={3}
                  step={0.05}
                  className="flex-1"
                />
                <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>

              {/* Rotate */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="gap-2"
                >
                  <RotateCw className="h-4 w-4" />
                  Döndür
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 gap-2"
                disabled={uploading}
              >
                <X className="h-4 w-4" />
                İptal
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-1 gap-2 bg-gradient-orange text-primary-foreground border-0 hover:opacity-90"
                disabled={uploading}
              >
                <Check className="h-4 w-4" />
                {uploading ? 'Yükleniyor...' : 'Onayla'}
              </Button>
            </div>
          </div>

          {/* Hidden canvas for rendering */}
          <canvas ref={canvasRef} className="hidden" />
        </DialogContent>
      </Dialog>
    </>
  );
}
