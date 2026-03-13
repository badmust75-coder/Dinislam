import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, CheckCircle, Clock, Mic, Play } from 'lucide-react';
import { toast } from 'sonner';
import { sendPushNotification } from '@/lib/pushHelper';

interface AdminHomeworkProps {
  onBack: () => void;
}

const TYPE_OPTIONS = [
  { value: 'recitation', label: '🎙️ Récitation' },
  { value: 'sourate', label: '📖 Sourate à mémoriser' },
  { value: 'nourania', label: '🔤 Leçon Nourania' },
  { value: 'exercice_pdf', label: '📄 Exercice PDF' },
  { value: 'autre', label: '✏️ Autre' },
];

const AdminHomework = ({ onBack }: AdminHomeworkProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    titre: '',
    type: 'recitation',
    description: '',
    lien_lecon: '',
    date_limite: '',
    assigned_to: 'all',
    group_id: '',
    student_id: '',
  });

  // Fetch devoirs
  const { data: devoirs = [] } = useQuery({
    queryKey: ['admin-devoirs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('devoirs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch rendus with student profile info
  const { data: rendus = [] } = useQuery({
    queryKey: ['admin-devoirs-rendus'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('devoirs_rendus')
        .select('*')
        .order('rendu_at', { ascending: false });
      if (error) throw error;

      // Enrich with student names and devoir titles
      if (!data?.length) return [];

      const studentIds = [...new Set(data.map(r => r.student_id))];
      const devoirIds = [...new Set(data.map(r => r.devoir_id).filter(Boolean))];

      const [{ data: profiles }, { data: devoirsList }] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name').in('user_id', studentIds),
        devoirIds.length
          ? supabase.from('devoirs').select('id, titre').in('id', devoirIds)
          : Promise.resolve({ data: [] }),
      ]);

      return data.map(r => ({
        ...r,
        student_name: profiles?.find(p => p.user_id === r.student_id)?.full_name || 'Inconnu',
        devoir_titre: devoirsList?.find((d: any) => d.id === r.devoir_id)?.titre || '',
      }));
    },
  });

  // Fetch groups
  const { data: groupes = [] } = useQuery({
    queryKey: ['admin-student-groups'],
    queryFn: async () => {
      const { data } = await supabase.from('student_groups').select('id, name');
      return data || [];
    },
  });

  // Fetch approved students
  const { data: eleves = [] } = useQuery({
    queryKey: ['admin-eleves-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('is_approved', true)
        .order('full_name');
      return data || [];
    },
  });

  // Create devoir
  const createDevoir = useMutation({
    mutationFn: async () => {
      if (!form.titre) throw new Error('Le titre est obligatoire');
      const payload: any = {
        titre: form.titre,
        type: form.type,
        description: form.description || null,
        lien_lecon: form.lien_lecon || null,
        date_limite: form.date_limite || null,
        assigned_to: form.assigned_to,
        created_by: user?.id,
      };
      if (form.assigned_to === 'group' && form.group_id) payload.group_id = form.group_id;
      if (form.assigned_to === 'student' && form.student_id) payload.student_id = form.student_id;

      const { error } = await supabase.from('devoirs').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-devoirs'] });
      toast.success('✅ Devoir assigné !');
      setShowForm(false);
      setForm({ titre: '', type: 'recitation', description: '', lien_lecon: '', date_limite: '', assigned_to: 'all', group_id: '', student_id: '' });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Delete devoir
  const deleteDevoir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('devoirs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-devoirs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-devoirs-rendus'] });
      toast.success('Devoir supprimé');
    },
  });

  // Mark as corrected and notify student
  const markCorrige = useMutation({
    mutationFn: async ({ renduId, studentId, devoirTitre }: { renduId: string; studentId: string; devoirTitre: string }) => {
      const { error } = await supabase
        .from('devoirs_rendus')
        .update({ statut: 'corrige' })
        .eq('id', renduId);
      if (error) throw error;

      // Notify student
      sendPushNotification({
        userIds: [studentId],
        title: '🎉 Devoir validé !',
        body: `Ton devoir "${devoirTitre}" a été corrigé par ton enseignante`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-devoirs-rendus'] });
      toast.success('✅ Devoir corrigé — élève notifié !');
    },
  });

  const rendusACorreger = rendus.filter((r: any) => r.statut === 'rendu');

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Retour
      </Button>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">📚 Devoirs</h2>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nouveau devoir
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="border-dashed border-2 border-primary/30">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">✏️ Créer un devoir</p>
            <Input
              placeholder="Titre du devoir *"
              value={form.titre}
              onChange={e => setForm({ ...form, titre: e.target.value })}
            />
            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Description (optionnel)"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
            <Input
              placeholder="Lien vers la leçon (optionnel)"
              value={form.lien_lecon}
              onChange={e => setForm({ ...form, lien_lecon: e.target.value })}
            />
            <Input
              type="datetime-local"
              value={form.date_limite}
              onChange={e => setForm({ ...form, date_limite: e.target.value })}
            />
            <Select value={form.assigned_to} onValueChange={v => setForm({ ...form, assigned_to: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">👥 Tous les élèves</SelectItem>
                <SelectItem value="group">👨‍👩‍👧 Un groupe</SelectItem>
                <SelectItem value="student">👤 Un élève</SelectItem>
              </SelectContent>
            </Select>

            {form.assigned_to === 'group' && (
              <Select value={form.group_id} onValueChange={v => setForm({ ...form, group_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un groupe..." /></SelectTrigger>
                <SelectContent>
                  {groupes.map((g: any) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {form.assigned_to === 'student' && (
              <Select value={form.student_id} onValueChange={v => setForm({ ...form, student_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un élève..." /></SelectTrigger>
                <SelectContent>
                  {eleves.map((e: any) => (
                    <SelectItem key={e.user_id} value={e.user_id}>{e.full_name || 'Sans nom'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              onClick={() => createDevoir.mutate()}
              disabled={!form.titre || createDevoir.isPending}
              className="w-full"
            >
              ✅ Assigner le devoir
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Assigned devoirs list */}
      <div>
        <h3 className="font-semibold text-foreground mb-2">
          Devoirs assignés ({devoirs.length})
        </h3>
        {devoirs.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-4">Aucun devoir assigné</p>
        )}
        {devoirs.map((d: any) => {
          const badgeCount = rendus.filter((r: any) => r.devoir_id === d.id && r.statut === 'rendu').length;
          return (
            <Card key={d.id} className="mb-2 relative">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground text-sm">{d.titre}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.assigned_to === 'all' ? '👥 Tous' : d.assigned_to === 'group' ? '👨‍👩‍👧 Groupe' : '👤 Élève'}
                    {d.date_limite && ` · 📅 ${new Date(d.date_limite).toLocaleDateString('fr-FR')}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {badgeCount > 0 && (
                    <span className="bg-destructive text-destructive-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {badgeCount}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => deleteDevoir.mutate(d.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Rendus to correct */}
      <div>
        <h3 className="font-semibold text-foreground mb-2">
          Rendus à corriger ({rendusACorreger.length})
        </h3>
        {rendus.map((r: any) => (
          <Card key={r.id} className={`mb-2 ${r.statut === 'corrige' ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20' : 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20'}`}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground text-sm">
                    {r.student_name} — {r.devoir_titre}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.rendu_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                {r.statut === 'corrige' && (
                  <Badge className="bg-green-500 text-white">✅ Corrigé</Badge>
                )}
              </div>

              {r.audio_url && (
                <audio src={r.audio_url} controls className="w-full h-8" />
              )}

              {r.statut === 'rendu' && (
                <Button
                  size="sm"
                  onClick={() => markCorrige.mutate({ renduId: r.id, studentId: r.student_id, devoirTitre: r.devoir_titre })}
                  disabled={markCorrige.isPending}
                  className="gap-1"
                >
                  <CheckCircle className="h-4 w-4" />
                  Marquer corrigé
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminHomework;
