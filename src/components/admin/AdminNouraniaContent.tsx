import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, Trash2, FileText, Video, Image, File, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const AdminNouraniaContent = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploadingLessonId, setUploadingLessonId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: lessons = [] } = useQuery({
    queryKey: ['admin-nourania-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nourania_lessons')
        .select('*')
        .order('lesson_number');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: contents = [] } = useQuery({
    queryKey: ['admin-nourania-contents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nourania_lesson_content')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const getContentType = (file: File): string => {
    if (file.type.startsWith('video/')) return 'video';
    if (file.type === 'application/pdf') return 'pdf';
    if (file.type.startsWith('image/')) return 'image';
    return 'document';
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'image': return <Image className="h-4 w-4" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async ({ lessonId, files }: { lessonId: number; files: FileList }) => {
      const existingCount = contents.filter(c => c.lesson_id === lessonId).length;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop();
        const filePath = `lesson-${lessonId}/${Date.now()}-${i}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('nourania-content')
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('nourania-content')
          .getPublicUrl(filePath);

        const { error: insertError } = await supabase
          .from('nourania_lesson_content')
          .insert({
            lesson_id: lessonId,
            content_type: getContentType(file),
            file_url: urlData.publicUrl,
            file_name: file.name,
            display_order: existingCount + i,
            uploaded_by: user?.id,
          });
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-nourania-contents'] });
      toast.success('Fichier(s) téléversé(s) avec succès');
      setUploadingLessonId(null);
    },
    onError: (error) => {
      toast.error('Erreur lors du téléversement');
      console.error(error);
      setUploadingLessonId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (contentId: string) => {
      const content = contents.find(c => c.id === contentId);
      if (!content) return;

      // Extract path from URL
      const url = new URL(content.file_url);
      const pathParts = url.pathname.split('/nourania-content/');
      if (pathParts[1]) {
        await supabase.storage.from('nourania-content').remove([pathParts[1]]);
      }

      const { error } = await supabase
        .from('nourania_lesson_content')
        .delete()
        .eq('id', contentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-nourania-contents'] });
      toast.success('Contenu supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const handleUploadClick = (lessonId: number) => {
    setUploadingLessonId(lessonId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && uploadingLessonId) {
      uploadMutation.mutate({ lessonId: uploadingLessonId, files: e.target.files });
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-foreground">Gestion du contenu Nourania</h3>
      <p className="text-sm text-muted-foreground">
        Téléversez des vidéos, PDF ou images pour chaque leçon.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,application/pdf,image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="space-y-3">
        {lessons.map((lesson) => {
          const lessonContents = contents.filter(c => c.lesson_id === lesson.id);

          return (
            <Card key={lesson.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">Leçon {lesson.lesson_number}</p>
                    <p className="text-sm text-muted-foreground">{lesson.title_french}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleUploadClick(lesson.id)}
                    disabled={uploadMutation.isPending && uploadingLessonId === lesson.id}
                    className="gap-2"
                  >
                    {uploadMutation.isPending && uploadingLessonId === lesson.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Ajouter
                  </Button>
                </div>

                {lessonContents.length > 0 && (
                  <div className="space-y-2">
                    {lessonContents.map((content) => (
                      <div
                        key={content.id}
                        className="flex items-center justify-between bg-muted/50 rounded-lg p-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {getContentIcon(content.content_type)}
                          <span className="text-sm truncate">{content.file_name}</span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {content.content_type}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(content.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {lessonContents.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Aucun contenu</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdminNouraniaContent;
