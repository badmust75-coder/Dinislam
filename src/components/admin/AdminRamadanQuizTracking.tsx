import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Check, AlertTriangle, X, Star, BarChart3 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState } from 'react';

interface AdminRamadanQuizTrackingProps {
  onBack: () => void;
}

interface StudentQuizDetail {
  quiz_id: string;
  question: string;
  question_order: number;
  best_attempt: number | null; // 1 = first try, 2 = second try, null = failed
  is_correct: boolean;
}

const AdminRamadanQuizTracking = ({ onBack }: AdminRamadanQuizTrackingProps) => {
  const [selectedStudent, setSelectedStudent] = useState<{ user_id: string; full_name: string | null; email: string | null } | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Fetch all students
  const { data: students = [] } = useQuery({
    queryKey: ['admin-quiz-tracking-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch all days
  const { data: days = [] } = useQuery({
    queryKey: ['admin-quiz-tracking-days'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ramadan_days')
        .select('id, day_number, theme')
        .order('day_number');
      if (error) throw error;
      return data;
    },
  });

  // Fetch global quiz stats
  const { data: globalStats } = useQuery({
    queryKey: ['admin-quiz-global-stats'],
    queryFn: async () => {
      const { data: responses, error } = await supabase
        .from('quiz_responses')
        .select('quiz_id, attempt_number, is_correct');
      if (error) throw error;

      // Group by quiz_id, find best attempt per user per quiz
      const quizStats: Record<string, { firstAttempt: number; total: number }> = {};
      
      // Get unique user-quiz combos
      const userQuizMap: Record<string, { bestAttempt: number; isCorrect: boolean }> = {};
      for (const r of responses || []) {
        const key = `${r.quiz_id}`;
        if (!quizStats[key]) quizStats[key] = { firstAttempt: 0, total: 0 };
        
        if (r.is_correct && r.attempt_number === 1) {
          quizStats[key].firstAttempt++;
        }
        if (r.is_correct) {
          quizStats[key].total++;
        }
      }

      const totalResponses = responses?.filter(r => r.is_correct).length || 0;
      const firstAttemptCorrect = responses?.filter(r => r.is_correct && r.attempt_number === 1).length || 0;
      const percentage = totalResponses > 0 ? Math.round((firstAttemptCorrect / totalResponses) * 100) : 0;

      return { percentage, firstAttemptCorrect, totalResponses };
    },
  });

  // Fetch student detail for selected student + day
  const { data: studentDetail = [] } = useQuery({
    queryKey: ['admin-quiz-student-detail', selectedStudent?.user_id, selectedDay],
    queryFn: async () => {
      if (!selectedStudent || !selectedDay) return [];

      // Get quizzes for this day
      const { data: quizzes, error: qError } = await supabase
        .from('ramadan_quizzes')
        .select('id, question, question_order')
        .eq('day_id', selectedDay)
        .order('question_order');
      if (qError) throw qError;

      // Get responses for this student
      const { data: responses, error: rError } = await supabase
        .from('quiz_responses')
        .select('quiz_id, attempt_number, is_correct')
        .eq('user_id', selectedStudent.user_id);
      if (rError) throw rError;

      return (quizzes || []).map(q => {
        const qResponses = (responses || []).filter(r => r.quiz_id === q.id);
        const correctResponse = qResponses.find(r => r.is_correct);
        
        let bestAttempt: number | null = null;
        let isCorrect = false;
        
        if (correctResponse) {
          bestAttempt = correctResponse.attempt_number;
          isCorrect = true;
        } else if (qResponses.length > 0) {
          bestAttempt = null; // Failed
          isCorrect = false;
        }

        return {
          quiz_id: q.id,
          question: q.question,
          question_order: q.question_order,
          best_attempt: bestAttempt,
          is_correct: isCorrect,
        } as StudentQuizDetail;
      });
    },
    enabled: !!selectedStudent && !!selectedDay,
  });

  // Fetch progress for selected student
  const { data: studentProgress = [] } = useQuery({
    queryKey: ['admin-quiz-student-progress', selectedStudent?.user_id],
    queryFn: async () => {
      if (!selectedStudent) return [];
      const { data, error } = await supabase
        .from('user_ramadan_progress')
        .select('day_id, quiz_completed')
        .eq('user_id', selectedStudent.user_id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStudent,
  });

  const getAttemptIcon = (detail: StudentQuizDetail) => {
    if (detail.is_correct && detail.best_attempt === 1) {
      return <div className="flex items-center gap-1 text-green-600"><Check className="h-4 w-4" /><span className="text-xs">1ère tentative</span></div>;
    }
    if (detail.is_correct && detail.best_attempt === 2) {
      return <div className="flex items-center gap-1 text-orange-500"><AlertTriangle className="h-4 w-4" /><span className="text-xs">2ème tentative</span></div>;
    }
    if (detail.best_attempt === null && !detail.is_correct) {
      return <div className="flex items-center gap-1 text-destructive"><X className="h-4 w-4" /><span className="text-xs">Échec</span></div>;
    }
    return <span className="text-xs text-muted-foreground">—</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground">Suivi des Quiz Ramadan</h2>
          <p className="text-sm text-muted-foreground">Détail des tentatives par élève</p>
        </div>
      </div>

      {/* Global Stats */}
      {globalStats && (
        <Card className="bg-gradient-to-br from-primary/5 to-gold/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gold/20">
                <BarChart3 className="h-6 w-6 text-gold" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">Statistiques globales</p>
                <p className="text-xs text-muted-foreground">
                  {globalStats.percentage}% de réussite au premier coup ({globalStats.firstAttemptCorrect}/{globalStats.totalResponses})
                </p>
                <Progress value={globalStats.percentage} className="h-2 mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Students List */}
      <div className="space-y-2">
        {students.map(student => (
          <Card
            key={student.user_id}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => {
              setSelectedStudent(student);
              setSelectedDay(null);
            }}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground text-sm">{student.full_name || 'Utilisateur'}</p>
                <p className="text-xs text-muted-foreground">{student.email}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Student Detail Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" level="nested">
          <DialogHeader>
            <DialogTitle>{selectedStudent?.full_name || 'Élève'} — Quiz Ramadan</DialogTitle>
          </DialogHeader>

          {!selectedDay ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">Sélectionnez un jour pour voir le détail :</p>
              <div className="grid grid-cols-5 gap-2">
                {days.map(day => {
                  const progress = studentProgress.find(p => p.day_id === day.id);
                  const completed = progress?.quiz_completed;
                  return (
                    <button
                      key={day.id}
                      onClick={() => setSelectedDay(day.id)}
                      className={`
                        aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-bold transition-all
                        ${completed
                          ? 'bg-green-500 text-white'
                          : 'bg-muted hover:bg-muted/80 text-foreground'
                        }
                      `}
                    >
                      <span>{day.day_number}</span>
                      {completed && <Check className="h-3 w-3 mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Retour aux jours
                </Button>
                <Badge variant="outline">Jour {days.find(d => d.id === selectedDay)?.day_number}</Badge>
              </div>

              {studentDetail.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Aucune donnée pour ce jour</p>
              ) : (
                <div className="space-y-2">
                  {studentDetail.map((detail, idx) => (
                    <div key={detail.quiz_id} className="p-3 rounded-lg border space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">Question {idx + 1}</span>
                        {getAttemptIcon(detail)}
                      </div>
                      <p className="text-sm text-foreground">{detail.question}</p>
                    </div>
                  ))}

                  {/* Summary */}
                  <div className="p-3 rounded-lg bg-muted/50 border mt-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Star className="h-4 w-4 text-gold" />
                      <span className="font-medium">
                        {studentDetail.filter(d => d.is_correct && d.best_attempt === 1).length}/{studentDetail.length} au 1er coup
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span>
                        {studentDetail.filter(d => d.is_correct && d.best_attempt === 2).length} au 2ème
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-destructive">
                        {studentDetail.filter(d => !d.is_correct && d.best_attempt === null).length} échec(s)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRamadanQuizTracking;
