import { useState, useEffect, useCallback } from 'react';
import { Plus, BookOpen, Trash2, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { bookCatalog } from '@/data/book_catalog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface StudentBook {
  id: string;
  student_id: string;
  exam_type: string;
  subject: string;
  book_name: string;
  is_custom: boolean;
  current_test: number;
}

interface MyLibraryProps {
  profileId: string;
}

export default function MyLibrary({ profileId }: MyLibraryProps) {
  const [books, setBooks] = useState<StudentBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add book dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState('TYT');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedBook, setSelectedBook] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [customBookName, setCustomBookName] = useState('');

  const loadBooks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('student_books')
        .select('*')
        .eq('student_id', profileId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBooks((data as StudentBook[]) || []);
    } catch (err) {
      console.error('Error loading books:', err);
      toast.error('Kitaplar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const subjects = bookCatalog.find(c => c.exam_type === selectedExam)?.subjects || [];
  const availableBooks = subjects.find(s => s.subject === selectedSubject)?.books || [];

  const handleAddBook = async () => {
    const bookName = isCustom ? customBookName.trim() : selectedBook;
    if (!selectedSubject || !bookName) {
      toast.error('Lütfen ders ve kitap seçin');
      return;
    }
    const total = parseInt(totalTests) || 1;

    setSaving(true);
    try {
      const { error } = await supabase.from('student_books').insert({
        student_id: profileId,
        exam_type: selectedExam,
        subject: selectedSubject,
        book_name: bookName,
        is_custom: isCustom,
        total_tests: total,
        current_test: 0,
      } as any);

      if (error) {
        if (error.code === '23505') {
          toast.error('Bu kitap zaten ekli');
        } else throw error;
        return;
      }

      toast.success('Kitap eklendi');
      setDialogOpen(false);
      resetForm();
      loadBooks();
    } catch (err) {
      console.error('Error adding book:', err);
      toast.error('Kitap eklenirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedSubject('');
    setSelectedBook('');
    setTotalTests('');
    setIsCustom(false);
    setCustomBookName('');
  };

  const handleUpdateProgress = async (book: StudentBook, newTest: number) => {
    const clamped = Math.max(0, Math.min(newTest, book.total_tests));
    try {
      const { error } = await supabase
        .from('student_books')
        .update({ current_test: clamped, updated_at: new Date().toISOString() } as any)
        .eq('id', book.id);

      if (error) throw error;
      setBooks(prev => prev.map(b => b.id === book.id ? { ...b, current_test: clamped } : b));
    } catch (err) {
      console.error('Error updating progress:', err);
      toast.error('İlerleme kaydedilemedi');
    }
  };

  const handleUpdateTotalTests = async (book: StudentBook, newTotal: number) => {
    const total = Math.max(1, newTotal);
    try {
      const { error } = await supabase
        .from('student_books')
        .update({
          total_tests: total,
          current_test: Math.min(book.current_test, total),
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', book.id);

      if (error) throw error;
      setBooks(prev => prev.map(b => b.id === book.id ? { ...b, total_tests: total, current_test: Math.min(b.current_test, total) } : b));
    } catch (err) {
      console.error('Error updating total:', err);
      toast.error('Güncelleme başarısız');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kitabı silmek istediğinizden emin misiniz?')) return;
    try {
      const { error } = await supabase.from('student_books').delete().eq('id', id);
      if (error) throw error;
      setBooks(prev => prev.filter(b => b.id !== id));
      toast.success('Kitap silindi');
    } catch (err) {
      console.error('Error deleting book:', err);
      toast.error('Silme başarısız');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Book Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogTrigger asChild>
          <Button className="w-full gap-2" size="lg">
            <Plus className="h-5 w-5" />
            Kitap Ekle
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kitaplığına Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Exam Type */}
            <div className="space-y-2">
              <Label>Sınav Türü</Label>
              <Select value={selectedExam} onValueChange={(v) => { setSelectedExam(v); setSelectedSubject(''); setSelectedBook(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TYT">TYT</SelectItem>
                  <SelectItem value="AYT">AYT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label>Ders</Label>
              <Select value={selectedSubject} onValueChange={(v) => { setSelectedSubject(v); setSelectedBook(''); }}>
                <SelectTrigger><SelectValue placeholder="Ders seçin" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s.subject} value={s.subject}>{s.subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Book selection or custom */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Kitap</Label>
                <button
                  type="button"
                  onClick={() => { setIsCustom(!isCustom); setSelectedBook(''); setCustomBookName(''); }}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  {isCustom ? 'Listeden Seç' : '+ Kendi Kaynağını Ekle'}
                </button>
              </div>
              {isCustom ? (
                <Input
                  placeholder="Kitap adını yaz..."
                  value={customBookName}
                  onChange={e => setCustomBookName(e.target.value)}
                />
              ) : (
                <Select value={selectedBook} onValueChange={setSelectedBook} disabled={!selectedSubject}>
                  <SelectTrigger><SelectValue placeholder="Kitap seçin" /></SelectTrigger>
                  <SelectContent>
                    {availableBooks.map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Total tests */}
            <div className="space-y-2">
              <Label>Toplam Test Sayısı</Label>
              <Input
                type="number"
                min={1}
                placeholder="Örn: 24"
                value={totalTests}
                onChange={e => setTotalTests(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleAddBook}
              disabled={saving || !selectedSubject || (!selectedBook && !customBookName.trim())}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Ekle
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Book list */}
      {books.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground">Henüz kitap eklemediniz</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {books.map(book => {
            const pct = book.total_tests > 0 ? Math.round((book.current_test / book.total_tests) * 100) : 0;
            return (
              <Card key={book.id}>
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-medium text-sm truncate">{book.book_name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {book.exam_type} · {book.subject}
                        {book.is_custom && ' · Özel'}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleDelete(book.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Test:</span>
                      <Input
                        type="number"
                        min={0}
                        max={book.total_tests}
                        value={book.current_test}
                        onChange={e => handleUpdateProgress(book, parseInt(e.target.value) || 0)}
                        className="h-8 w-16 text-center text-sm"
                      />
                      <span className="text-xs text-muted-foreground">/</span>
                      <Input
                        type="number"
                        min={1}
                        value={book.total_tests}
                        onChange={e => handleUpdateTotalTests(book, parseInt(e.target.value) || 1)}
                        className="h-8 w-16 text-center text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={pct} className="h-2.5 flex-1" />
                      <span className="text-xs font-bold text-primary min-w-[36px] text-right">{pct}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
