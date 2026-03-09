import { useState } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ResourceUploadProps {
  coachId: string;
  onUploadSuccess?: () => void;
}

export default function ResourceUpload({ coachId, onUploadSuccess }: ResourceUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'all' | 'assigned'>('all');
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast.error('Sadece PDF dosyaları yükleyebilirsiniz');
        return;
      }
      if (selectedFile.size > 150 * 1024 * 1024) {
        toast.error('Dosya boyutu 150MB\'dan küçük olmalıdır');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      toast.error('Lütfen dosya ve başlık seçin');
      return;
    }

    setUploading(true);

    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${coachId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Save metadata to database
      const { error: dbError } = await supabase.from('resources').insert({
        coach_id: coachId,
        title: title.trim(),
        description: description.trim(),
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        visibility,
      });

      if (dbError) throw dbError;

      toast.success('Kaynak başarıyla yüklendi! 📄');
      
      // Reset form
      setTitle('');
      setDescription('');
      setVisibility('all');
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('resource-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      onUploadSuccess?.();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Yükleme başarısız oldu');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          Yeni Kaynak Yükle
        </CardTitle>
        <CardDescription>
          Öğrencileriniz için PDF formatında çalışma materyalleri yükleyin
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="resource-title">Başlık *</Label>
          <Input
            id="resource-title"
            placeholder="Örn: Matematik Deneme Sınavı - 1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={uploading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="resource-description">Açıklama</Label>
          <Textarea
            id="resource-description"
            placeholder="Kaynak hakkında kısa bir açıklama yazın..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={uploading}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="resource-visibility">Görünürlük</Label>
          <Select value={visibility} onValueChange={(v: any) => setVisibility(v)} disabled={uploading}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Öğrenciler</SelectItem>
              <SelectItem value="assigned">Sadece Benim Öğrencilerim</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="resource-file-input">Dosya (PDF) *</Label>
          <div className="flex items-center gap-2">
            <Input
              id="resource-file-input"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              disabled={uploading}
              className="flex-1"
            />
            {file && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setFile(null);
                  const fileInput = document.getElementById('resource-file-input') as HTMLInputElement;
                  if (fileInput) fileInput.value = '';
                }}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {file && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{file.name}</span>
              <span className="text-xs">({(file.size / 1024).toFixed(2)} KB)</span>
            </div>
          )}
        </div>

        <Button
          onClick={handleUpload}
          disabled={uploading || !file || !title.trim()}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Yükleniyor...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Yükle
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
