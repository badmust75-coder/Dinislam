import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
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
  const [elevesOuverts, setElevesOuverts] = useState<Record<string, boolean>>({});
  const [elevesRendusOuverts, setElevesRendusOuverts] = useState<Record<string, boolean>>({});
  const [modalARefaire, setModalARefaire] = useState<{
    renduId: string; studentId: string; devoirTitre: string;
  } | null>(null);
  const [commentaire, setCommentaire] = useState('');
  const [form, setForm] = useState({
    titre: '', type: 'recitation', description: '',
    lien_lecon: '', date_limite: '', assigned_to: 'all',
    group_id: '', student_id: '',
  });

  // Fetch devoirs with enriched names
  const { data: devoirs = [] } = useQuery({
    queryKey: ['admin-devoirs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('devoirs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!data?.length) return [];

      const studentIds = [...new Set(data.filter(d => d.student_id).map(d => d.student_id!))];
      const groupIds = [...new Set(data.filter(d => d.group_id).map(d => d.group_id!))];

      const [{ data: profiles }, { data: groups }] = await Promise.all([
        studentIds.length
          ? supabase.from('profiles').select('user_id, full_name').in('user_id', studentIds)
          : Promise.resolve({ data: [] as any[] }),
        groupIds.length
          ? supabase.from('student_groups').select('id, name').in('id', groupIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      return data.map(d => ({
        ...d,
        student_name: profiles?.find(p => p.user_id === d.student_id)?.full_name || null,
        group_name: groups?.find(g => g.id === d.group_id)?.name || null,
      }));
    },
  });

  // Fetch rendus with student info
  const { data: rendus = [] } = useQuery({
    queryKey: ['admin-devoirs-rendus'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('devoirs_rendus')
        .select('*')
        .order('rendu_at', { ascending: false });
      if (error) throw error;
      if (!data?.length) return [];

      const studentIds = [...new Set(data.map(r => r.student_id))];
      const devoirIds = [...new Set(data.map(r => r.devoir_id).filter(Boolean))];

      const [{ data: profiles }, { data: devoirsList }] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name').in('user_id', studentIds),
        devoirIds.length
          ? supabase.from('devoirs').select('id, titre, type').in('id', devoirIds)
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
        titre: form.titre, type: form.type,
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

  // Mark as corrected
  const markCorrige = useMutation({
    mutationFn: async ({ renduId, studentId, devoirTitre }: { renduId: string; studentId: string; devoirTitre: string }) => {
      const { error } = await supabase
        .from('devoirs_rendus')
        .update({ statut: 'corrige' })
        .eq('id', renduId);
      if (error) throw error;

      sendPushNotification({
        userIds: [studentId],
        title: '🎉 Devoir validé !',
        body: `Ton devoir "${devoirTitre}" a été corrigé ✅`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-devoirs-rendus'] });
      toast.success('✅ Corrigé — élève notifié !');
    },
  });

  // Mark as "à refaire"
  const markARefaire = useMutation({
    mutationFn: async () => {
      if (!modalARefaire) throw new Error('Aucun rendu sélectionné');
      const { error } = await supabase
        .from('devoirs_rendus')
        .update({ statut: 'a_refaire', commentaire_admin: commentaire || null })
        .eq('id', modalARefaire.renduId);
      if (error) throw error;

      sendPushNotification({
        userIds: [modalARefaire.studentId],
        title: '🔄 Devoir à refaire',
        body: `"${modalARefaire.devoirTitre}" est à refaire${commentaire ? ` : ${commentaire}` : ''}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-devoirs-rendus'] });
      toast.success('📢 Élève notifié — devoir à refaire');
      setModalARefaire(null);
      setCommentaire('');
    },
  });

  // Group devoirs by student
  const devoirsParEleve = eleves.map(eleve => {
    const devoirsEleve = devoirs.filter(d =>
      d.assigned_to === 'all' ||
      d.student_id === eleve.user_id ||
      (d.assigned_to === 'group' && d.group_id) // simplified
    );
    const rendusEleve = rendus.filter(r => r.student_id === eleve.user_id);
    const aRefaire = rendusEleve.some(r => r.statut === 'a_refaire');
    const enAttente = rendusEleve.some(r => r.statut === 'rendu');
    const aJour = devoirsEleve.length > 0 &&
      rendusEleve.filter(r => r.statut === 'corrige').length >= devoirsEleve.length;

    return { eleve, devoirsEleve, rendusEleve, aRefaire, enAttente, aJour };
  });

  const couleurCarte = (item: { aRefaire: boolean; enAttente: boolean; aJour: boolean }) => {
    if (item.aRefaire) return 'border-destructive bg-destructive/5';
    if (item.enAttente) return 'border-orange-400 bg-orange-50 dark:bg-orange-950/20';
    if (item.aJour) return 'border-green-400 bg-green-50 dark:bg-green-950/20';
    return 'border-border bg-muted/30';
  };

  const toggleEleve = (id: string) =>
    setElevesOuverts(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleEleveRendu = (id: string) =>
    setElevesRendusOuverts(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Retour
      </Button>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">📚 Devoirs</h2>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nouveau devoir
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="border-dashed border-2 border-primary/30">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">✏️ Créer un devoir</p>
            <Input placeholder="Titre du devoir *" value={form.titre}
              onChange={e => setForm({ ...form, titre: e.target.value })} />
            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea placeholder="Description (optionnel)" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
            <Input placeholder="Lien vers la leçon (optionnel)" value={form.lien_lecon}
              onChange={e => setForm({ ...form, lien_lecon: e.target.value })} />
            <Input type="datetime-local" value={form.date_limite}
              onChange={e => setForm({ ...form, date_limite: e.target.value })} />
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
            <Button onClick={() => createDevoir.mutate()} disabled={!form.titre || createDevoir.isPending} className="w-full">
              ✅ Assigner le devoir
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Devoirs grouped by student */}
      <div>
        <h3 className="font-semibold text-foreground mb-2">
          Devoirs assignés ({devoirs.length})
        </h3>
        {devoirsParEleve.filter(({ devoirsEleve }) => devoirsEleve.length > 0).map(({ eleve, devoirsEleve, aRefaire, enAttente, aJour }) => {
          const ouvert = elevesOuverts[eleve.user_id];
          return (
            <Card key={eleve.user_id} className={`mb-2 overflow-hidden border-2 ${couleurCarte({ aRefaire, enAttente, aJour })}`}>
              <button
                onClick={() => toggleEleve(eleve.user_id)}
                className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
              >
                <span className="font-semibold text-foreground text-sm">
                  👤 {eleve.full_name} ({devoirsEleve.length} devoir{devoirsEleve.length > 1 ? 's' : ''})
                </span>
                {ouvert ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {ouvert && (
                <div className="px-3 pb-3 space-y-2">
                  {devoirsEleve.map((d: any) => (
                    <div key={d.id} className="bg-background rounded-xl p-3 flex items-center justify-between shadow-sm">
                      <div>
                        <p className="font-semibold text-foreground text-sm">{d.titre}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.date_limite ? `📅 ${new Date(d.date_limite).toLocaleDateString('fr-FR')}` : 'Sans date limite'}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                        onClick={() => deleteDevoir.mutate(d.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Rendus grouped by student */}
      <div>
        <h3 className="font-semibold text-foreground mb-2">
          Rendus à corriger ({rendus.filter((r: any) => r.statut === 'rendu').length})
        </h3>
        {(() => {
          // Group rendus by student_id directly from rendus data
          const rendusParEleve: Record<string, { name: string; items: any[] }> = {};
          rendus.forEach((r: any) => {
            if (!rendusParEleve[r.student_id]) {
              rendusParEleve[r.student_id] = { name: r.student_name || 'Inconnu', items: [] };
            }
            rendusParEleve[r.student_id].items.push(r);
          });

          if (Object.keys(rendusParEleve).length === 0) {
            return <p className="text-muted-foreground text-sm text-center py-4">Aucun rendu</p>;
          }

          return Object.entries(rendusParEleve).map(([studentId, { name, items }]) => {
            const ouvert = elevesRendusOuverts[studentId];
            const pendingCount = items.filter(r => r.statut === 'rendu').length;
            const hasARefaire = items.some(r => r.statut === 'a_refaire');
            const hasEnAttente = items.some(r => r.statut === 'rendu');
            const colorClass = hasARefaire
              ? 'border-destructive bg-destructive/5'
              : hasEnAttente
              ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/20'
              : 'border-green-400 bg-green-50 dark:bg-green-950/20';

            return (
              <Card key={studentId} className={`mb-2 overflow-hidden border-2 ${colorClass}`}>
                <button
                  onClick={() => toggleEleveRendu(studentId)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <span className="font-semibold text-foreground text-sm flex items-center gap-2">
                    👤 {name} ({items.length} rendu{items.length > 1 ? 's' : ''})
                    {pendingCount > 0 && (
                      <span className="bg-destructive text-destructive-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {pendingCount}
                      </span>
                    )}
                  </span>
                  {ouvert ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {ouvert && (
                  <div className="px-3 pb-3 space-y-2">
                    {items.map((r: any) => (
                      <div key={r.id} className={`rounded-xl p-3 ${
                        r.statut === 'corrige'
                          ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800'
                          : r.statut === 'a_refaire'
                          ? 'bg-destructive/5 border border-destructive/20'
                          : 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800'
                      }`}>
                        <p className="font-semibold text-foreground text-sm mb-1">{r.devoir_titre}</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          {new Date(r.rendu_at).toLocaleDateString('fr-FR')}
                        </p>
                        {r.audio_url && (
                          <audio src={r.audio_url} controls preload="metadata"
                            className="w-full mb-2" style={{ height: '36px' }} />
                        )}
                        {r.commentaire_admin && (
                          <p className="text-xs text-destructive bg-destructive/5 rounded-lg p-2 mb-2">
                            💬 {r.commentaire_admin}
                          </p>
                        )}
                        {r.statut === 'rendu' && (
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1 gap-1"
                              onClick={() => markCorrige.mutate({ renduId: r.id, studentId: r.student_id, devoirTitre: r.devoir_titre })}
                              disabled={markCorrige.isPending}>
                              ✅ Corrigé
                            </Button>
                            <Button size="sm" variant="destructive" className="flex-1 gap-1"
                              onClick={() => setModalARefaire({ renduId: r.id, studentId: r.student_id, devoirTitre: r.devoir_titre })}>
                              <RefreshCw className="h-3 w-3" /> À Refaire
                            </Button>
                          </div>
                        )}
                        {r.statut === 'corrige' && (
                          <Badge className="bg-green-500 text-white">✅ Corrigé</Badge>
                        )}
                        {r.statut === 'a_refaire' && (
                          <Badge variant="destructive">🔄 À refaire</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          });
        })()}
      </div>

      {/* Modal "À refaire" */}
      <Dialog open={!!modalARefaire} onOpenChange={(open) => { if (!open) { setModalARefaire(null); setCommentaire(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🔄 Devoir à refaire</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{modalARefaire?.devoirTitre}</p>
          <Textarea
            placeholder="Commentaire pour l'élève (optionnel)"
            value={commentaire}
            onChange={e => setCommentaire(e.target.value)}
            rows={3}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setModalARefaire(null); setCommentaire(''); }}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={() => markARefaire.mutate()} disabled={markARefaire.isPending}>
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminHomework;
