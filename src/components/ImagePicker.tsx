import { useState, useRef, useCallback, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ImagePlus, Upload, ShieldCheck, AlertTriangle, Camera, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface SelectedFile {
  id: string;
  file: File;
  preview: string;
}

interface ImagePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (files: File[]) => Promise<void>;
  multiple?: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  title?: string;
  description?: string;
  uploading?: boolean;
}

const ImagePicker = forwardRef<HTMLDivElement, ImagePickerProps>(function ImagePicker({
  open,
  onOpenChange,
  onUpload,
  multiple = true,
  maxFiles = 10,
  maxSizeMB = 10,
  accept = 'image/jpeg,image/png,image/gif,image/webp',
  title = 'Fotoğraf Seç',
  description = 'Galerinden fotoğraf seç veya kamera ile çek',
  uploading = false,
}, ref) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const handleFilesSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const remaining = maxFiles - selectedFiles.length;

    if (fileArray.length > remaining) {
      toast.error(`En fazla ${maxFiles} dosya seçebilirsiniz.`);
    }

    const toAdd = fileArray.slice(0, remaining);
    const validFiles: SelectedFile[] = [];

    for (const file of toAdd) {
      if (file.size > maxSizeBytes) {
        toast.error(`"${file.name}" dosyası ${maxSizeMB}MB sınırını aşıyor.`);
        continue;
      }
      if (!file.type.match(/^image\/(jpeg|png|gif|webp)$/)) {
        toast.error(`"${file.name}" desteklenmeyen dosya türü.`);
        continue;
      }
      validFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview: URL.createObjectURL(file),
      });
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);

    // Reset input so same file can be re-selected
    e.target.value = '';
  }, [selectedFiles.length, maxFiles, maxSizeBytes, maxSizeMB]);

  const removeFile = useCallback((id: string) => {
    setSelectedFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file) URL.revokeObjectURL(file.preview);
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    await onUpload(selectedFiles.map(f => f.file));
    // Cleanup previews
    selectedFiles.forEach(f => URL.revokeObjectURL(f.preview));
    setSelectedFiles([]);
    onOpenChange(false);
  };

  const handleClose = () => {
    if (!uploading) {
      selectedFiles.forEach(f => URL.revokeObjectURL(f.preview));
      setSelectedFiles([]);
      onOpenChange(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="font-display flex items-center gap-2 text-lg">
            <ImagePlus className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 space-y-4">
          {/* Source buttons */}
          <div className="grid grid-cols-3 gap-2">
            {/* Camera */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading || selectedFiles.length >= maxFiles}
              className="group relative overflow-hidden rounded-xl p-4 text-center transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-xl" />
              <div className="relative z-10">
                <Camera className="h-7 w-7 text-primary mx-auto mb-1.5" />
                <p className="text-sm font-semibold">Kamera</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Fotoğraf çek</p>
              </div>
            </button>

            {/* Files */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || selectedFiles.length >= maxFiles}
              className="group relative overflow-hidden rounded-xl p-4 text-center transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-accent/40 to-accent/10 border border-border rounded-xl" />
              <div className="relative z-10">
                <FolderOpen className="h-7 w-7 text-accent-foreground mx-auto mb-1.5" />
                <p className="text-sm font-semibold">Dosyalar</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Dosya seç</p>
              </div>
            </button>

            {/* Gallery */}
            <button
              onClick={() => galleryInputRef.current?.click()}
              disabled={uploading || selectedFiles.length >= maxFiles}
              className="group relative overflow-hidden rounded-xl p-4 text-center transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-secondary to-secondary/50 border border-border rounded-xl" />
              <div className="relative z-10">
                <ImagePlus className="h-7 w-7 text-secondary-foreground mx-auto mb-1.5" />
                <p className="text-sm font-semibold">Galeri</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Galeriden seç</p>
              </div>
            </button>
          </div>

          {/* Hidden inputs */}
          {/* Camera: capture triggers native camera */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFilesSelected}
            className="hidden"
          />
          {/* Files: accepts all supported types via file manager */}
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleFilesSelected}
            className="hidden"
          />
          {/* Gallery: accept="image/*" without capture opens native gallery on mobile */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple={multiple}
            onChange={handleFilesSelected}
            className="hidden"
          />

          {/* Selected files grid */}
          <AnimatePresence>
            {selectedFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    Seçilen Fotoğraflar ({selectedFiles.length}/{maxFiles})
                  </p>
                  {selectedFiles.length > 1 && (
                    <button
                      onClick={() => {
                        selectedFiles.forEach(f => URL.revokeObjectURL(f.preview));
                        setSelectedFiles([]);
                      }}
                      className="text-xs text-destructive hover:underline"
                    >
                      Tümünü Kaldır
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  <AnimatePresence mode="popLayout">
                    {selectedFiles.map((sf) => (
                      <motion.div
                        key={sf.id}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        className="relative aspect-square rounded-xl overflow-hidden border border-border bg-secondary group"
                      >
                        <img
                          src={sf.preview}
                          alt="Önizleme"
                          className="w-full h-full object-cover"
                        />
                        {/* Size badge */}
                        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-medium">
                          {formatSize(sf.file.size)}
                        </div>
                        {/* Remove button */}
                        <button
                          onClick={() => removeFile(sf.id)}
                          disabled={uploading}
                          className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive/90 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Add more slot */}
                  {selectedFiles.length < maxFiles && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-colors disabled:opacity-50"
                    >
                      <ImagePlus className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground mt-1">Daha ekle</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Privacy notice */}
          <div className="rounded-xl bg-secondary/50 border border-border p-3 space-y-2">
            <button
              onClick={() => setShowPrivacy(!showPrivacy)}
              className="flex items-center gap-2 w-full text-left"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-xs font-semibold text-muted-foreground flex-1">
                Gizlilik ve Veri Güvenliği
              </span>
              <span className="text-[10px] text-primary">{showPrivacy ? 'Gizle' : 'Oku'}</span>
            </button>

            <AnimatePresence>
              {showPrivacy && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Yüklediğiniz fotoğraflar güvenli, şifreli sunucularda saklanır. Verilerinize yalnızca siz ve koçunuz erişebilir.
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Fotoğraflarınız herkese açık linklerde paylaşılmaz; zaman sınırlı erişim bağlantıları kullanılır.
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Dosyalarınızı istediğiniz zaman silebilirsiniz. Silinen dosyalar kalıcı olarak kaldırılır.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 pt-3 border-t border-border flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={uploading}
            className="flex-1"
          >
            İptal
          </Button>
          <Button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading}
            className="flex-1 bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 gap-2"
          >
            {uploading ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Yükleniyor...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                {selectedFiles.length > 0
                  ? `${selectedFiles.length} Fotoğraf Yükle`
                  : 'Yükle'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default ImagePicker;
