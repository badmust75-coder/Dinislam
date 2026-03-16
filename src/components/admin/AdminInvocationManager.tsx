import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  GripVertical, Plus, Pencil, Trash2, Upload, Loader2, Video, FileText, Volume2, Image as ImageIcon, File,
  Sun, Moon, CloudMoon, Home, Church, Plane, Shirt, Bath, UtensilsCrossed, CloudRain, Heart, BedDouble, Droplets, PawPrint, Activity, Hand, BookOpen, ArrowLeft,
} from 'lucide-react';
import ConfirmDeleteDialog from '@/components/ui/confirm-delete-dialog';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const getDefaultIcon = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('matin')) return Sun;
  if (t.includes('soir')) return Moon;
  if (t.includes('nuit')) return CloudMoon;
  if (t.includes('maison')) return Home;
  if (t.includes('mosquée') || t.includes('mosque')) return Church;
  if (t.includes('voyage')) return Plane;
  if (t.includes('habit')) return Shirt;
  if (t.includes('toilet')) return Bath;
  if (t.includes('nourriture') || t.includes('repas')) return UtensilsCrossed;
  if (t.includes('pluie')) return CloudRain;
  if (t.includes('mariage')) return Heart;
  if (t.includes('sommeil') || t.includes('dormir')) return BedDouble;
  if (t.includes('ablutions')) return Droplets;
  if (t.includes('animal')) return PawPrint;
  if (t.includes('maladie')) return Activity;
  if (t.includes('décès') || t.includes('mort')) return Hand;
  return BookOpen;
};

const SortableItem = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch gap-1">
      <button {...attributes} {...listeners} className="flex items-center px-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none">
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};

interface Props {
  onBack: () => void;
}

const AdminInvocationManager = ({ onBack }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Dialog states
  const [editingInvocation, setEditingInvocation] = useState<any>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [contentDialogInvId, setContentDialogInvId] = useState<number | null>(null);
  const [deleteInvId, setDeleteInvId] = useState<number | null>(null);
  const [deleteContentId, setDeleteContentId] = useState<string | null>(null);

  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingInvId, setUploadingInvId] = useState<number | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formTitleAr, setFormTitleAr] = useState('');
  const [formContentAr, setFormContentAr] = useState('');
  const [formContentFr, setFormContentFr] = useState('');
  const [formCategory, setFormCategory] = useState('quotidienne');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data: invocations = [], isLoading } = useQuery({
    queryKey: ['admin-invocations-full'],
    queryFn: async () => {
      const { data, error } = await supabase.from('invocations').select('*').order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: contents = [] } = useQuery({
    queryKey: ['admin-invocation-contents-full'],
    queryFn: async () => {
      const { data, error } = await supabase.from('invocation_content').select('*').order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  // CRUD mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formTitle.trim()) throw new Error('Le titre est requis');
      const payload = {
        title_french: formTitle,
        title_arabic: formTitleAr,
        content_arabic: formContentAr,
        content_french: formContentFr,
        category: formCategory,
      };
      if (editingInvocation) {
        const { error } = await supabase.from('invocations').update(payload).eq('id', editingInvocation.id);
        if (error) throw error;
      } else {
        const maxOrder = invocations.reduce((max: number, inv: any) => Math.max(max, inv.display_order ?? 0), -1);
        const { error } = await supabase.from('invocations').insert({ ...payload, display_order: maxOrder + 1 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invocations-full'] });
      queryClient.invalidateQueries({ queryKey: ['invocations-list'] });
      toast.success(editingInvocation ? 'Invocation modifiée ✅' : 'Invocation ajoutée ✅');
      setFormOpen(false);
      setEditingInvocation(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('invocations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invocations-full'] });
      queryClient.invalidateQueries({ queryKey: ['invocations-list'] });
      toast.success('Invocation supprimée');
      setDeleteInvId(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const reorderMutation = useMutation({
    mutationFn: async (newList: any[]) => {
      for (let i = 0; i < newList.length; i++) {
        await supabase.from('invocations').update({ display_order: i }).eq('id', newList[i].id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invocations-full'] });
      queryClient.invalidateQueries({ queryKey: ['invocations-list'] });
    },
  });

  const deleteContentMutation = useMutation({
    mutationFn: async (contentId: string) => {
      const content = contents.find((c: any) => c.id === contentId);
      if (content) {
        try {
          const url = new URL(content.file_url);
          const parts = url.pathname.split('/object/public/invocation-content/');
          if (parts[1]) await supabase.storage.from('invocation-content').remove([decodeURIComponent(parts[1])]);
        } catch { /* ignore */ }
      }
      const { error } = await supabase.from('invocation_content').delete().eq('id', contentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invocation-contents-full'] });
      queryClient.invalidateQueries({ queryKey: ['invocation-contents-all'] });
      toast.success('Contenu supprimé');
      setDeleteContentId(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  // Upload file (video/audio/pdf/image)
  const handleUploadContent = useCallback(async (invocationId: number, files: FileList) => {
    if (!user?.id) { toast.error('Non connecté'); return; }
    setIsUploading(true);
    setUploadingInvId(invocationId);
    try {
      const existingCount = contents.filter((c: any) => c.invocation_id === invocationId).length;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop();
        const path = `invocation-${invocationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('invocation-content').upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('invocation-content').getPublicUrl(path);
        let content_type = 'document';
        if (file.type.startsWith('video/')) content_type = 'video';
        else if (file.type.startsWith('audio/')) content_type = 'audio';
        else if (file.type === 'application/pdf') content_type = 'pdf';
        else if (file.type.startsWith('image/')) content_type = 'image';
        const { error: insErr } = await supabase.from('invocation_content').insert({
          invocation_id: invocationId, content_type, file_url: urlData.publicUrl,
          file_name: file.name, display_order: existingCount + i, uploaded_by: user.id,
        });
        if (insErr) throw insErr;
      }
      queryClient.invalidateQueries({ queryKey: ['admin-invocation-contents-full'] });
      queryClient.invalidateQueries({ queryKey: ['invocation-contents-all'] });
      toast.success(`${files.length} fichier(s) téléversé(s) ✅`);
    } catch (e: any) {
      toast.error(e.message || 'Erreur upload');
    } finally {
      setIsUploading(false);
      setUploadingInvId(null);
    }
  }, [user, contents, queryClient]);

  // Upload image for invocation card
  const handleUploadImage = useCallback(async (invocationId: number, file: File) => {
    setIsUploadingImage(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `invocation-icons/${invocationId}.${ext}`;
      const { error: upErr } = await supabase.storage.from('invocation-content').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('invocation-content').getPublicUrl(path);
      const { error } = await supabase.from('invocations').update({ image_url: urlData.publicUrl }).eq('id', invocationId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin-invocations-full'] });
      queryClient.invalidateQueries({ queryKey: ['invocations-list'] });
      toast.success('Image mise à jour ✅');
    } catch (e: any) {
      toast.error(e.message);
    }
    setIsUploadingImage(false);
  }, [queryClient]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !invocations.length) return;
    const oldIdx = invocations.findIndex((inv: any) => String(inv.id) === String(active.id));
    const newIdx = invocations.findIndex((inv: any) => String(inv.id) === String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    const newOrder = arrayMove(invocations, oldIdx, newIdx);
    reorderMutation.mutate(newOrder);
  };

  const openAdd = () => {
    setEditingInvocation(null);
    setFormTitle(''); setFormTitleAr(''); setFormContentAr(''); setFormContentFr(''); setFormCategory('quotidienne');
    setFormOpen(true);
  };

  const openEdit = (inv: any) => {
    setEditingInvocation(inv);
    setFormTitle(inv.title_french || '');
    setFormTitleAr(inv.title_arabic || '');
    setFormContentAr(inv.content_arabic || '');
    setFormContentFr(inv.content_french || '');
    setFormCategory(inv.category || 'quotidienne');
    setFormOpen(true);
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-3.5 w-3.5" />;
      case 'audio': return <Volume2 className="h-3.5 w-3.5" />;
      case 'pdf': return <FileText className="h-3.5 w-3.5 text-red-500" />;
      case 'image': return <ImageIcon className="h-3.5 w-3.5 text-blue-500" />;
      default: return <File className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" /> Retour</Button>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Ajouter une invocation</Button>
      </div>

      <div>
        <h2 className="text-xl font-bold text-foreground">Gestion des Invocations</h2>
        <p className="text-sm text-muted-foreground">Glissez-déposez pour réordonner. Cliquez sur 📷 pour changer l'image, sur 📁 pour ajouter du contenu.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={invocations.map((inv: any) => String(inv.id))} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {invocations.map((inv: any, index: number) => {
                const Icon = getDefaultIcon(inv.title_french);
                const invContents = contents.filter((c: any) => c.invocation_id === inv.id);
                const isThisUploading = isUploading && uploadingInvId === inv.id;

                return (
                  <SortableItem key={inv.id} id={String(inv.id)}>
                    <Card>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center gap-3">
                          {/* Icon / Image */}
                          <div className="relative shrink-0">
                            {inv.image_url ? (
                              <img src={inv.image_url} alt={inv.title_french} className="w-12 h-12 rounded-xl object-contain bg-muted" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-teal-400 to-teal-600">
                                <Icon className="h-6 w-6 text-white" />
                              </div>
                            )}
                            {/* Image upload overlay */}
                            <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/30 rounded-xl opacity-0 hover:opacity-100 transition-opacity">
                              <input type="file" accept="image/*" className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadImage(inv.id, f); e.target.value = ''; }}
                              />
                              <ImageIcon className="h-4 w-4 text-white" />
                            </label>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-muted-foreground">#{index + 1}</span>
                              <p className="font-bold text-sm text-foreground">{inv.title_french}</p>
                              {inv.category && (
                                <Badge variant="outline" className="text-xs">{inv.category}</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground font-arabic">{inv.title_arabic}</p>
                            <p className="text-xs text-muted-foreground">{invContents.length} contenu(s)</p>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-1 shrink-0">
                            {/* Upload content button */}
                            <div className="relative">
                              <input
                                type="file" multiple
                                accept="video/*,audio/*,application/pdf,image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => { if (e.target.files?.length) handleUploadContent(inv.id, e.target.files); e.target.value = ''; }}
                                disabled={isThisUploading}
                              />
                              <Button variant="outline" size="sm" disabled={isThisUploading} className="pointer-events-none h-8 px-2 gap-1">
                                {isThisUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                            <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => openEdit(inv)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 px-2 text-destructive hover:text-destructive" onClick={() => setDeleteInvId(inv.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Content list */}
                        {invContents.length > 0 && (
                          <div className="ml-14 space-y-1">
                            {invContents.map((content: any) => (
                              <div key={content.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-2 py-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {getContentIcon(content.content_type)}
                                  <span className="text-xs truncate">{content.file_name}</span>
                                  <Badge variant="secondary" className="text-[10px] shrink-0 px-1">{content.content_type}</Badge>
                                </div>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive shrink-0"
                                  onClick={() => setDeleteContentId(content.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </SortableItem>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent level="nested">
          <DialogHeader>
            <DialogTitle>{editingInvocation ? 'Modifier l\'invocation' : 'Ajouter une invocation'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Titre (Français) *</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Ex: Matin, Soir, Voyage..." />
            </div>
            <div>
              <Label>Titre (Arabe)</Label>
              <Input value={formTitleAr} onChange={e => setFormTitleAr(e.target.value)} placeholder="أذكار الصباح" className="font-arabic text-right" dir="rtl" />
            </div>
            <div>
              <Label>Texte de l'invocation (Arabe)</Label>
              <Textarea value={formContentAr} onChange={e => setFormContentAr(e.target.value)} placeholder="..." className="font-arabic text-right" dir="rtl" rows={3} />
            </div>
            <div>
              <Label>Traduction (Français)</Label>
              <Textarea value={formContentFr} onChange={e => setFormContentFr(e.target.value)} placeholder="Traduction..." rows={2} />
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quotidienne">Quotidienne</SelectItem>
                  <SelectItem value="lieu">Lieu</SelectItem>
                  <SelectItem value="événement">Événement</SelectItem>
                  <SelectItem value="nature">Nature</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm delete invocation */}
      <ConfirmDeleteDialog
        open={!!deleteInvId}
        onOpenChange={(open) => !open && setDeleteInvId(null)}
        onConfirm={() => { if (deleteInvId) deleteMutation.mutate(deleteInvId); }}
        description="Cette invocation et tout son contenu seront supprimés définitivement."
      />

      {/* Confirm delete content */}
      <ConfirmDeleteDialog
        open={!!deleteContentId}
        onOpenChange={(open) => !open && setDeleteContentId(null)}
        onConfirm={() => { if (deleteContentId) deleteContentMutation.mutate(deleteContentId); }}
        description="Ce fichier sera supprimé définitivement."
      />
    </div>
  );
};

export default AdminInvocationManager;
