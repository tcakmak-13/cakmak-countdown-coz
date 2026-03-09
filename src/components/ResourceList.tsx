import { useState, useEffect } from 'react';
import { Download, FileText, Trash2, Calendar, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Resource {
  id: string;
  title: string;
  description: string;
  file_path: string;
  file_name: string;
  file_size: number;
  visibility: string;
  uploaded_at: string;
  coach_id: string;
}

interface ResourceListProps {
  isCoach?: boolean;
  coachId?: string;
  refreshTrigger?: number;
}

export default function ResourceList({ isCoach = false, coachId, refreshTrigger = 0 }: ResourceListProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadResources();
  }, [refreshTrigger]);

  const loadResources = async () => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (error: any) {
      console.error('Error loading resources:', error);
      toast.error('Kaynaklar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (resource: Resource) => {
    try {
      const { data, error } = await supabase.storage
        .from('resources')
        .download(resource.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = resource.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Dosya indiriliyor...');
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error('İndirme başarısız oldu');
    }
  };

  const handleDelete = async (resource: Resource) => {
    if (!confirm('Bu kaynağı silmek istediğinizden emin misiniz?')) return;

    setDeleting(resource.id);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('resources')
        .remove([resource.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('resources')
        .delete()
        .eq('id', resource.id);

      if (dbError) throw dbError;

      toast.success('Kaynak silindi');
      loadResources();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Silme başarısız oldu');
    } finally {
      setDeleting(null);
    }
  };

  const handlePreview = async (resource: Resource) => {
    try {
      const { data } = await supabase.storage
        .from('resources')
        .getPublicUrl(resource.file_path);

      window.open(data.publicUrl, '_blank');
    } catch (error: any) {
      console.error('Preview error:', error);
      toast.error('Önizleme başarısız oldu');
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4 mb-2" />
              <div className="h-4 bg-muted rounded w-full" />
            </CardHeader>
            <CardContent>
              <div className="h-10 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">
            {isCoach ? 'Henüz kaynak yüklemediniz' : 'Henüz kaynak bulunmuyor'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {resources.map((resource) => (
        <Card key={resource.id} className="flex flex-col">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <CardTitle className="text-base truncate">{resource.title}</CardTitle>
              </div>
              {resource.visibility === 'assigned' && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  Atanmış
                </Badge>
              )}
            </div>
            {resource.description && (
              <CardDescription className="line-clamp-2">
                {resource.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(resource.uploaded_at), {
                addSuffix: true,
                locale: tr,
              })}
            </div>
            <div className="text-xs text-muted-foreground">
              {(resource.file_size / 1024).toFixed(2)} KB
            </div>
            <div className="flex gap-2 mt-auto">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => handlePreview(resource)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Önizle
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={() => handleDownload(resource)}
              >
                <Download className="h-4 w-4 mr-1" />
                İndir
              </Button>
              {isCoach && resource.coach_id === coachId && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(resource)}
                  disabled={deleting === resource.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
