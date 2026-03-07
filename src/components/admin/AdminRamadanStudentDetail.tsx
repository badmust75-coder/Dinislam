import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, CheckCircle2, XCircle, BookOpen, Video, FileText, LogIn } from 'lucide-react';

interface Props {
  studentId: string;
  studentName: string;
  onBack: () => void;
}

const AdminRamadanStudentDetail = ({ studentId, studentName, onBack }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-ramadan-student-detail', studentId],
    queryFn: async () => {
      const [daysRes, progressRes, responsesRes, quizzesRes, logsRes] = await Promise.all([
        (supabase as any).from('ramadan_days').select('*').order('day_number'),
        (supabase as any).from('user_ramadan_progress').select('*').eq('user_id', studentId),
        (supabase as any).from('quiz_responses').select('quiz_id, is_correct, attempt_number, created_at').eq('user_id', studentId),
        (supabase as any).from('ramadan_quizzes').select('id, day_id'),
        (supabase as any).from('connexion_logs').select('connected_at').eq('user_id', studentId),
      ]);

      const days = daysRes.data || [];
      const progress = progressRes.data || [];
      const responses = responsesRes.data || [];
      const quizzes = quizzesRes.data || [];
      const logs = logsRes.data || [];

      // Build quiz_id -> day_id map
      const quizToDayMap: Record<string, number> = {};
      quizzes.forEach((q: any) => { quizToDayMap[q.id] = q.day_id; });

      // Group responses by day_id
      const responsesByDay: Record<number, any[]> = {};
      responses.forEach((r: any) => {
        const dayId = quizToDayMap[r.quiz_id];
        if (dayId != null) {
          if (!responsesByDay[dayId]) responsesByDay[dayId] = [];
          responsesByDay[dayId].push(r);
        }
      });

      // Build progress map by day_id
      const progressByDay: Record<number, any> = {};
      progress.forEach((p: any) => { progressByDay[p.day_id] = p; });

      // Stats
      const totalQuizCompleted = progress.filter((p: any) => p.quiz_completed).length;
      const totalVideoWatched = progress.filter((p: any) => p.video_watched).length;
      const totalPdfRead = progress.filter((p: any) => p.pdf_read).length;
      const totalConnections = logs.length;

      // Build rows
      const rows = days.map((day: any) => {
        const p = progressByDay[day.id];
        const dayResponses = responsesByDay[day.id] || [];
        const attempts = dayResponses.length;
        const correctCount = dayResponses.filter((r: any) => r.is_correct).length;
        const successRate = attempts > 0 ? Math.round((correctCount / attempts) * 100) : null;

        return {
          dayNumber: day.day_number,
          theme: day.theme || '',
          quizCompleted: p?.quiz_completed || false,
          videoWatched: p?.video_watched || false,
          pdfRead: p?.pdf_read || false,
          attempts,
          successRate,
          hasData: !!p,
          allDone: p?.quiz_completed && p?.video_watched && p?.pdf_read,
        };
      });

      return { rows, totalQuizCompleted, totalVideoWatched, totalPdfRead, totalConnections, totalDays: days.length };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const { rows = [], totalQuizCompleted = 0, totalVideoWatched = 0, totalPdfRead = 0, totalConnections = 0 } = data || {};

  const stats = [
    { label: 'Quiz complétés', value: totalQuizCompleted, icon: CheckCircle2, color: 'text-green-600' },
    { label: 'Vidéos vues', value: totalVideoWatched, icon: Video, color: 'text-blue-600' },
    { label: 'PDFs lus', value: totalPdfRead, icon: FileText, color: 'text-orange-600' },
    { label: 'Connexions', value: totalConnections, icon: LogIn, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-2">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground">{studentName || 'Élève'}</h2>
          <p className="text-sm text-muted-foreground">Détail Ramadan</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-6 w-6 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Day-by-day table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Jour</TableHead>
                  <TableHead>Thème</TableHead>
                  <TableHead className="text-center w-16">Quiz</TableHead>
                  <TableHead className="text-center w-16">Vidéo</TableHead>
                  <TableHead className="text-center w-16">PDF</TableHead>
                  <TableHead className="text-center w-24">Tentatives</TableHead>
                  <TableHead className="text-center w-24">Réussite</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row: any) => (
                  <TableRow
                    key={row.dayNumber}
                    className={
                      row.allDone
                        ? 'bg-green-50 dark:bg-green-950/20'
                        : !row.hasData
                        ? 'bg-muted/30'
                        : ''
                    }
                  >
                    <TableCell className="font-medium">{row.dayNumber}</TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">{row.theme || '—'}</TableCell>
                    <TableCell className="text-center">
                      {row.quizCompleted ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" /> : <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.videoWatched ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" /> : <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.pdfRead ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" /> : <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {row.attempts > 0 ? row.attempts : '—'}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {row.successRate !== null ? `${row.successRate}%` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRamadanStudentDetail;
