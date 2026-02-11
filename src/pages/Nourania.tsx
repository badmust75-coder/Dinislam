import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Lock, Play, FileText, Image as ImageIcon, File, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useConfetti } from '@/hooks/useConfetti';
import NouraniaUnlockDialog from '@/components/nourania/NouraniaUnlockDialog';

const Nourania = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { fireSuccess } = useConfetti();
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);
  const [unlockDialog, setUnlockDialog] = useState<{ open: boolean; lessonNumber: number; lessonId: number } | null>(null);

  // Fetch lessons
  const { data: lessons = [] } = useQuery({
    queryKey: ['nourania-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nourania_lessons')
        .select('*')
        .order('lesson_number');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch lesson content (videos, PDFs, images)
  const { data: lessonContents = [] } = useQuery({
    queryKey: ['nourania-lesson-contents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nourania_lesson_content')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch user's progress
  const { data: userProgress = [] } = useQuery({
    queryKey: ['nourania-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_nourania_progress')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const validatedCount = userProgress.filter(p => p.is_validated).length;
  const totalLessons = lessons.length || 17;
  const progressPercentage = Math.round((validatedCount / totalLessons) * 100);

  const isLessonValidated = (lessonId: number) =>
    userProgress.some(p => p.lesson_id === lessonId && p.is_validated);

  const isLessonUnlocked = (index: number) => {
    if (index === 0) return true;
    const previousLesson = lessons[index - 1];
    return previousLesson ? isLessonValidated(previousLesson.id) : false;
  };

  // Validate lesson mutation
  const validateMutation = useMutation({
    mutationFn: async (lessonId: number) => {
      if (!user?.id) throw new Error('Non connecté');
      const existing = userProgress.find(p => p.lesson_id === lessonId);

      if (existing) {
        const { error } = await supabase
          .from('user_nourania_progress')
          .update({ is_validated: true, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_nourania_progress')
          .insert({ user_id: user.id, lesson_id: lessonId, is_validated: true });
        if (error) throw error;
      }
    },
    onSuccess: (_, lessonId) => {
      queryClient.invalidateQueries({ queryKey: ['nourania-progress'] });
      fireSuccess();
      toast.success('Leçon validée ! 🎉');

      // Find next lesson to show unlock dialog
      const currentIndex = lessons.findIndex(l => l.id === lessonId);
      const nextLesson = lessons[currentIndex + 1];
      if (nextLesson) {
        setTimeout(() => {
          setUnlockDialog({
            open: true,
            lessonNumber: nextLesson.lesson_number,
            lessonId: nextLesson.id,
          });
        }, 1500);
      }
    },
    onError: () => {
      toast.error('Erreur lors de la validation');
    },
  });

  const handleUnlockConfirm = () => {
    if (unlockDialog) {
      setExpandedLesson(unlockDialog.lessonId);
      setUnlockDialog(null);
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video': return <Play className="h-4 w-4" />;
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'image': return <ImageIcon className="h-4 w-4" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  const handleLessonClick = (lesson: typeof lessons[0], index: number) => {
    if (!isLessonUnlocked(index)) return;
    setExpandedLesson(expandedLesson === lesson.id ? null : lesson.id);
  };

  return (
    <AppLayout>
      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-2 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">القاعدة النورانية</h1>
          <p className="text-muted-foreground">Al-Qaida An-Nouraniya - {totalLessons} Leçons</p>
        </div>

        {/* Progress */}
        <div className="module-card rounded-2xl p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Votre progression</span>
            <span className="text-sm font-bold text-primary">{validatedCount}/{totalLessons} leçons</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
          <p className="text-xs text-center text-muted-foreground">{progressPercentage}% complété</p>
        </div>

        {/* Lessons List */}
        <div className="space-y-3">
          {lessons.map((lesson, index) => {
            const isValidated = isLessonValidated(lesson.id);
            const unlocked = isLessonUnlocked(index);
            const isExpanded = expandedLesson === lesson.id;
            const contents = lessonContents.filter(c => c.lesson_id === lesson.id);

            return (
              <div
                key={lesson.id}
                className={cn(
                  'module-card rounded-2xl overflow-hidden transition-all duration-300 animate-slide-up',
                  isValidated && 'border-green-500/30 bg-green-50/30 dark:bg-green-950/20',
                  !unlocked && 'opacity-60',
                  isExpanded && 'shadow-elevated'
                )}
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
              >
                {/* Lesson Header */}
                <div
                  onClick={() => handleLessonClick(lesson, index)}
                  className={cn(
                    'w-full p-4 flex items-center gap-4',
                    unlocked ? 'cursor-pointer' : 'cursor-not-allowed'
                  )}
                >
                  {/* Lesson Number / Lock */}
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0',
                    isValidated
                      ? 'bg-green-500 text-white'
                      : !unlocked
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-gradient-to-br from-primary to-royal-dark text-primary-foreground'
                  )}>
                    {isValidated ? (
                      <Check className="h-5 w-5" />
                    ) : !unlocked ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      lesson.lesson_number
                    )}
                  </div>

                  {/* Title */}
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-arabic text-lg text-foreground truncate">{lesson.title_arabic}</p>
                    <p className="text-sm text-muted-foreground truncate">{lesson.title_french}</p>
                  </div>

                  {/* Status */}
                  {isValidated ? (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1 shrink-0">
                      <Check className="h-3 w-3" /> Validée
                    </span>
                  ) : unlocked ? (
                    <ChevronDown className={cn(
                      'h-5 w-5 text-muted-foreground transition-transform shrink-0',
                      isExpanded && 'rotate-180'
                    )} />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </div>

                {/* Expanded Content */}
                {isExpanded && unlocked && (
                  <div className="px-4 pb-4 space-y-4 animate-fade-in">
                    {/* Content files */}
                    {contents.length > 0 ? (
                      <div className="space-y-3">
                        {contents.map((content) => (
                          <div key={content.id}>
                            {content.content_type === 'video' && (
                              <div className="aspect-video rounded-xl overflow-hidden bg-foreground/5">
                                <video
                                  src={content.file_url}
                                  controls
                                  className="w-full h-full"
                                  preload="metadata"
                                />
                              </div>
                            )}
                            {content.content_type === 'pdf' && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  {getContentIcon('pdf')}
                                  <span>{content.file_name}</span>
                                </div>
                                <div className="aspect-[3/4] rounded-xl overflow-hidden bg-muted">
                                  <iframe
                                    src={content.file_url}
                                    title={content.file_name}
                                    className="w-full h-full"
                                  />
                                </div>
                              </div>
                            )}
                            {content.content_type === 'image' && (
                              <div className="rounded-xl overflow-hidden">
                                <img
                                  src={content.file_url}
                                  alt={content.file_name}
                                  className="w-full h-auto rounded-xl"
                                  loading="lazy"
                                />
                              </div>
                            )}
                            {content.content_type === 'document' && (
                              <a
                                href={content.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
                              >
                                {getContentIcon('document')}
                                <span className="text-sm">{content.file_name}</span>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4 italic">
                        Contenu à venir...
                      </p>
                    )}

                    {/* Validate button */}
                    {!isValidated && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          validateMutation.mutate(lesson.id);
                        }}
                        disabled={validateMutation.isPending}
                        className="w-full gap-2 bg-gradient-to-r from-gold to-gold-dark text-primary hover:from-gold-dark hover:to-gold"
                      >
                        <Check className="h-4 w-4" />
                        Valider cette leçon
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Unlock Dialog */}
      {unlockDialog && (
        <NouraniaUnlockDialog
          open={unlockDialog.open}
          onOpenChange={(open) => !open && setUnlockDialog(null)}
          onConfirm={handleUnlockConfirm}
          lessonNumber={unlockDialog.lessonNumber}
        />
      )}
    </AppLayout>
  );
};

export default Nourania;
