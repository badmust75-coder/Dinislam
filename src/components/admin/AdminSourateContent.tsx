import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Unlock, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmDeleteDialog from '@/components/ui/confirm-delete-dialog';
import ContentUploadTabs from './ContentUploadTabs';
import ContentItemCard, { ContentType } from './ContentItemCard';
import AdminSourateVersets from './AdminSourateVersets';

const AdminSourateContent = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [deleteContentId, setDeleteContentId] = useState<string | null>(null);

  const { data: sourates = [] } = useQuery({
    queryKey: ['admin-sourates-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sourates').select('*').order('number', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: contents = [], refetch: refetchContents } = useQuery({
    queryKey: ['admin-sourate-contents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sourate_content').select('*').order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-profiles-for-unlock'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id, full_name, email').order('full_name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: unlocks = [], refetch: refetchUnlocks } = useQuery({
    queryKey: ['admin-sourate-unlocks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sourate_admin_unlocks').select('*');
      if (error) throw error;
      return data || [];
    },
  });

  const uploadToStorage = useCallback(async (sourateId: string, file: File, contentType: string) => {
    if (!user?.id) { toast.error('Vous devez être connecté'); return; }
    setIsUploading(true);
    try {
      const existingCount = contents.filter(c => c.sourate_id === sourateId).length;
      const ext = file.name.split('.').pop();
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `sourate-${sourateId}/${uniqueName}`;
      const { error: uploadError } = await supabase.storage.from('sourate-content').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (uploadError) { toast.error(`Erreur upload: ${uploadError.message}`); return; }
      const { data: urlData } = supabase.storage.from('sourate-content').getPublicUrl(filePath);
      const defaultTitle = contentType === 'audio' ? 'Audio' : file.name;
      const { error: insertError } = await supabase.from('sourate_content').insert({
        sourate_id: sourateId, content_type: contentType, file_url: urlData.publicUrl,
        file_name: defaultTitle, display_order: existingCount, uploaded_by: user.id,
      });
      if (insertError) { toast.error(`Erreur: ${insertError.message}`); return; }
      await refetchContents();
      toast.success('Contenu ajouté ✅');
    } catch (error) { console.error(error); }
    finally { setIsUploading(false); }
  }, [user, contents, refetchContents]);

  const handleAddYoutube = useCallback(async (sourateId: string, embedUrl: string) => {
    if (!user?.id) return;
    setIsUploading(true);
    try {
      const existingCount = contents.filter(c => c.sourate_id === sourateId).length;
      const { error } = await supabase.from('sourate_content').insert({
        sourate_id: sourateId, content_type: 'youtube', file_url: embedUrl,
        file_name: 'Vidéo YouTube', display_order: existingCount, uploaded_by: user.id,
      });
      if (error) { toast.error(error.message); return; }
      await refetchContents();
      toast.success('Lien YouTube ajouté ✅');
    } catch (error) { console.error(error); }
    finally { setIsUploading(false); }
  }, [user, contents, refetchContents]);

  const updateTitleMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from('sourate_content').update({ file_name: title }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-sourate-contents'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (contentId: string) => {
      const content = contents.find(c => c.id === contentId);
      if (!content) return;
      if (content.content_type !== 'youtube') {
        try {
          const url = new URL(content.file_url);
          const bucketPath = url.pathname.split('/object/public/sourate-content/');
          if (bucketPath[1]) await supabase.storage.from('sourate-content').remove([decodeURIComponent(bucketPath[1])]);
        } catch (e) { console.warn(e); }
      }
      const { error } = await supabase.from('sourate_content').delete().eq('id', contentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sourate-contents'] });
      toast.success('Contenu supprimé');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const toggleUnlock = async (userId: string, sourateId: string) => {
    const existing = unlocks.find(u => u.user_id === userId && u.sourate_id === sourateId);
    if (existing) {
      await supabase.from('sourate_admin_unlocks').delete().eq('id', existing.id);
    } else {
      await supabase.from('sourate_admin_unlocks').insert({ user_id: userId, sourate_id: sourateId, unlocked_by: user?.id });
    }
    refetchUnlocks();
    toast.success(existing ? 'Sourate verrouillée' : 'Sourate déverrouillée');
  };

  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const mapContentType = (type: string): ContentType => {
    if (type === 'youtube') return 'youtube';
    if (type === 'audio') return 'audio';
    return 'fichier';
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-foreground">Gestion du contenu Sourates</h3>
      <p className="text-sm text-muted-foreground">Ajoutez des fichiers, vidéos YouTube ou audio pour chaque sourate. Débloquez des sourates pour vos élèves.</p>

      {/* Student unlock section */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="font-bold flex items-center gap-2">
            <Unlock className="h-4 w-4" />
            Débloquer des sourates pour un élève
          </h4>
          <select
            className="w-full p-2 border rounded-lg bg-background text-foreground"
            value={selectedStudent || ''}
            onChange={(e) => setSelectedStudent(e.target.value || null)}
          >
            <option value="">Sélectionner un élève...</option>
            {profiles.map(p => (
              <option key={p.user_id} value={p.user_id}>{p.full_name || p.email || 'Élève'}</option>
            ))}
          </select>
          {selectedStudent && (
            <div className="max-h-60 overflow-y-auto space-y-1">
              {sourates.map(s => {
                const isUnlocked = unlocks.some(u => u.user_id === selectedStudent && u.sourate_id === s.id);
                return (
                  <div key={s.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <span className="text-sm">{s.number}. {s.name_french}</span>
                    <Button variant={isUnlocked ? 'default' : 'outline'} size="sm" onClick={() => toggleUnlock(selectedStudent, s.id)}>
                      {isUnlocked ? <Unlock className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                      {isUnlocked ? 'Débloqué' : 'Débloquer'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content per sourate */}
      <div className="space-y-3">
        {sourates.map((sourate) => {
          const sourateContents = contents.filter(c => c.sourate_id === sourate.id);
          return (
            <Card key={sourate.id}>
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="font-bold">{sourate.number}. {sourate.name_french}</p>
                  <p className="text-sm text-muted-foreground font-arabic">{sourate.name_arabic}</p>
                </div>
                {sourateContents.length > 0 && (
                  <div className="space-y-1.5">
                    {sourateContents.map((content) => (
                      <ContentItemCard
                        key={content.id}
                        id={content.id}
                        title={content.file_name}
                        contentType={mapContentType(content.content_type)}
                        url={content.file_url}
                        onDelete={(id) => setDeleteContentId(id)}
                        onUpdateTitle={(id, title) => updateTitleMutation.mutate({ id, title })}
                        deleteDisabled={deleteMutation.isPending}
                      />
                    ))}
                  </div>
                )}
                {sourateContents.length === 0 && <p className="text-xs text-muted-foreground italic">Aucun contenu</p>}
                <ContentUploadTabs
                  onUploadFile={(file) => uploadToStorage(sourate.id, file, 'fichier')}
                  onAddYoutubeLink={(url) => handleAddYoutube(sourate.id, url)}
                  onUploadAudio={(file) => uploadToStorage(sourate.id, file, 'audio')}
                  isUploading={isUploading}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
      <ConfirmDeleteDialog
        open={!!deleteContentId}
        onOpenChange={(open) => !open && setDeleteContentId(null)}
        onConfirm={() => { if (deleteContentId) deleteMutation.mutate(deleteContentId); setDeleteContentId(null); }}
        description="Ce contenu sera supprimé définitivement."
      />
    </div>
  );
};

export default AdminSourateContent;
