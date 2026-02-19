/**
 * AdminAllahNamesManager — Gestion admin des 99 Noms d'Allah
 * Supports: CRUD, Drag & Drop reorder, image upload, video/audio/PDF per name
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  GripVertical, Pencil, Trash2, ArrowLeft, Loader2, Image as ImageIcon,
  Play, Music, FileText, ChevronDown, ChevronUp, Upload,
} from 'lucide-react';
import ConfirmDeleteDialog from '@/components/ui/confirm-delete-dialog';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableItem = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch gap-1">
      <button {...attributes} {...listeners} className="flex items-center px-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none">
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};

interface Props { onBack: () => void; }

const AdminAllahNamesManager = ({ onBack }: Props) => {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingName, setEditingName] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState<{ nameId: number; type: string } | null>(null);

  const [formNameAr, setFormNameAr] = useState('');
  const [formNameFr, setFormNameFr] = useState('');
  const [formTranslit, setFormTranslit] = useState('');
  const [formExplanation, setFormExplanation] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data: names = [], isLoading } = useQuery({
    queryKey: ['admin-allah-names'],
    queryFn: async () => {
      const { data, error } = await supabase.from('allah_names').select('*').order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allMedia = [] } = useQuery({
    queryKey: ['admin-allah-name-media'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('allah_name_media').select('*');
      if (error) throw error;
      return data || [];
    },
  });

  const getNameMedia = (nameId: number) => (allMedia as any[]).filter((m: any) => m.name_id === nameId);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formNameAr.trim() || !formNameFr.trim()) throw new Error('Les noms arabe et français sont requis');
      const payload = {
        name_arabic: formNameAr,
        name_french: formNameFr,
        transliteration: formTranslit || null,
        explanation: formExplanation || null,
      };
      if (editingName) {
        const { error } = await supabase.from('allah_names').update(payload).eq('id', editingName.id);
        if (error) throw error;
      } else {
        const maxOrder = (names as any[]).reduce((max: number, n: any) => Math.max(max, n.display_order ?? 0), 0);
        const { error } = await supabase.from('allah_names').insert({ ...payload, display_order: maxOrder + 1 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-allah-names'] });
      queryClient.invalidateQueries({ queryKey: ['allah-names'] });
      toast.success(editingName ? 'Nom modifié ✅' : 'Nom ajouté ✅');
      setFormOpen(false);
      setEditingName(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('allah_names').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-allah-names'] });
      queryClient.invalidateQueries({ queryKey: ['allah-names'] });
      toast.success('Nom supprimé');
      setDeleteId(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const deleteMediaMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      const { error } = await (supabase as any).from('allah_name_media').delete().eq('id', mediaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-allah-name-media'] });
      toast.success('Média supprimé');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (newList: any[]) => {
      for (let i = 0; i < newList.length; i++) {
        await supabase.from('allah_names').update({ display_order: i + 1 }).eq('id', newList[i].id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-allah-names'] });
      queryClient.invalidateQueries({ queryKey: ['allah-names'] });
    },
  });

  const handleUploadImage = useCallback(async (nameId: number, file: File) => {
    try {
      const ext = file.name.split('.').pop();
      const path = `allah-names/${nameId}-img.${ext}`;
      const { error: upErr } = await supabase.storage.from('module-cards').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('module-cards').getPublicUrl(path);
      const { error } = await supabase.from('allah_names').update({ image_url: urlData.publicUrl }).eq('id', nameId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin-allah-names'] });
      queryClient.invalidateQueries({ queryKey: ['allah-names'] });
      toast.success('Image mise à jour ✅');
    } catch (e: any) { toast.error(e.message); }
  }, [queryClient]);

  const handleUploadMedia = useCallback(async (nameId: number, type: 'video' | 'audio' | 'pdf', file: File) => {
    setUploadingMedia({ nameId, type });
    try {
      const ext = file.name.split('.').pop();
      const path = `allah-names/${nameId}-${type}.${ext}`;
      const { error: upErr } = await supabase.storage.from('module-cards').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('module-cards').getPublicUrl(path);

      // Delete existing media of this type for this name
      await (supabase as any).from('allah_name_media').delete().eq('name_id', nameId).eq('media_type', type);

      // Insert new media
      const { error } = await (supabase as any).from('allah_name_media').insert({
        name_id: nameId,
        media_type: type,
        file_url: urlData.publicUrl,
        file_name: file.name,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin-allah-name-media'] });
      toast.success(`${type === 'video' ? 'Vidéo' : type === 'audio' ? 'Audio' : 'PDF'} mis à jour ✅`);
    } catch (e: any) { toast.error(e.message); }
    finally { setUploadingMedia(null); }
  }, [queryClient]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = (names as any[]).findIndex((n: any) => String(n.id) === String(active.id));
    const newIdx = (names as any[]).findIndex((n: any) => String(n.id) === String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    reorderMutation.mutate(arrayMove(names as any[], oldIdx, newIdx));
  };

  const openAdd = () => {
    setEditingName(null);
    setFormNameAr(''); setFormNameFr(''); setFormTranslit(''); setFormExplanation('');
    setFormOpen(true);
  };

  const openEdit = (name: any) => {
    setEditingName(name);
    setFormNameAr(name.name_arabic || '');
    setFormNameFr(name.name_french || '');
    setFormTranslit(name.transliteration || '');
    setFormExplanation(name.explanation || '');
    setFormOpen(true);
  };

  const MediaUploadRow = ({ nameId, type, label, icon: Icon }: { nameId: number; type: 'video' | 'audio' | 'pdf'; label: string; icon: any }) => {
    const existing = getNameMedia(nameId).find((m: any) => m.media_type === type);
    const isUploading = uploadingMedia?.nameId === nameId && uploadingMedia?.type === type;
    return (
      <div className="flex items-center gap-2 py-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground w-12 shrink-0">{label}</span>
        {existing ? (
          <div className="flex-1 flex items-center gap-1 min-w-0">
            <span className="text-xs text-foreground truncate flex-1">{existing.file_name}</span>
            <label className="cursor-pointer">
              <input type="file" accept={type === 'video' ? 'video/*' : type === 'audio' ? 'audio/*' : '.pdf'} className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadMedia(nameId, type, f); e.target.value = ''; }}
              />
              <span className="text-[10px] text-primary underline">Remplacer</span>
            </label>
            <button onClick={() => deleteMediaMutation.mutate(existing.id)} className="text-destructive hover:text-destructive/80">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <label className="flex-1 cursor-pointer">
            <input type="file" accept={type === 'video' ? 'video/*' : type === 'audio' ? 'audio/*' : '.pdf'} className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadMedia(nameId, type, f); e.target.value = ''; }}
            />
            <span className={`flex items-center gap-1 text-xs ${isUploading ? 'text-muted-foreground' : 'text-primary underline'}`}>
              {isUploading ? <><Loader2 className="h-3 w-3 animate-spin" /> Envoi…</> : <><Upload className="h-3 w-3" /> Ajouter</>}
            </span>
          </label>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" /> Retour</Button>
        <Button onClick={openAdd}><span className="mr-2">+</span> Ajouter un nom</Button>
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground">99 Noms d'Allah</h2>
        <p className="text-sm text-muted-foreground">{(names as any[]).length} noms • Glissez pour réordonner</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={(names as any[]).map((n: any) => String(n.id))} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {(names as any[]).map((name: any) => (
                <SortableItem key={name.id} id={String(name.id)}>
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        {/* Image with upload overlay */}
                        <div className="relative shrink-0">
                          {name.image_url ? (
                            <img src={name.image_url} alt={name.name_french} className="w-10 h-10 rounded-lg object-contain bg-orange-50" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">{name.display_order}</span>
                            </div>
                          )}
                          <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/30 rounded-lg opacity-0 hover:opacity-100 transition-opacity">
                            <input type="file" accept="image/*" className="hidden"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadImage(name.id, f); e.target.value = ''; }}
                            />
                            <ImageIcon className="h-3.5 w-3.5 text-white" />
                          </label>
                        </div>

                        {/* Name info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">#{name.display_order}</span>
                            <p className="font-arabic text-sm font-bold text-foreground">{name.name_arabic}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{name.name_french}</p>
                          {name.transliteration && <p className="text-xs text-muted-foreground italic">{name.transliteration}</p>}
                          {/* Media indicator */}
                          {getNameMedia(name.id).length > 0 && (
                            <div className="flex gap-1 mt-0.5">
                              {getNameMedia(name.id).map((m: any) => (
                                <span key={m.id} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                  {m.media_type}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1 shrink-0">
                          <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => openEdit(name)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline" size="sm" className="h-8 px-2"
                            onClick={() => setExpandedId(expandedId === name.id ? null : name.id)}
                          >
                            {expandedId === name.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 px-2 text-destructive hover:text-destructive" onClick={() => setDeleteId(name.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Expanded media section */}
                      {expandedId === name.id && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Médias associés</p>
                          <MediaUploadRow nameId={name.id} type="video" label="Vidéo" icon={Play} />
                          <MediaUploadRow nameId={name.id} type="audio" label="Audio" icon={Music} />
                          <MediaUploadRow nameId={name.id} type="pdf" label="PDF" icon={FileText} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingName(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingName ? 'Modifier le nom' : 'Nouveau nom'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom en arabe *</Label>
              <Input value={formNameAr} onChange={(e) => setFormNameAr(e.target.value)} className="font-arabic text-right" dir="rtl" />
            </div>
            <div>
              <Label>Nom en français *</Label>
              <Input value={formNameFr} onChange={(e) => setFormNameFr(e.target.value)} />
            </div>
            <div>
              <Label>Translittération</Label>
              <Input value={formTranslit} onChange={(e) => setFormTranslit(e.target.value)} placeholder="Ex: Ar-Rahmân" />
            </div>
            <div>
              <Label>Explication</Label>
              <Textarea value={formExplanation} onChange={(e) => setFormExplanation(e.target.value)} rows={3} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setFormOpen(false); setEditingName(null); }}>Annuler</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingName ? 'Modifier' : 'Ajouter'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null); }}
        description="Ce nom sera supprimé définitivement."
      />
    </div>
  );
};

export default AdminAllahNamesManager;
