import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Moon, Sparkles, BookMarked, Hand, Edit2, Save, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ContentModule = 'ramadan' | 'nourania' | 'sourates' | 'prayer';

interface EditItem {
  id: number | string;
  module: ContentModule;
  data: Record<string, unknown>;
}

const AdminContent = () => {
  const [activeModule, setActiveModule] = useState<ContentModule>('ramadan');
  const [editItem, setEditItem] = useState<EditItem | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: ramadanDays } = useQuery({
    queryKey: ['admin-ramadan-days'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ramadan_days')
        .select('*')
        .order('day_number');
      if (error) throw error;
      return data;
    },
  });

  const { data: nouraniaLessons } = useQuery({
    queryKey: ['admin-nourania-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nourania_lessons')
        .select('*')
        .order('lesson_number');
      if (error) throw error;
      return data;
    },
  });

  const { data: sourates } = useQuery({
    queryKey: ['admin-sourates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sourates')
        .select('*')
        .order('number');
      if (error) throw error;
      return data;
    },
  });

  const { data: prayerCategories } = useQuery({
    queryKey: ['admin-prayer-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prayer_categories')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data;
    },
  });

  const updateRamadanDay = useMutation({
    mutationFn: async (item: EditItem) => {
      const { error } = await supabase
        .from('ramadan_days')
        .update({
          video_url: item.data.video_url as string,
          pdf_url: item.data.pdf_url as string,
          theme: item.data.theme as string,
        })
        .eq('id', String(item.id));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ramadan-days'] });
      toast({ title: 'Jour mis à jour avec succès' });
      setEditItem(null);
    },
    onError: () => {
      toast({ title: 'Erreur lors de la mise à jour', variant: 'destructive' });
    },
  });

  const updateNouraniaLesson = useMutation({
    mutationFn: async (item: EditItem) => {
      const { error } = await supabase
        .from('nourania_lessons')
        .update({
          audio_url: item.data.audio_url as string,
          description: item.data.description as string,
          title_french: item.data.title_french as string,
          title_arabic: item.data.title_arabic as string,
        })
        .eq('id', String(item.id));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-nourania-lessons'] });
      toast({ title: 'Leçon mise à jour avec succès' });
      setEditItem(null);
    },
    onError: () => {
      toast({ title: 'Erreur lors de la mise à jour', variant: 'destructive' });
    },
  });

  const updateSourate = useMutation({
    mutationFn: async (item: EditItem) => {
      const { error } = await supabase
        .from('sourates')
        .update({
          audio_url: item.data.audio_url as string,
        })
        .eq('id', String(item.id));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sourates'] });
      toast({ title: 'Sourate mise à jour avec succès' });
      setEditItem(null);
    },
    onError: () => {
      toast({ title: 'Erreur lors de la mise à jour', variant: 'destructive' });
    },
  });

  const handleSave = () => {
    if (!editItem) return;

    switch (editItem.module) {
      case 'ramadan':
        updateRamadanDay.mutate(editItem);
        break;
      case 'nourania':
        updateNouraniaLesson.mutate(editItem);
        break;
      case 'sourates':
        updateSourate.mutate(editItem);
        break;
    }
  };

  const modules = [
    { id: 'ramadan', label: 'Ramadan', icon: Moon, count: ramadanDays?.length || 0 },
    { id: 'nourania', label: 'Nourania', icon: Sparkles, count: nouraniaLessons?.length || 0 },
    { id: 'sourates', label: 'Sourates', icon: BookMarked, count: sourates?.length || 0 },
    { id: 'prayer', label: 'Prière', icon: Hand, count: prayerCategories?.length || 0 },
  ];

  return (
    <div className="space-y-4">
      {/* Module Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Button
              key={module.id}
              variant={activeModule === module.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveModule(module.id as ContentModule)}
              className="flex-shrink-0"
            >
              <Icon className="h-4 w-4 mr-2" />
              {module.label}
              <Badge variant="secondary" className="ml-2">{module.count}</Badge>
            </Button>
          );
        })}
      </div>

      {/* Ramadan Content */}
      {activeModule === 'ramadan' && (
        <div className="space-y-2">
          {ramadanDays?.map((day) => (
            <Card key={day.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">Jour {day.day_number}</p>
                    <p className="text-sm text-muted-foreground">{day.theme || 'Sans thème'}</p>
                    <div className="flex gap-2 mt-1">
                      {day.video_url && <Badge variant="outline">Vidéo</Badge>}
                      {day.pdf_url && <Badge variant="outline">PDF</Badge>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditItem({
                      id: day.id,
                      module: 'ramadan',
                      data: { video_url: day.video_url, pdf_url: day.pdf_url, theme: day.theme },
                    })}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Nourania Content */}
      {activeModule === 'nourania' && (
        <div className="space-y-2">
          {nouraniaLessons?.map((lesson) => (
            <Card key={lesson.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">Leçon {lesson.lesson_number}</p>
                    <p className="text-sm">{lesson.title_french}</p>
                    <p className="text-sm text-muted-foreground font-arabic">{lesson.title_arabic}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditItem({
                      id: lesson.id,
                      module: 'nourania',
                      data: {
                        audio_url: lesson.audio_url,
                        description: lesson.description,
                        title_french: lesson.title_french,
                        title_arabic: lesson.title_arabic,
                      },
                    })}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sourates Content */}
      {activeModule === 'sourates' && (
        <div className="space-y-2">
          {sourates?.map((sourate) => (
            <Card key={sourate.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{sourate.number}. {sourate.name_french}</p>
                    <p className="text-sm font-arabic">{sourate.name_arabic}</p>
                    <p className="text-xs text-muted-foreground">{sourate.verses_count} versets</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditItem({
                      id: sourate.id,
                      module: 'sourates',
                      data: { audio_url: sourate.audio_url },
                    })}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Prayer Content */}
      {activeModule === 'prayer' && (
        <div className="space-y-2">
          {prayerCategories?.map((category) => (
            <Card key={category.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{category.name_french}</p>
                    <p className="text-sm font-arabic">{category.name_arabic}</p>
                    {category.description && (
                      <p className="text-xs text-muted-foreground">{category.description}</p>
                    )}
                  </div>
                  <Badge variant={category.is_default ? 'default' : 'secondary'}>
                    {category.is_default ? 'Par défaut' : 'Personnalisé'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent level="nested">
          <DialogHeader>
            <DialogTitle>Modifier le contenu</DialogTitle>
          </DialogHeader>

          {editItem?.module === 'ramadan' && (
            <div className="space-y-4">
              <div>
                <Label>Thème</Label>
                <Input
                  value={editItem.data.theme as string || ''}
                  onChange={(e) => setEditItem({
                    ...editItem,
                    data: { ...editItem.data, theme: e.target.value },
                  })}
                />
              </div>
              <div>
                <Label>URL Vidéo (YouTube)</Label>
                <Input
                  value={editItem.data.video_url as string || ''}
                  onChange={(e) => setEditItem({
                    ...editItem,
                    data: { ...editItem.data, video_url: e.target.value },
                  })}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
              <div>
                <Label>URL PDF</Label>
                <Input
                  value={editItem.data.pdf_url as string || ''}
                  onChange={(e) => setEditItem({
                    ...editItem,
                    data: { ...editItem.data, pdf_url: e.target.value },
                  })}
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          {editItem?.module === 'nourania' && (
            <div className="space-y-4">
              <div>
                <Label>Titre (Français)</Label>
                <Input
                  value={editItem.data.title_french as string || ''}
                  onChange={(e) => setEditItem({
                    ...editItem,
                    data: { ...editItem.data, title_french: e.target.value },
                  })}
                />
              </div>
              <div>
                <Label>Titre (Arabe)</Label>
                <Input
                  value={editItem.data.title_arabic as string || ''}
                  onChange={(e) => setEditItem({
                    ...editItem,
                    data: { ...editItem.data, title_arabic: e.target.value },
                  })}
                  className="font-arabic text-right"
                  dir="rtl"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editItem.data.description as string || ''}
                  onChange={(e) => setEditItem({
                    ...editItem,
                    data: { ...editItem.data, description: e.target.value },
                  })}
                />
              </div>
              <div>
                <Label>URL Audio/Vidéo</Label>
                <Input
                  value={editItem.data.audio_url as string || ''}
                  onChange={(e) => setEditItem({
                    ...editItem,
                    data: { ...editItem.data, audio_url: e.target.value },
                  })}
                />
              </div>
            </div>
          )}

          {editItem?.module === 'sourates' && (
            <div className="space-y-4">
              <div>
                <Label>URL Audio</Label>
                <Input
                  value={editItem.data.audio_url as string || ''}
                  onChange={(e) => setEditItem({
                    ...editItem,
                    data: { ...editItem.data, audio_url: e.target.value },
                  })}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setEditItem(null)}>
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminContent;
