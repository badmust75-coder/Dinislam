import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, BookOpen, Sparkles, Hand, BookMarked, Moon, CheckCircle2, Clock, FileText, Video, Music, Mic, Square, Loader2, RotateCcw, Send, Play } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AdminHomeworkProps {
  onBack: () => void;
}

const SUBJECTS = [
  { value: 'nourania', label: 'Nourania', icon: Sparkles, color: 'text-sky-600', bg: 'bg-sky-100' },
  { value: 'alphabet', label: 'Alphabet', icon: BookOpen, color: 'text-orange-600', bg: 'bg-orange-100' },
  { value: 'invocation', label: 'Invocation', icon: Hand, color: 'text-teal-600', bg: 'bg-teal-100' },
  { value: 'sourate', label: 'Sourate', icon: BookMarked, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  { value: 'priere', label: 'Prière', icon: Moon, color: 'text-rose-600', bg: 'bg-rose-100' },
] as const;

const AdminHomework = ({ onBack }: AdminHomeworkProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newSubject, setNewSubject] = useState<string>('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLessonRef, setNewLessonRef] = useState('');

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio preview state (record first, preview before upload)
  const [pendingAudioBlob, setPendingAudioBlob] = useState<Blob | null>(null);
  const [pendingAudioPreviewUrl, setPendingAudioPreviewUrl] = useState<string | null>(null);

  // Fetch all students
  const { data: students } = useQuery({
    queryKey: ['admin-homework-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .eq('is_approved', true)
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch assignments for selected student
  const { data: assignments } = useQuery({
    queryKey: ['admin-homework-assignments', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const { data, error } = await supabase
        .from('homework_assignments')
        .select('*')
        .eq('user_id', selectedUserId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedUserId,
  });

  // Fetch submissions for selected student's assignments
  const { data: submissions } = useQuery({
    queryKey: ['admin-homework-submissions', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId || !assignments?.length) return [];
      const ids = assignments.map(a => a.id);
      const { data, error } = await supabase
        .from('homework_submissions')
        .select('*')
        .in('assignment_id', ids)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedUserId && !!assignments?.length,
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordingTime(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const previewUrl = URL.createObjectURL(audioBlob);
        setPendingAudioBlob(audioBlob);
        setPendingAudioPreviewUrl(previewUrl);
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

  const confirmAudio = async () => {
    if (!pendingAudioBlob) return;
    setIsUploadingAudio(true);
    try {
      const audioFile = new File([pendingAudioBlob], `admin_audio_${Date.now()}.webm`, { type: 'audio/webm' });
      const filePath = `admin/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('homework-submissions')
        .upload(filePath, audioFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('homework-submissions')
        .getPublicUrl(filePath);

      setAudioUrl(publicUrl);
      clearPendingAudio();
      toast.success('Audio enregistré ✅');
    } catch (err: any) {
      toast.error('Erreur upload audio: ' + err.message);
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const clearPendingAudio = () => {
    if (pendingAudioPreviewUrl) URL.revokeObjectURL(pendingAudioPreviewUrl);
    setPendingAudioBlob(null);
    setPendingAudioPreviewUrl(null);
  };

  const reRecord = () => {
    clearPendingAudio();
    startRecording();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const addAssignment = useMutation({
    mutationFn: async () => {
      if (!selectedUserId || !newSubject || !newTitle || !user) return;
      const { error } = await supabase.from('homework_assignments').insert({
        user_id: selectedUserId,
        subject: newSubject,
        title: newTitle,
        description: newDescription || null,
        lesson_reference: newLessonRef || null,
        audio_url: audioUrl || null,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-homework-assignments', selectedUserId] });
      setNewTitle('');
      setNewDescription('');
      setNewLessonRef('');
      setNewSubject('');
      setAudioUrl(null);
      toast.success('Devoir ajouté');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('homework_assignments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-homework-assignments', selectedUserId] });
      toast.success('Devoir supprimé');
    },
  });

  const selectedStudent = students?.find(s => s.user_id === selectedUserId);

  const getSubjectInfo = (subject: string) => SUBJECTS.find(s => s.value === subject) || SUBJECTS[0];

  const renderSubmissionItem = (sub: any) => {
    const isAudio = sub.content_type?.startsWith('audio');
    if (isAudio) {
      return (
        <div key={sub.id} className="bg-muted/50 rounded-lg p-2 space-y-1">
          <div className="flex items-center gap-1">
            <Music className="h-3 w-3 text-primary" />
            <span className="text-xs text-muted-foreground truncate">{sub.file_name}</span>
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
        className="flex items-center gap-2 text-xs text-primary hover:underline"
      >
        {sub.content_type?.startsWith('video') ? <Video className="h-3 w-3" /> :
         <FileText className="h-3 w-3" />}
        {sub.file_name}
      </a>
    );
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Retour
      </Button>

      <h2 className="text-xl font-bold text-foreground">📓 Cahier de texte</h2>

      {!selectedUserId ? (
        /* Student list */
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Sélectionnez un élève pour gérer ses devoirs :</p>
          {students?.map(student => (
            <Card
              key={student.user_id}
              className="cursor-pointer hover:shadow-md transition-all"
              onClick={() => setSelectedUserId(student.user_id)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {(student.full_name || 'É')[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{student.full_name || 'Sans nom'}</p>
                  <p className="text-xs text-muted-foreground">{student.email}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Assignment management for selected student */
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setSelectedUserId(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Liste
            </Button>
            <h3 className="text-lg font-bold text-foreground">
              Devoirs de {selectedStudent?.full_name || 'Élève'}
            </h3>
          </div>

          {/* Add new assignment form */}
          <Card className="border-dashed border-2 border-primary/30">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Plus className="h-4 w-4" /> Nouveau devoir
              </p>
              <Select value={newSubject} onValueChange={setNewSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Matière" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Titre du devoir"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
              />
              <Textarea
                placeholder="Description (optionnel)"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                rows={2}
              />
              <Input
                placeholder="Référence leçon (ex: 5 pour Leçon 5)"
                value={newLessonRef}
                onChange={e => setNewLessonRef(e.target.value)}
              />

              {/* Audio recording for admin */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">🎙️ Audio (optionnel) :</p>

                {/* Pending audio preview (recorded but not yet confirmed) */}
                {pendingAudioPreviewUrl ? (
                  <div className="space-y-2 p-3 bg-muted/50 rounded-xl">
                    <p className="text-xs font-semibold text-foreground text-center">🎙️ Aperçu de l'enregistrement</p>
                    <audio src={pendingAudioPreviewUrl} controls className="w-full h-10" />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={clearPendingAudio}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" /> Supprimer
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={reRecord}>
                        <RotateCcw className="h-3.5 w-3.5" /> Refaire
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 gap-1 bg-green-500 hover:bg-green-600 text-white"
                        onClick={confirmAudio}
                        disabled={isUploadingAudio}
                      >
                        {isUploadingAudio ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        Valider
                      </Button>
                    </div>
                  </div>
                ) : isRecording ? (
                  <Button
                    variant="destructive"
                    className="w-full justify-center gap-2"
                    onClick={stopRecording}
                  >
                    <Square className="h-4 w-4 fill-current" />
                    Arrêter l'enregistrement
                    <span className="ml-2 font-mono text-xs">{formatTime(recordingTime)}</span>
                  </Button>
                ) : isUploadingAudio ? (
                  <Button disabled className="w-full justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Upload en cours...
                  </Button>
                ) : audioUrl ? (
                  <div className="space-y-1">
                    <audio src={audioUrl} controls className="w-full h-8" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive"
                      onClick={() => setAudioUrl(null)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Supprimer l'audio
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full justify-center gap-2"
                    onClick={startRecording}
                  >
                    <Mic className="h-4 w-4 text-red-500" />
                    Enregistrer un audio
                  </Button>
                )}
              </div>

              <Button
                onClick={() => addAssignment.mutate()}
                disabled={!newSubject || !newTitle || addAssignment.isPending}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" /> Ajouter le devoir
              </Button>
            </CardContent>
          </Card>

          {/* Existing assignments */}
          {assignments?.length === 0 && (
            <p className="text-center text-muted-foreground py-6">Aucun devoir assigné</p>
          )}
          {assignments?.map(assignment => {
            const subjectInfo = getSubjectInfo(assignment.subject);
            const Icon = subjectInfo.icon;
            const assignmentSubmissions = submissions?.filter(s => s.assignment_id === assignment.id) || [];
            return (
              <Card key={assignment.id} className={cn(
                'transition-all',
                assignment.status === 'completed' ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20' : ''
              )}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={cn('p-2 rounded-lg', subjectInfo.bg)}>
                        <Icon className={cn('h-4 w-4', subjectInfo.color)} />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{assignment.title}</p>
                        <Badge variant="outline" className="text-xs mt-1">{subjectInfo.label}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {assignment.status === 'completed' ? (
                        <Badge className="bg-green-500 text-white">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Terminé
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          <Clock className="h-3 w-3 mr-1" /> En cours
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteAssignment.mutate(assignment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {assignment.description && (
                    <p className="text-xs text-muted-foreground">{assignment.description}</p>
                  )}
                  {assignment.lesson_reference && (
                    <p className="text-xs text-primary">📌 Réf: Leçon {assignment.lesson_reference}</p>
                  )}
                  {assignment.audio_url && (
                    <div className="mt-1">
                      <p className="text-xs font-semibold text-foreground mb-1">🎙️ Audio :</p>
                      <audio src={assignment.audio_url} controls className="w-full h-8" />
                    </div>
                  )}
                  {/* Submissions */}
                  {assignmentSubmissions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-semibold text-foreground">📎 Fichiers rendus :</p>
                      {assignmentSubmissions.map(sub => renderSubmissionItem(sub))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminHomework;
