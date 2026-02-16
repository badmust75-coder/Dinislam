import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Play, HelpCircle, Moon, Star, Lock, ChevronRight, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useConfetti } from '@/hooks/useConfetti';
import UnlockConfirmDialog from '@/components/ramadan/UnlockConfirmDialog';

interface RamadanDay {
  id: number;
  day_number: number;
  theme: string | null;
  video_url: string | null;
  pdf_url: string | null;
}

interface Quiz {
  id: string;
  day_id: number;
  question: string;
  options: string[];
  correct_option: number | null;
}

interface UserProgress {
  id: string;
  day_id: number;
  video_watched: boolean;
  quiz_completed: boolean;
  pdf_read: boolean;
}

const Ramadan = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { fireSuccess } = useConfetti();
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'video' | 'quiz'>('video');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number | null>>({});
  const [questionResults, setQuestionResults] = useState<Record<number, boolean | null>>({});
  const [pendingDayToOpen, setPendingDayToOpen] = useState<RamadanDay | null>(null);
  const [now, setNow] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch ramadan settings
  const { data: settings } = useQuery({
    queryKey: ['ramadan-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ramadan_settings')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch all days
  const { data: days = [] } = useQuery({
    queryKey: ['ramadan-days'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ramadan_days')
        .select('*')
        .order('day_number');
      if (error) throw error;
      return data as RamadanDay[];
    },
  });

  // Fetch quizzes
  const { data: quizzes = [] } = useQuery({
    queryKey: ['ramadan-quizzes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ramadan_quizzes')
        .select('*');
      if (error) throw error;
      return data.map(q => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : JSON.parse(q.options as string)
      })) as Quiz[];
    },
  });

  // Fetch user progress
  const { data: userProgress = [] } = useQuery({
    queryKey: ['ramadan-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_ramadan_progress')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data as UserProgress[];
    },
    enabled: !!user?.id,
  });

  // Fetch quiz responses for this user
  const { data: quizResponses = [] } = useQuery({
    queryKey: ['ramadan-quiz-responses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('quiz_responses')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const completedDays = userProgress.filter(p => p.quiz_completed).length;
  const progressPercentage = Math.round((completedDays / 30) * 100);

  const getDayProgress = (dayId: number) => userProgress.find(p => p.day_id === dayId);
  const getQuizzesForDay = (dayId: number) => quizzes.filter(q => q.day_id === dayId);

  // Unlock logic: Day N available when started_at + (N-1) days at 16:00 has passed
  const getDayUnlockTime = (dayNumber: number): Date | null => {
    if (!settings?.started_at) return null;
    const startDate = new Date(settings.started_at);
    // Day 1 unlocks immediately on start
    if (dayNumber === 1) return startDate;
    // Day N: start_date + (N-1) days, at 16:00 local time
    const unlockDate = new Date(startDate);
    unlockDate.setDate(unlockDate.getDate() + (dayNumber - 1));
    unlockDate.setHours(16, 0, 0, 0);
    return unlockDate;
  };

  const isDayUnlocked = (dayNumber: number) => {
    if (!settings?.start_enabled) return false;
    if (dayNumber === 1) return true;
    
    // Previous day quiz must be completed
    const previousDay = days.find(d => d.day_number === dayNumber - 1);
    if (!previousDay) return false;
    const previousProgress = getDayProgress(previousDay.id);
    if (!previousProgress?.quiz_completed) return false;
    
    // Time check: current time must be past the unlock time
    const unlockTime = getDayUnlockTime(dayNumber);
    if (!unlockTime) return false;
    return now >= unlockTime;
  };

  const isWaitingForTime = (dayNumber: number) => {
    if (dayNumber === 1) return false;
    if (!settings?.start_enabled) return false;
    
    const previousDay = days.find(d => d.day_number === dayNumber - 1);
    if (!previousDay) return false;
    const previousProgress = getDayProgress(previousDay.id);
    if (!previousProgress?.quiz_completed) return false;
    
    const unlockTime = getDayUnlockTime(dayNumber);
    if (!unlockTime) return false;
    return now < unlockTime;
  };

  const dayHasContent = (day: RamadanDay) => {
    return !!day.video_url && getQuizzesForDay(day.id).length > 0;
  };

  // Mark progress mutation
  const markProgressMutation = useMutation({
    mutationFn: async ({ dayId, field }: { dayId: number; field: 'video_watched' | 'quiz_completed' }) => {
      if (!user?.id) throw new Error('Non connecté');
      const existingProgress = userProgress.find(p => p.day_id === dayId);
      
      if (existingProgress) {
        const { error } = await supabase
          .from('user_ramadan_progress')
          .update({ [field]: true, updated_at: new Date().toISOString() })
          .eq('id', existingProgress.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_ramadan_progress')
          .insert({ user_id: user.id, day_id: dayId, [field]: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ramadan-progress'] });
    },
  });

  // Save quiz response mutation
  const saveQuizResponseMutation = useMutation({
    mutationFn: async ({ quizId, selectedOption }: { quizId: string; selectedOption: number }) => {
      if (!user?.id) throw new Error('Non connecté');
      // Check if already responded
      const existing = quizResponses.find(r => r.quiz_id === quizId);
      if (existing) return; // already responded
      
      const { error } = await supabase
        .from('quiz_responses')
        .insert({ user_id: user.id, quiz_id: quizId, selected_option: selectedOption });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ramadan-quiz-responses'] });
    },
  });

  const handleDayClick = (day: RamadanDay) => {
    const isUnlocked = isDayUnlocked(day.day_number);
    const hasContent = dayHasContent(day);
    const waiting = isWaitingForTime(day.day_number);
    
    if (day.day_number === 1 && !settings?.start_enabled) {
      toast.error('Le calendrier n\'est pas encore ouvert. Patience !');
      return;
    }
    
    if (waiting) {
      const unlockTime = getDayUnlockTime(day.day_number);
      if (unlockTime) {
        const diff = unlockTime.getTime() - now.getTime();
        const hours = Math.ceil(diff / (1000 * 60 * 60));
        toast.info(`Ce jour sera disponible dans ~${hours}h. Bsaha ftourek ! 🌙`);
      }
      return;
    }
    
    if (!isUnlocked) {
      toast.error('Complétez d\'abord le quiz du jour précédent');
      return;
    }
    
    if (!hasContent) {
      toast.info('Contenu pas encore disponible pour ce jour');
      return;
    }
    
    if (day.day_number > 1 && expandedDay !== day.id) {
      setPendingDayToOpen(day);
      return;
    }
    
    openDay(day);
  };

  const openDay = (day: RamadanDay) => {
    setExpandedDay(expandedDay === day.id ? null : day.id);
    setActiveTab('video');
    setSelectedAnswers({});
    setQuestionResults({});
  };

  const handleConfirmOpen = () => {
    if (pendingDayToOpen) {
      openDay(pendingDayToOpen);
      setPendingDayToOpen(null);
    }
  };

  const handleSubmitQuiz = (dayQuizzes: Quiz[], dayId: number) => {
    // Check all questions answered
    const allAnswered = dayQuizzes.every((_, idx) => selectedAnswers[idx] !== null && selectedAnswers[idx] !== undefined);
    if (!allAnswered) {
      toast.error('Répondez à toutes les questions !');
      return;
    }
    
    // Check each answer
    const results: Record<number, boolean> = {};
    let allCorrect = true;
    
    dayQuizzes.forEach((quiz, idx) => {
      const correct = selectedAnswers[idx] === quiz.correct_option;
      results[idx] = correct;
      if (!correct) allCorrect = false;
      // Save response
      saveQuizResponseMutation.mutate({ quizId: quiz.id, selectedOption: selectedAnswers[idx]! });
    });
    
    setQuestionResults(results);
    
    if (allCorrect) {
      fireSuccess();
      markProgressMutation.mutate({ dayId, field: 'quiz_completed' });
      toast.success('Bravo ! Toutes les réponses sont correctes ! 🎉');
    } else {
      const wrongCount = Object.values(results).filter(r => !r).length;
      toast.error(`${wrongCount} réponse(s) incorrecte(s). Réessayez !`);
      setTimeout(() => {
        setQuestionResults({});
        // Reset only wrong answers
        setSelectedAnswers(prev => {
          const next = { ...prev };
          Object.entries(results).forEach(([idx, correct]) => {
            if (!correct) next[parseInt(idx)] = null;
          });
          return next;
        });
      }, 2500);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-3 animate-fade-in">
          <div className="flex items-center justify-center gap-2">
            <Moon className="h-6 w-6 text-gold" />
            <h1 className="text-2xl font-bold text-foreground font-arabic">رمضان كريم</h1>
            <Star className="h-5 w-5 text-gold" />
          </div>
          <p className="text-muted-foreground">30 Jours de Spiritualité</p>
        </div>

        {/* Progress Card */}
        <div className="module-card rounded-2xl p-4 space-y-3 animate-fade-in bg-gradient-to-br from-primary/5 to-gold/5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Votre parcours spirituel</span>
            <span className="text-sm font-bold text-gold">{completedDays}/30 jours</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
          <p className="text-xs text-center text-muted-foreground">{progressPercentage}% du Ramadan complété</p>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2">
          {days.map((day) => {
            const progress = getDayProgress(day.id);
            const isCompleted = progress?.quiz_completed;
            const isExpanded = expandedDay === day.id;
            const isUnlocked = isDayUnlocked(day.day_number);
            const hasContent = dayHasContent(day);
            const waiting = isWaitingForTime(day.day_number);
            const notStarted = day.day_number === 1 && !settings?.start_enabled;

            return (
              <button
                key={day.id}
                onClick={() => handleDayClick(day)}
                className={cn(
                  'aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all duration-200 relative',
                  isCompleted
                    ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-md'
                    : waiting
                    ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white cursor-wait'
                    : notStarted || !isUnlocked
                    ? 'bg-muted/50 text-muted-foreground cursor-not-allowed'
                    : !hasContent
                    ? 'bg-muted/30 text-muted-foreground/50'
                    : isExpanded
                    ? 'bg-gradient-to-br from-gold to-gold-dark text-primary shadow-elevated'
                    : 'bg-muted hover:bg-muted/80 text-foreground'
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : waiting ? (
                  <Clock className="h-4 w-4" />
                ) : notStarted || !isUnlocked ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <span>{day.day_number}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 justify-center text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-green-500 to-green-600" />
            <span>Complété</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
              <Clock className="h-2 w-2 text-white" />
            </div>
            <span>En attente</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-muted flex items-center justify-center">
              <Lock className="h-2 w-2" />
            </div>
            <span>Verrouillé</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-muted" />
            <span>Disponible</span>
          </div>
        </div>

        {/* Expanded Day Content */}
        {expandedDay && (() => {
          const day = days.find(d => d.id === expandedDay);
          if (!day) return null;
          
          const dayQuizzes = getQuizzesForDay(day.id);
          const progress = getDayProgress(day.id);

          return (
            <div className="module-card rounded-2xl overflow-hidden animate-fade-in">
              {/* Day Header */}
              <div className="p-4 bg-gradient-to-r from-primary to-royal-dark text-primary-foreground">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                    <span className="font-bold">{day.day_number}</span>
                  </div>
                  <div>
                    <h3 className="font-bold">Jour {day.day_number}</h3>
                    {day.theme && <p className="text-sm opacity-80">{day.theme}</p>}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b">
                <button
                  onClick={() => setActiveTab('video')}
                  className={cn(
                    'flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors',
                    activeTab === 'video'
                      ? 'border-gold text-gold'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Play className="h-4 w-4" />
                  Vidéo
                  {progress?.video_watched && <Check className="h-3 w-3 text-green-500" />}
                </button>
                <button
                  onClick={() => setActiveTab('quiz')}
                  className={cn(
                    'flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors',
                    activeTab === 'quiz'
                      ? 'border-gold text-gold'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <HelpCircle className="h-4 w-4" />
                  Quiz ({dayQuizzes.length}Q)
                  {progress?.quiz_completed && <Check className="h-3 w-3 text-green-500" />}
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-4">
                {activeTab === 'video' && day.video_url && (
                  <div className="space-y-4">
                    <div className="aspect-video rounded-xl overflow-hidden bg-black">
                      <video
                        src={day.video_url}
                        controls
                        className="w-full h-full"
                        onEnded={() => {
                          if (!progress?.video_watched) {
                            markProgressMutation.mutate({ dayId: day.id, field: 'video_watched' });
                          }
                        }}
                      />
                    </div>
                    {!progress?.video_watched && (
                      <Button
                        onClick={() => markProgressMutation.mutate({ dayId: day.id, field: 'video_watched' })}
                        className="w-full bg-gradient-to-r from-gold to-gold-dark text-primary"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Marquer comme vue
                      </Button>
                    )}
                    {progress?.video_watched && !progress?.quiz_completed && (
                      <Button onClick={() => setActiveTab('quiz')} className="w-full">
                        <ChevronRight className="h-4 w-4 mr-2" />
                        Passer au quiz
                      </Button>
                    )}
                  </div>
                )}

                {activeTab === 'quiz' && dayQuizzes.length > 0 && (
                  <div className="space-y-6">
                    {progress?.quiz_completed ? (
                      <div className="text-center py-8 space-y-3">
                        <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                          <Check className="h-8 w-8 text-green-500" />
                        </div>
                        <h4 className="font-semibold text-foreground">Quiz complété !</h4>
                        <p className="text-sm text-muted-foreground">
                          Vous avez déjà validé ce quiz. Le jour suivant se déverrouillera à 16h demain.
                        </p>
                      </div>
                    ) : (
                      <>
                        {dayQuizzes.map((quiz, qIdx) => {
                          const result = questionResults[qIdx];
                          const answered = selectedAnswers[qIdx] !== null && selectedAnswers[qIdx] !== undefined;
                          
                          return (
                            <div key={quiz.id} className="space-y-3 p-3 rounded-lg border">
                              <h4 className="font-semibold text-foreground text-sm">
                                Question {qIdx + 1}/{dayQuizzes.length}: {quiz.question}
                              </h4>
                              
                              <RadioGroup
                                value={answered ? selectedAnswers[qIdx]!.toString() : ''}
                                onValueChange={(val) => {
                                  if (result === null || result === undefined) {
                                    setSelectedAnswers(prev => ({ ...prev, [qIdx]: parseInt(val) }));
                                  }
                                }}
                              >
                                {quiz.options.map((option, optIdx) => (
                                  <div
                                    key={optIdx}
                                    className={cn(
                                      'flex items-center space-x-3 p-2.5 rounded-lg border transition-colors',
                                      result !== null && result !== undefined && optIdx === quiz.correct_option && 'border-green-500 bg-green-50',
                                      result === false && selectedAnswers[qIdx] === optIdx && optIdx !== quiz.correct_option && 'border-destructive bg-destructive/10',
                                      (result === null || result === undefined) && 'hover:bg-muted/50'
                                    )}
                                  >
                                    <RadioGroupItem
                                      value={optIdx.toString()}
                                      id={`q${qIdx}-opt${optIdx}`}
                                      disabled={result !== null && result !== undefined}
                                    />
                                    <Label
                                      htmlFor={`q${qIdx}-opt${optIdx}`}
                                      className={cn(
                                        'flex-1 cursor-pointer text-sm',
                                        result !== null && result !== undefined && optIdx === quiz.correct_option && 'text-green-700 font-medium',
                                        result === false && selectedAnswers[qIdx] === optIdx && optIdx !== quiz.correct_option && 'text-destructive'
                                      )}
                                    >
                                      {option}
                                      {result !== null && result !== undefined && optIdx === quiz.correct_option && ' ✓'}
                                    </Label>
                                  </div>
                                ))}
                              </RadioGroup>
                            </div>
                          );
                        })}

                        {Object.keys(questionResults).length === 0 && (
                          <Button
                            onClick={() => handleSubmitQuiz(dayQuizzes, day.id)}
                            disabled={dayQuizzes.some((_, idx) => selectedAnswers[idx] === null || selectedAnswers[idx] === undefined)}
                            className="w-full bg-gradient-to-r from-primary to-royal-dark"
                          >
                            <ChevronRight className="h-4 w-4 mr-2" />
                            Valider mes réponses ({dayQuizzes.length} questions)
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        <UnlockConfirmDialog
          open={!!pendingDayToOpen}
          onOpenChange={(open) => !open && setPendingDayToOpen(null)}
          onConfirm={handleConfirmOpen}
          dayNumber={pendingDayToOpen?.day_number || 0}
        />
      </div>
    </AppLayout>
  );
};

export default Ramadan;
