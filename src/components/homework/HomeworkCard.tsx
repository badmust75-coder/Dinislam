import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CheckCircle2, Clock, BookOpen, Sparkles, Hand, BookMarked, Moon, ExternalLink, FileText, Video, Music, Upload, Loader2, Mic, Square, Image as ImageIcon, FolderOpen, Play, Trash2, Send, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SUBJECTS: Record<string, { label: string; icon: typeof BookOpen; color: string; bg: string; path: string }> = {
  nourania: { label: 'Nourania', icon: Sparkles, color: 'text-sky-600', bg: 'bg-sky-100 dark:bg-sky-900/30', path: '/nourania' },
  alphabet: { label: 'Alphabet', icon: BookOpen, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30', path: '/alphabet' },
  invocation: { label: 'Invocation', icon: Hand, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/30', path: '/invocations' },
  sourate: { label: 'Sourate', icon: BookMarked, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30', path: '/sourates' },
  priere: { label: 'Prière', icon: Moon, color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30', path: '/priere' },
};

const HomeworkCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const imageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [renderDialogId, setRenderDialogId] = useState<string | null>(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio preview state (before sending)
  const [pendingAudioBlob, setPendingAudioBlob] = useState<Blob | null>(null);
  const [pendingAudioUrl, setPendingAudioUrl] = useState<string | null>(null);
  const [pendingAudioAssignmentId, setPendingAudioAssignmentId] = useState<string | null>(null);
  const [isSendingAudio, setIsSendingAudio] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, notification_prompt_dismissed, notification_prompt_later_count, notification_prompt_later_at')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['my-homework', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('homework_assignments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: submissions } = useQuery({
    queryKey: ['my-homework-submissions', user?.id],
    queryFn: async () => {
      if (!user || !assignments?.length) return [];
      const ids = assignments.map(a => a.id);
      const { data, error } = await supabase
        .from('homework_submissions')
        .select('*')
        .in('assignment_id', ids);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!assignments?.length,
  });

  const markComplete = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('homework_assignments')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', assignmentId)
        .eq('user_id', user?.id);
      if (error) throw error;

      const assignment = assignments?.find(a => a.id === assignmentId);
      const subjectLabel = assignment ? (SUBJECTS[assignment.subject]?.label || assignment.subject) : '';
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            title: '✅ Devoir terminé',
            body: `${profile?.full_name || 'Un élève'} a terminé : ${assignment?.title || ''} (${subjectLabel})`,
            type: 'admin',
            data: { url: '/admin?section=cahier-texte' },
          },
        });
      } catch (e) {
        console.error('Push notification error:', e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-homework'] });
      toast.success('Devoir marqué comme terminé ! ✅');
    },
  });

  const uploadFile = async (assignmentId: string, file: File) => {
    if (!user) return;
    setUploadingId(assignmentId);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/${assignmentId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('homework-submissions')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('homework-submissions')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('homework_submissions')
        .insert({
          assignment_id: assignmentId,
          user_id: user.id,
          file_url: publicUrl,
          file_name: file.name,
          content_type: file.type,
        });
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['my-homework-submissions'] });
      toast.success('Fichier déposé avec succès ! 📎');

      const assignment = assignments?.find(a => a.id === assignmentId);
      const subjectLabel = assignment ? (SUBJECTS[assignment.subject]?.label || assignment.subject) : '';
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            title: '📎 Nouveau fichier rendu',
            body: `${profile?.full_name || 'Un élève'} a déposé un fichier pour : ${assignment?.title || ''} (${subjectLabel})`,
            type: 'admin',
            data: { url: '/admin?section=cahier-texte' },
          },
        });
      } catch (e) {
        console.error('Push notification error:', e);
      }
    } catch (err: any) {
      toast.error('Erreur: ' + err.message);
    } finally {
      setUploadingId(null);
      setRenderDialogId(null);
    }
  };

  const startRecording = async (assignmentId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordingTime(0);
      setPendingAudioAssignmentId(assignmentId);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setPendingAudioBlob(audioBlob);
        setPendingAudioUrl(url);
        setIsRecording(false);
        setRecordingTime(0);
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      toast.error("Impossible d'accéder au microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const confirmSendAudio = async () => {
    if (!pendingAudioBlob || !pendingAudioAssignmentId) return;
    setIsSendingAudio(true);
    try {
      const audioFile = new File([pendingAudioBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
      await uploadFile(pendingAudioAssignmentId, audioFile);
      clearPendingAudio();
    } catch (err: any) {
      toast.error('Erreur: ' + err.message);
    } finally {
      setIsSendingAudio(false);
    }
  };

  const clearPendingAudio = () => {
    if (pendingAudioUrl) URL.revokeObjectURL(pendingAudioUrl);
    setPendingAudioBlob(null);
    setPendingAudioUrl(null);
    setPendingAudioAssignmentId(null);
  };

  const reRecord = () => {
    clearPendingAudio();
    if (renderDialogId) startRecording(renderDialogId);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const pendingAssignments = assignments?.filter(a => a.status === 'pending') || [];
  const completedAssignments = assignments?.filter(a => a.status === 'completed') || [];

  if (isLoading || !assignments?.length) return null;

  const goToLesson = (subject: string, lessonRef?: string | null) => {
    const subjectInfo = SUBJECTS[subject];
    if (!subjectInfo) return;
    const path = lessonRef
      ? `${subjectInfo.path}?lesson=${encodeURIComponent(lessonRef)}`
      : subjectInfo.path;
    navigate(path);
  };

  const renderSubmissionItem = (sub: any) => {
    const isAudio = sub.content_type?.startsWith('audio');
    if (isAudio) {
      return (
        <div key={sub.id} className="bg-primary/5 rounded px-2 py-1.5">
          <div className="flex items-center gap-1 mb-1">
            <Music className="h-3 w-3 text-primary" />
            <span className="text-[10px] text-muted-foreground truncate">{sub.file_name}</span>
          </div>
          <audio src={sub.file_url} controls className="w-full h-8" />
        </div>
      );
    }
    return (
      <a
        key={sub.id}
        href={sub.file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline bg-primary/5 rounded px-1.5 py-0.5"
      >
        {sub.content_type?.startsWith('video') ? <Video className="h-3 w-3" /> :
         <FileText className="h-3 w-3" />}
        {sub.file_name}
      </a>
    );
  };

  return (
    <>
      <div className="relative bg-card rounded-2xl shadow-card border border-border overflow-hidden animate-fade-in">
        {/* Notebook spiral effect */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-amber-100 to-amber-50 dark:from-amber-900/20 dark:to-transparent border-r-2 border-dashed border-amber-300 dark:border-amber-700 flex flex-col items-center justify-start pt-4 gap-4">
          {[...Array(Math.max(3, (pendingAssignments.length + completedAssignments.length)))].map((_, i) => (
            <div key={i} className="w-4 h-4 rounded-full border-2 border-amber-400 dark:border-amber-600 bg-card" />
          ))}
        </div>

        <div className="pl-10 pr-4 py-4 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className="text-lg">📓</span>
            <h3 className="font-bold text-foreground text-base">Cahier de texte</h3>
            {pendingAssignments.length > 0 && (
              <Badge className="bg-amber-500 text-white text-xs ml-auto">
                {pendingAssignments.length} à faire
              </Badge>
            )}
          </div>

          {/* Pending assignments */}
          {pendingAssignments.map(assignment => {
            const subjectInfo = SUBJECTS[assignment.subject] || SUBJECTS.nourania;
            const Icon = subjectInfo.icon;
            const assignmentSubs = submissions?.filter(s => s.assignment_id === assignment.id) || [];
            const isUploading = uploadingId === assignment.id;

            return (
              <div key={assignment.id} className="border-l-3 border-primary/50 pl-3 py-2 space-y-2">
                <div className="flex items-start gap-2">
                  <div className={cn('p-1.5 rounded-lg shrink-0', subjectInfo.bg)}>
                    <Icon className={cn('h-4 w-4', subjectInfo.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{subjectInfo.label}</Badge>
                      <Clock className="h-3 w-3 text-amber-500" />
                    </div>
                    <p className="font-semibold text-foreground text-sm mt-0.5">{assignment.title}</p>
                    {assignment.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{assignment.description}</p>
                    )}
                    {assignment.audio_url && (
                      <div className="mt-1">
                        <p className="text-[10px] text-muted-foreground mb-0.5">🎙️ Audio du prof :</p>
                        <audio src={assignment.audio_url} controls className="w-full h-8" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => goToLesson(assignment.subject, assignment.lesson_reference)}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" /> Aller à la leçon
                  </Button>

                  {/* Hidden file inputs */}
                  <input
                    ref={el => { fileInputRefs.current[assignment.id] = el; }}
                    type="file"
                    className="hidden"
                    accept="*/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) uploadFile(assignment.id, file);
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={el => { imageInputRefs.current[assignment.id] = el; }}
                    type="file"
                    className="hidden"
                    accept="image/*,video/*"
                    capture="environment"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) uploadFile(assignment.id, file);
                      e.target.value = '';
                    }}
                  />

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setRenderDialogId(assignment.id)}
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                    Rendre
                  </Button>

                  <Button
                    size="sm"
                    className="h-7 text-xs bg-green-500 hover:bg-green-600 text-white"
                    onClick={() => markComplete.mutate(assignment.id)}
                    disabled={markComplete.isPending}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Valider
                  </Button>
                </div>

                {/* Submitted files */}
                {assignmentSubs.length > 0 && (
                  <div className="space-y-1">
                    {assignmentSubs.map(sub => renderSubmissionItem(sub))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Completed assignments - only latest per subject */}
          {completedAssignments.length > 0 && (() => {
            // Group by subject, keep only the most recent per subject
            const latestBySubject = new Map<string, typeof completedAssignments[0]>();
            for (const a of completedAssignments) {
              if (!latestBySubject.has(a.subject)) {
                latestBySubject.set(a.subject, a); // already sorted by created_at desc
              }
            }
            const latestList = Array.from(latestBySubject.values());
            return (
              <div className="pt-1 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">✅ Terminés ({completedAssignments.length})</p>
                {latestList.map(assignment => {
                  const subjectInfo = SUBJECTS[assignment.subject] || SUBJECTS.nourania;
                  return (
                    <div key={assignment.id} className="flex items-center gap-2 py-1 opacity-60">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{subjectInfo.label}</Badge>
                      <span className="text-xs text-muted-foreground line-through">{assignment.title}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Render dialog - file type picker */}
      <Dialog open={!!renderDialogId} onOpenChange={(open) => { if (!open && !isRecording) { setRenderDialogId(null); clearPendingAudio(); } }}>
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-base">Rendre un devoir</DialogTitle>
            <DialogDescription className="text-center text-xs">Choisissez le type de fichier à envoyer</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {/* Audio preview (after recording, before sending) */}
            {pendingAudioUrl ? (
              <div className="space-y-2 p-3 bg-muted/50 rounded-xl">
                <p className="text-xs font-semibold text-foreground text-center">🎙️ Aperçu de l'enregistrement</p>
                <audio src={pendingAudioUrl} controls className="w-full h-10" />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={clearPendingAudio}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    Supprimer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={reRecord}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Refaire
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 gap-1 bg-green-500 hover:bg-green-600 text-white"
                    onClick={confirmSendAudio}
                    disabled={isSendingAudio}
                  >
                    {isSendingAudio ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Envoyer
                  </Button>
                </div>
              </div>
            ) : isRecording ? (
              <Button
                variant="destructive"
                className="w-full justify-start gap-3 h-12 text-sm"
                onClick={stopRecording}
              >
                <Square className="h-5 w-5 fill-current" />
                <span>Arrêter l'enregistrement</span>
                <span className="ml-auto font-mono text-xs">{formatTime(recordingTime)}</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12 text-sm"
                onClick={() => renderDialogId && startRecording(renderDialogId)}
              >
                <Mic className="h-5 w-5 text-red-500" />
                <span>Enregistrer un audio</span>
              </Button>
            )}

            {/* Photo library */}
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12 text-sm"
              onClick={() => {
                if (renderDialogId) {
                  const input = imageInputRefs.current[renderDialogId];
                  if (input) {
                    input.removeAttribute('capture');
                    input.click();
                  }
                }
              }}
              disabled={isRecording || !!pendingAudioUrl}
            >
              <ImageIcon className="h-5 w-5 text-blue-500" />
              <span>Photothèque</span>
            </Button>

            {/* Take photo/video */}
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12 text-sm"
              onClick={() => {
                if (renderDialogId) {
                  const input = imageInputRefs.current[renderDialogId];
                  if (input) {
                    input.setAttribute('capture', 'environment');
                    input.click();
                  }
                }
              }}
              disabled={isRecording || !!pendingAudioUrl}
            >
              <Video className="h-5 w-5 text-green-500" />
              <span>Prendre une photo ou une vidéo</span>
            </Button>

            {/* Choose file */}
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12 text-sm"
              onClick={() => {
                if (renderDialogId) fileInputRefs.current[renderDialogId]?.click();
              }}
              disabled={isRecording || !!pendingAudioUrl}
            >
              <FolderOpen className="h-5 w-5 text-amber-500" />
              <span>Choisir le fichier</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HomeworkCard;
