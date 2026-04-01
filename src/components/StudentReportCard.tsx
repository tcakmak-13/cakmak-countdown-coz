import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyBrand } from '@/hooks/useCompanyBrand';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, Target, CheckCircle2, XCircle, Clock, TrendingUp, BookOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const COLOR_GREEN = '#22c55e';
const COLOR_RED = '#ef4444';
const COLOR_AMBER = '#f59e0b';
const COLOR_PRIMARY = '#f97316';

const TYT_SUBJECTS = ['turkce', 'sosyal', 'matematik', 'fen'];
const AREA_AYT_SUBJECTS: Record<string, string[]> = {
  SAY: ['ayt_matematik', 'ayt_fizik', 'ayt_kimya', 'ayt_biyoloji'],
  EA: ['ayt_matematik', 'ayt_edebiyat', 'ayt_tarih1', 'ayt_cografya1'],
  SÖZ: ['ayt_edebiyat', 'ayt_tarih1', 'ayt_cografya1', 'ayt_tarih2', 'ayt_cografya2', 'ayt_felsefe', 'ayt_din'],
  DİL: ['ayt_edebiyat'],
};
const SUBJECT_LABELS: Record<string, string> = {
  turkce: 'Türkçe', sosyal: 'Sosyal', matematik: 'Matematik', fen: 'Fen',
  ayt_matematik: 'AYT Mat', ayt_fizik: 'Fizik', ayt_kimya: 'Kimya', ayt_biyoloji: 'Biyoloji',
  ayt_edebiyat: 'Edebiyat', ayt_tarih1: 'Tarih-1', ayt_cografya1: 'Coğ-1',
  ayt_tarih2: 'Tarih-2', ayt_cografya2: 'Coğ-2', ayt_felsefe: 'Felsefe', ayt_din: 'Din',
};

interface StudentReportCardProps {
  student: {
    id: string;
    full_name: string;
    area: string | null;
    grade: string | null;
    target_university: string | null;
    target_department: string | null;
    avatar_url: string | null;
  };
}

export default function StudentReportCard({ student }: StudentReportCardProps) {
  const [generating, setGenerating] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const { name: brandName, logoUrl } = useCompanyBrand();

  const generateReport = async () => {
    setGenerating(true);
    const area = student.area || 'SAY';

    // Fetch exam results
    const { data: exams } = await supabase
      .from('deneme_results')
      .select('*')
      .eq('student_id', student.id)
      .order('created_at', { ascending: true });

    // Fetch study hours (last 4 weeks) from the correct source table
    const formatLocalDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const getWeekStart = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + mondayOffset);
      d.setHours(0, 0, 0, 0);
      return d;
    };
    const safeStudyMinutes = (val: unknown): number => {
      const n = typeof val === 'string' ? Number(val.replace(',', '.')) : Number(val ?? 0);
      return Number.isFinite(n) ? n : 0;
    };

    const currentWeekStart = getWeekStart(new Date());
    const firstWeekStart = new Date(currentWeekStart);
    firstWeekStart.setDate(currentWeekStart.getDate() - 21);

    const weekKeys = Array.from({ length: 4 }, (_, index) => {
      const weekStart = new Date(firstWeekStart);
      weekStart.setDate(firstWeekStart.getDate() + index * 7);
      return formatLocalDate(weekStart);
    });
    const weekIndexByKey = new Map(weekKeys.map((key, index) => [key, index]));

    const { data: studyRowsRaw, error: studyErr } = await supabase
      .from('study_tasks')
      .select('week_start_date, actual_minutes, estimated_minutes')
      .eq('student_id', student.id)
      .eq('completed', true)
      .gte('week_start_date', weekKeys[0])
      .lte('week_start_date', weekKeys[3]);

    if (studyErr) console.error('Study data fetch error:', studyErr);

    const studyRows = Array.isArray(studyRowsRaw) ? studyRowsRaw : [];

    // Fetch task completion
    const { data: tasks } = await supabase
      .from('study_tasks')
      .select('completed, estimated_minutes')
      .eq('student_id', student.id);

    // Process exams
    const tytExams = (exams || []).filter(e => e.exam_type === 'TYT');
    const aytExams = (exams || []).filter(e => e.exam_type === 'AYT');
    const aytSubs = AREA_AYT_SUBJECTS[area] || AREA_AYT_SUBJECTS['SAY'];

    const calcAvg = (exList: any[], subjects: string[]) => {
      if (exList.length === 0) return { totalNet: 0, correct: 0, wrong: 0, blank: 0, subjectNets: [] };
      let totalCorrect = 0, totalWrong = 0, totalNet = 0;
      const subSums: Record<string, number> = {};
      const subCounts: Record<string, number> = {};
      for (const ex of exList) {
        for (const sub of subjects) {
          const d = Number(ex[`${sub}_dogru`] || 0);
          const y = Number(ex[`${sub}_yanlis`] || 0);
          const net = Number(ex[`${sub}_net`] || 0);
          totalCorrect += d;
          totalWrong += y;
          if (!subSums[sub]) { subSums[sub] = 0; subCounts[sub] = 0; }
          subSums[sub] += net;
          subCounts[sub]++;
        }
        totalNet += Number(ex.total_net || 0);
      }
      const n = exList.length;
      return {
        totalNet: Number((totalNet / n).toFixed(1)),
        correct: Math.round(totalCorrect / n),
        wrong: Math.round(totalWrong / n),
        blank: 0,
        subjectNets: subjects.filter(s => subCounts[s]).map(s => ({
          subject: SUBJECT_LABELS[s] || s,
          net: Number((subSums[s] / subCounts[s]).toFixed(1)),
        })),
      };
    };

    const tytStats = calcAvg(tytExams, TYT_SUBJECTS);
    const aytStats = calcAvg(aytExams, aytSubs);

    // Study hours - RLS/null-safe aggregation
    const totalStudyMinutes = Math.round(
      studyRows.reduce((sum, row) => sum + safeStudyMinutes(row.actual_minutes ?? row.estimated_minutes), 0)
    );

    // Weekly breakdown
    const weeklyStudy: number[] = [0, 0, 0, 0];
    for (const row of studyRows) {
      const weekIndex = weekIndexByKey.get(row.week_start_date);
      if (weekIndex === undefined) continue;
      weeklyStudy[weekIndex] += Math.round(safeStudyMinutes(row.actual_minutes ?? row.estimated_minutes));
    }

    // Task completion
    const totalTasks = (tasks || []).length;
    const completedTasks = (tasks || []).filter(t => t.completed).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    setReportData({
      tytStats,
      aytStats,
      tytExamCount: tytExams.length,
      aytExamCount: aytExams.length,
      totalStudyMinutes,
      weeklyStudy,
      completionRate,
      totalTasks,
      completedTasks,
      generatedAt: new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }),
    });
    setShowReport(true);
    setGenerating(false);
  };

  const downloadPDF = async () => {
    if (!reportRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      if (pdfHeight > pdf.internal.pageSize.getHeight()) {
        // Multi-page
        const pageHeight = pdf.internal.pageSize.getHeight();
        let heightLeft = pdfHeight;
        let position = 0;
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
        while (heightLeft > 0) {
          position -= pageHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
          heightLeft -= pageHeight;
        }
      } else {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }

      pdf.save(`${student.full_name}_Analiz_Karnesi.pdf`);
    } catch (err) {
      console.error('PDF oluşturulamadı:', err);
    }
    setGenerating(false);
  };

  const formatHours = (min: number) => {
    if (min < 60) return `${min} dk`;
    return `${Math.floor(min / 60)} sa ${min % 60} dk`;
  };

  if (!showReport) {
    return (
      <Button onClick={generateReport} disabled={generating} variant="outline" className="gap-2">
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
        {generating ? 'Hazırlanıyor...' : 'Analiz Karnesi Oluştur'}
      </Button>
    );
  }

  const d = reportData;
  const area = student.area || 'SAY';
  const distribution = [
    { name: 'Doğru', value: d.tytStats.correct + d.aytStats.correct, color: COLOR_GREEN },
    { name: 'Yanlış', value: d.tytStats.wrong + d.aytStats.wrong, color: COLOR_RED },
  ];
  const weekLabels = ['3 hafta önce', '2 hafta önce', 'Geçen hafta', 'Bu hafta'];
  const weeklyChartData = d.weeklyStudy.map((m: number, i: number) => ({ week: weekLabels[i], minutes: m }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button onClick={() => setShowReport(false)} variant="ghost" size="sm">← Geri</Button>
        <Button onClick={downloadPDF} disabled={generating} className="gap-2 bg-gradient-orange text-primary-foreground border-0">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          PDF İndir
        </Button>
      </div>

      {/* Report content for PDF capture */}
      <div ref={reportRef} style={{ background: '#ffffff', color: '#1a1a1a', padding: '32px', minWidth: '700px', fontFamily: 'system-ui, sans-serif' }}>
        {/* Header with company branding */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '3px solid #f97316', paddingBottom: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {logoUrl && <img src={logoUrl} alt="" style={{ height: '48px', width: '48px', objectFit: 'contain', borderRadius: '8px' }} crossOrigin="anonymous" />}
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#f97316', margin: 0 }}>{brandName || 'ÇakmakKoçluk'}</h1>
              <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Öğrenci Analiz Karnesi</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>Oluşturulma Tarihi</p>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#333', margin: 0 }}>{d.generatedAt}</p>
          </div>
        </div>

        {/* Student info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#fff7ed', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '22px', flexShrink: 0 }}>
            {student.avatar_url
              ? <img src={student.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} crossOrigin="anonymous" />
              : student.full_name?.charAt(0)}
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#1a1a1a' }}>{student.full_name}</h2>
            <p style={{ fontSize: '13px', color: '#666', margin: '2px 0 0' }}>
              {area} — {student.grade || '12. Sınıf'}
              {student.target_university && <span> • 🎯 {student.target_university}{student.target_department ? ` / ${student.target_department}` : ''}</span>}
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '16px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
            <p style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>TYT Ort. Net</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: COLOR_GREEN, margin: 0 }}>{d.tytStats.totalNet}</p>
            <p style={{ fontSize: '11px', color: '#999', margin: '2px 0 0' }}>{d.tytExamCount} deneme</p>
          </div>
          <div style={{ background: '#eff6ff', borderRadius: '12px', padding: '16px', textAlign: 'center', border: '1px solid #bfdbfe' }}>
            <p style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>AYT Ort. Net</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6', margin: 0 }}>{d.aytStats.totalNet}</p>
            <p style={{ fontSize: '11px', color: '#999', margin: '2px 0 0' }}>{d.aytExamCount} deneme</p>
          </div>
          <div style={{ background: '#fff7ed', borderRadius: '12px', padding: '16px', textAlign: 'center', border: '1px solid #fed7aa' }}>
            <p style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Toplam Çalışma</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: COLOR_PRIMARY, margin: 0 }}>{formatHours(d.totalStudyMinutes)}</p>
            <p style={{ fontSize: '11px', color: '#999', margin: '2px 0 0' }}>Son 4 hafta</p>
          </div>
          <div style={{ background: '#fefce8', borderRadius: '12px', padding: '16px', textAlign: 'center', border: '1px solid #fef08a' }}>
            <p style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Hedef Tamamlama</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: COLOR_AMBER, margin: 0 }}>%{d.completionRate}</p>
            <p style={{ fontSize: '11px', color: '#999', margin: '2px 0 0' }}>{d.completedTasks}/{d.totalTasks} görev</p>
          </div>
        </div>

        {/* TYT Subject Breakdown */}
        {d.tytStats.subjectNets.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#333', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📊 TYT Ders Bazlı Net Ortalamaları
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${d.tytStats.subjectNets.length}, 1fr)`, gap: '8px' }}>
              {d.tytStats.subjectNets.map((s: any) => (
                <div key={s.subject} style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: '11px', color: '#666', margin: '0 0 4px' }}>{s.subject}</p>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: COLOR_PRIMARY, margin: 0 }}>{s.net}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AYT Subject Breakdown */}
        {d.aytStats.subjectNets.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#333', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📊 AYT Ders Bazlı Net Ortalamaları
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(d.aytStats.subjectNets.length, 4)}, 1fr)`, gap: '8px' }}>
              {d.aytStats.subjectNets.map((s: any) => (
                <div key={s.subject} style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: '11px', color: '#666', margin: '0 0 4px' }}>{s.subject}</p>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6', margin: 0 }}>{s.net}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weekly Study Chart */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#333', marginBottom: '12px' }}>⏱️ Haftalık Çalışma Süresi Trendi</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {weeklyChartData.map((w: any, i: number) => {
              const maxMin = Math.max(...d.weeklyStudy, 1);
              const heightPct = Math.round((w.minutes / maxMin) * 100);
              return (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ height: '80px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '4px' }}>
                    <div style={{ width: '40px', height: `${Math.max(heightPct, 5)}%`, background: i === 3 ? COLOR_PRIMARY : '#e2e8f0', borderRadius: '6px 6px 0 0', transition: 'height 0.3s' }} />
                  </div>
                  <p style={{ fontSize: '10px', color: '#666', margin: 0 }}>{w.week}</p>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#333', margin: 0 }}>{formatHours(w.minutes)}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '2px solid #f3f4f6', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '10px', color: '#999', margin: 0 }}>Bu rapor {brandName || 'ÇakmakKoçluk'} sistemi tarafından otomatik oluşturulmuştur.</p>
          <p style={{ fontSize: '10px', color: '#999', margin: 0 }}>© {new Date().getFullYear()} {brandName || 'ÇakmakKoçluk'}</p>
        </div>
      </div>
    </div>
  );
}
