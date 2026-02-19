import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, BookOpen, Sparkles, Hand, BookMarked, Moon, ExternalLink, FileText, Video, Music, Upload, Loader2 } from 'lucide-react';
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
  const [uploadingId, setUploadingId] = useState<string | null>(null);

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
    } catch (err: any) {
      toast.error('Erreur: ' + err.message);
    } finally {
      setUploadingId(null);
    }
  };

  const pendingAssignments = assignments?.filter(a => a.status === 'pending') || [];
  const completedAssignments = assignments?.filter(a => a.status === 'completed') || [];

  if (isLoading || !assignments?.length) return null;

  const goToLesson = (subject: string, lessonRef?: string | null) => {
    const subjectInfo = SUBJECTS[subject];
    if (!subjectInfo) return;
    navigate(subjectInfo.path);
  };

  return (
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

                {/* File upload buttons */}
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
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => fileInputRefs.current[assignment.id]?.click()}
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
                <div className="flex flex-wrap gap-1">
                  {assignmentSubs.map(sub => (
                    <a
                      key={sub.id}
                      href={sub.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline bg-primary/5 rounded px-1.5 py-0.5"
                    >
                      {sub.content_type.startsWith('video') ? <Video className="h-3 w-3" /> :
                       sub.content_type.startsWith('audio') ? <Music className="h-3 w-3" /> :
                       <FileText className="h-3 w-3" />}
                      {sub.file_name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Completed assignments (collapsed view) */}
        {completedAssignments.length > 0 && (
          <div className="pt-1 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">✅ Terminés ({completedAssignments.length})</p>
            {completedAssignments.map(assignment => {
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
        )}
      </div>
    </div>
  );
};

export default HomeworkCard;
