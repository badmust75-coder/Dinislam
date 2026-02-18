import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronRight, SkipForward, RotateCcw, Pause, Play, Star, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfetti } from '@/hooks/useConfetti';

interface Quiz {
  id: string;
  day_id: number;
  question: string;
  options: string[];
  correct_option: number | null;
  explanation?: string | null;
  question_order?: number;
}

interface DayVideo {
  id: string;
  video_url: string;
  file_name: string | null;
  display_order: number;
}

interface RamadanDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayNumber: number;
  theme: string | null;
  videoUrl: string | null;
  videos: DayVideo[];
  quizzes: Quiz[];
  quizCompleted: boolean;
  videoWatched: boolean;
  onMarkVideoWatched: () => void;
  onSubmitQuiz: (allCorrect: boolean, wrongCount: number) => void;
  onSaveQuizResponse: (quizId: string, selectedOption: number, attemptNumber: number, isCorrect: boolean) => void;
}

type Step = 'video' | 'quiz' | 'perfect';

const RamadanDayDialog = ({
  open,
  onOpenChange,
  dayNumber,
  theme,
  videoUrl,
  videos,
  quizzes,
  quizCompleted,
  videoWatched,
  onMarkVideoWatched,
  onSubmitQuiz,
  onSaveQuizResponse,
}: RamadanDayDialogProps) => {
  const [step, setStep] = useState<Step>('video');
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [attemptCount, setAttemptCount] = useState(0); // 0 = not attempted, 1 = first attempt done, 2 = second attempt done
  const [answerResult, setAnswerResult] = useState<'correct' | 'wrong-first' | 'wrong-final' | 'correct-second' | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [allFirstAttempt, setAllFirstAttempt] = useState(true); // Track perfect score
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const quizRef = useRef<HTMLDivElement>(null);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { fireConfetti, fireSuccess } = useConfetti();

  // Sort quizzes by question_order
  const sortedQuizzes = [...quizzes].sort((a, b) => (a.question_order ?? 0) - (b.question_order ?? 0));

  const playlist: DayVideo[] = videos.length > 0
    ? videos
    : videoUrl
    ? [{ id: 'legacy', video_url: videoUrl, file_name: null, display_order: 0 }]
    : [];

  const currentVideo = playlist[currentVideoIdx] ?? null;
  const totalVideos = playlist.length;
  const totalQuestions = sortedQuizzes.length;
  const currentQuiz = sortedQuizzes[currentQuestionIdx];

  const resetState = () => {
    setStep('video');
    setCurrentVideoIdx(0);
    setCurrentQuestionIdx(0);
    setSelectedAnswer(null);
    setAttemptCount(0);
    setAnswerResult(null);
    setShowExplanation(false);
    setCorrectCount(0);
    setWrongCount(0);
    setAnsweredCount(0);
    setAllFirstAttempt(true);
    setIsPlaying(false);
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    };
  }, []);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) resetState();
    onOpenChange(isOpen);
  };

  const handleVideoEnded = () => {
    if (!videoWatched) onMarkVideoWatched();
    if (currentVideoIdx < totalVideos - 1) {
      setCurrentVideoIdx(prev => prev + 1);
    } else {
      goToQuiz();
    }
  };

  useEffect(() => {
    if (step === 'video' && videoRef.current && currentVideoIdx > 0) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [currentVideoIdx, step]);

  const goToQuiz = () => {
    setStep('quiz');
    setTimeout(() => {
      quizRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSkipToQuiz = () => {
    if (!videoWatched) onMarkVideoWatched();
    goToQuiz();
  };

  const handleSkipToNextVideo = () => {
    if (!videoWatched) onMarkVideoWatched();
    if (currentVideoIdx < totalVideos - 1) {
      setCurrentVideoIdx(prev => prev + 1);
    }
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleSeek = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime + seconds);
  };

  const handleVideoPlay = () => setIsPlaying(true);
  const handleVideoPause = () => setIsPlaying(false);

  const advanceToNextQuestion = () => {
    const newAnswered = answeredCount + 1;
    setAnsweredCount(newAnswered);

    if (newAnswered >= totalQuestions) {
      // Quiz finished
      const allCorrect = wrongCount === 0;
      if (allCorrect && allFirstAttempt) {
        // Perfect score! Show special screen
        setStep('perfect');
        fireConfetti();
        setTimeout(() => fireConfetti(), 500);
      }
      onSubmitQuiz(allCorrect, wrongCount);
    } else {
      // Move to next question
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedAnswer(null);
      setAttemptCount(0);
      setAnswerResult(null);
      setShowExplanation(false);
    }
  };

  const handleValidateAnswer = () => {
    if (selectedAnswer === null || !currentQuiz) return;

    const isCorrect = selectedAnswer === currentQuiz.correct_option;
    const currentAttempt = attemptCount + 1;
    setAttemptCount(currentAttempt);

    if (isCorrect) {
      // Correct answer
      if (currentAttempt === 1) {
        setAnswerResult('correct');
        setCorrectCount(prev => prev + 1);
      } else {
        setAnswerResult('correct-second');
        setCorrectCount(prev => prev + 1);
        setAllFirstAttempt(false);
      }
      onSaveQuizResponse(currentQuiz.id, selectedAnswer, currentAttempt, true);
      setShowExplanation(true);

      // Auto-advance after 4 seconds
      autoAdvanceTimerRef.current = setTimeout(() => {
        advanceToNextQuestion();
      }, 4000);
    } else {
      // Wrong answer
      if (currentAttempt === 1) {
        // First wrong attempt - allow retry
        setAnswerResult('wrong-first');
        onSaveQuizResponse(currentQuiz.id, selectedAnswer, 1, false);
        // Reset selection for second attempt after a moment
        setTimeout(() => {
          setSelectedAnswer(null);
          setAnswerResult(null);
        }, 1500);
      } else {
        // Second wrong attempt - show correct answer and explanation
        setAnswerResult('wrong-final');
        setWrongCount(prev => prev + 1);
        setAllFirstAttempt(false);
        onSaveQuizResponse(currentQuiz.id, selectedAnswer, 2, false);
        setShowExplanation(true);

        // Auto-advance after 4 seconds
        autoAdvanceTimerRef.current = setTimeout(() => {
          advanceToNextQuestion();
        }, 4000);
      }
    }
  };

  const handleContinue = () => {
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    advanceToNextQuestion();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-primary to-royal-dark text-primary-foreground rounded-t-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-primary-foreground">
              <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                <span className="font-bold">{dayNumber}</span>
              </div>
              <div>
                <div className="font-bold">Jour {dayNumber}</div>
                {theme && <p className="text-sm opacity-80 font-normal">{theme}</p>}
              </div>
              {theme && (
                <Badge variant="outline" className="ml-auto border-white/30 text-white text-xs">
                  {theme}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-4">
          {/* Perfect score screen */}
          {step === 'perfect' ? (
            <div className="text-center py-8 space-y-4 animate-fade-in">
              <div className="relative inline-block">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-gold to-yellow-400 flex items-center justify-center animate-scale-in">
                  <Trophy className="h-10 w-10 text-white" />
                </div>
                <Star className="absolute -top-2 -right-2 h-8 w-8 text-gold fill-gold animate-scale-in" />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Allahouma barik ! 🌟🏆
              </h3>
              <p className="text-lg font-semibold text-gold">
                Quel talent ! Sans-Faute parfait !
              </p>
              <p className="text-sm text-muted-foreground">
                Toutes les réponses correctes dès le premier coup !
              </p>
              <div className="flex items-center justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-gold fill-gold" />
                ))}
              </div>
            </div>
          ) : quizCompleted ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <h4 className="font-semibold text-foreground">Quiz complété !</h4>
              <p className="text-sm text-muted-foreground">
                Vous avez déjà validé ce jour. Bravo !
              </p>
              {playlist.length > 0 && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-muted-foreground">Revoir les vidéos :</p>
                  {playlist.map((v, idx) => (
                    <div key={v.id} className="space-y-1">
                      {playlist.length > 1 && (
                        <p className="text-xs text-muted-foreground text-left">Vidéo {idx + 1}</p>
                      )}
                      <div className="aspect-video rounded-xl overflow-hidden bg-black">
                        <video src={v.video_url} controls className="w-full h-full" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : step === 'video' ? (
            /* Video step — Playlist */
            <div className="space-y-4">
              {playlist.length > 0 && currentVideo ? (
                <>
                  {totalVideos > 1 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Vidéo {currentVideoIdx + 1} / {totalVideos}</span>
                      <div className="flex gap-1">
                        {playlist.map((_, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              'w-2 h-2 rounded-full transition-colors',
                              idx < currentVideoIdx ? 'bg-green-500' :
                              idx === currentVideoIdx ? 'bg-gold' : 'bg-muted'
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="aspect-video rounded-xl overflow-hidden bg-black relative group">
                    <video
                      ref={videoRef}
                      key={currentVideo.id}
                      src={currentVideo.video_url}
                      className="w-full h-full"
                      autoPlay={currentVideoIdx === 0}
                      onEnded={handleVideoEnded}
                      onPlay={handleVideoPlay}
                      onPause={handleVideoPause}
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => handleSeek(-10)}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-white/20" onClick={handlePlayPause}>
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" fill="currentColor" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => handleSeek(10)}>
                        <SkipForward className="h-4 w-4" />
                      </Button>
                      <span className="text-white text-xs ml-1">
                        {currentVideoIdx < totalVideos - 1 ? `Vidéo ${currentVideoIdx + 1}/${totalVideos}` : 'Dernière vidéo'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {currentVideoIdx < totalVideos - 1 && (
                      <Button onClick={handleSkipToNextVideo} variant="outline" className="flex-1">
                        <ChevronRight className="h-4 w-4 mr-2" />
                        Vidéo suivante
                      </Button>
                    )}
                    <Button onClick={handleSkipToQuiz} variant="outline" className="flex-1">
                      <ChevronRight className="h-4 w-4 mr-2" />
                      Passer au quiz
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Pas de vidéo pour ce jour</p>
                  <Button onClick={() => setStep('quiz')} className="mt-4">
                    Passer au quiz
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Quiz step — one question at a time with second chance */
            <div ref={quizRef} className="space-y-4">
              {currentQuiz && (
                <>
                  {/* Progress indicator */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Question {currentQuestionIdx + 1}/{totalQuestions}</span>
                    <div className="flex gap-1">
                      {sortedQuizzes.map((_, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            'w-2 h-2 rounded-full transition-colors',
                            idx < currentQuestionIdx ? 'bg-green-500' :
                            idx === currentQuestionIdx ? 'bg-gold' : 'bg-muted'
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border space-y-3">
                    <h4 className="font-semibold text-foreground text-sm">
                      {currentQuiz.question}
                    </h4>

                    {/* "Oups" message for first wrong attempt */}
                    {answerResult === 'wrong-first' && (
                      <div className="text-center py-2 px-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 animate-fade-in">
                        <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                          Oups, essaie encore ! 😊
                        </p>
                        <p className="text-xs text-orange-500 dark:text-orange-300 mt-1">
                          Deuxième et dernière tentative...
                        </p>
                      </div>
                    )}

                    <RadioGroup
                      value={selectedAnswer !== null ? selectedAnswer.toString() : ''}
                      onValueChange={(val) => {
                        if (!showExplanation && answerResult !== 'wrong-first') {
                          setSelectedAnswer(parseInt(val));
                        }
                      }}
                    >
                      {currentQuiz.options.map((option, optIdx) => {
                        const isCorrectOption = optIdx === currentQuiz.correct_option;
                        const showCorrect = showExplanation && isCorrectOption;
                        const showWrong = showExplanation && selectedAnswer === optIdx && !isCorrectOption;
                        const showWrongFinal = answerResult === 'wrong-final' && selectedAnswer === optIdx && !isCorrectOption;

                        return (
                          <div
                            key={optIdx}
                            className={cn(
                              'flex items-center space-x-3 p-2.5 rounded-lg border transition-colors',
                              showCorrect && 'border-green-500 bg-green-50 dark:bg-green-900/20',
                              (showWrong || showWrongFinal) && 'border-destructive bg-destructive/10',
                              !showExplanation && answerResult !== 'wrong-first' && 'hover:bg-muted/50'
                            )}
                          >
                            <RadioGroupItem
                              value={optIdx.toString()}
                              id={`q${currentQuestionIdx}-opt${optIdx}`}
                              disabled={showExplanation || answerResult === 'wrong-first'}
                            />
                            <Label
                              htmlFor={`q${currentQuestionIdx}-opt${optIdx}`}
                              className={cn(
                                'flex-1 cursor-pointer text-sm',
                                showCorrect && 'text-green-700 dark:text-green-400 font-medium',
                                (showWrong || showWrongFinal) && 'text-destructive'
                              )}
                            >
                              {option}
                              {showCorrect && ' ✓'}
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  </div>

                  {/* Explanation block */}
                  {showExplanation && (
                    <div className="animate-fade-in space-y-3">
                      {/* Result message */}
                      {(answerResult === 'correct' || answerResult === 'correct-second') && (
                        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                          <p className="text-sm font-medium text-green-600 dark:text-green-400">
                            {answerResult === 'correct' ? '✅ Bonne réponse du premier coup !' : '✅ Bonne réponse à la deuxième tentative !'}
                          </p>
                        </div>
                      )}
                      {answerResult === 'wrong-final' && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                          <p className="text-sm font-medium text-destructive">
                            ❌ Réponse incorrecte. La bonne réponse est indiquée en vert.
                          </p>
                        </div>
                      )}

                      {/* Explanation text */}
                      {currentQuiz.explanation && (
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">📖 Explication :</p>
                          <p className="text-sm text-blue-700 dark:text-blue-300">{currentQuiz.explanation}</p>
                        </div>
                      )}

                      {/* Continue button */}
                      <Button
                        onClick={handleContinue}
                        className="w-full bg-gradient-to-r from-primary to-royal-dark"
                      >
                        <ChevronRight className="h-4 w-4 mr-2" />
                        {currentQuestionIdx < totalQuestions - 1 ? 'Question suivante' : 'Terminer le quiz'}
                      </Button>
                    </div>
                  )}

                  {/* Validate button (only when no explanation shown and not in wrong-first state) */}
                  {!showExplanation && answerResult !== 'wrong-first' && (
                    <Button
                      onClick={handleValidateAnswer}
                      disabled={selectedAnswer === null}
                      className="w-full bg-gradient-to-r from-primary to-royal-dark"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Valider{attemptCount === 1 ? ' (2ème tentative)' : ''}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RamadanDayDialog;
