import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Trash2, Pencil, Plus, Loader2, Users, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const MODULES = [
  { value: 'general', label: '🌐 Général' },
  { value: 'ramadan', label: '🌙 Ramadan' },
  { value: 'sourates', label: '📖 Sourates' },
  { value: 'nourania', label: '✨ Nourania' },
  { value: 'invocations', label: '🤲 Invocations' },
  { value: 'priere', label: '🕌 Prière' },
  { value: 'allah_names', label: '🌟 99 Noms d\'Allah' },
  { value: 'alphabet', label: '🔤 Alphabet' },
];

interface ScheduledNotification {
  id: string;
  module: string;
  message: string;
  start_date: string;
  end_date: string;
  send_time: string;
  recipients: any;
  is_active: boolean;
  require_confirmation: boolean;
  created_at: string;
  created_by: string | null;
}

const ScheduledNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [module, setModule] = useState('general');
  const [message, setMessage] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sendTime, setSendTime] = useState('08:00');
  const [recipientMode, setRecipientMode] = useState<'all' | 'select'>('all');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [requireConfirmation, setRequireConfirmation] = useState(false);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['scheduled-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ScheduledNotification[];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ['all-students-for-notif'],
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

  // Confirmations count per notification
  const { data: confirmationCounts = {} } = useQuery({
    queryKey: ['notification-confirmations-counts'],
    queryFn: async () => {
      const ids = notifications.filter(n => n.require_confirmation).map(n => n.id);
      if (ids.length === 0) return {};
      const { data } = await supabase
        .from('notification_confirmations')
        .select('notification_id');
      const counts: Record<string, number> = {};
      (data || []).forEach((c: any) => {
        counts[c.notification_id] = (counts[c.notification_id] || 0) + 1;
      });
      return counts;
    },
    enabled: notifications.length > 0,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        module,
        message: message.trim(),
        start_date: startDate,
        end_date: endDate,
        send_time: sendTime,
        recipients: recipientMode === 'all' ? 'all' : selectedStudents,
        is_active: isActive,
        require_confirmation: requireConfirmation,
        created_by: user?.id,
      };
      if (editingId) {
        const { error } = await supabase.from('scheduled_notifications').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('scheduled_notifications').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-notifications'] });
      toast({ title: editingId ? '✅ Notification modifiée' : '✅ Notification programmée' });
      resetForm();
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('scheduled_notifications').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-notifications'] });
      toast({ title: '🗑️ Notification supprimée' });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('scheduled_notifications').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scheduled-notifications'] }),
  });

  const resetForm = () => {
    setDialogOpen(false);
    setEditingId(null);
    setModule('general');
    setMessage('');
    setStartDate('');
    setEndDate('');
    setSendTime('08:00');
    setRecipientMode('all');
    setSelectedStudents([]);
    setIsActive(true);
    setRequireConfirmation(false);
  };

  const openEdit = (n: ScheduledNotification) => {
    setEditingId(n.id);
    setModule(n.module);
    setMessage(n.message);
    setStartDate(n.start_date);
    setEndDate(n.end_date);
    setSendTime(n.send_time?.substring(0, 5) || '08:00');
    setRecipientMode(n.recipients === 'all' ? 'all' : 'select');
    setSelectedStudents(Array.isArray(n.recipients) ? n.recipients : []);
    setIsActive(n.is_active);
    setRequireConfirmation(n.require_confirmation);
    setDialogOpen(true);
  };

  const getStatus = (n: ScheduledNotification) => {
    const today = new Date().toISOString().split('T')[0];
    if (!n.is_active) return { label: '🔴 Inactif', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    if (today < n.start_date) return { label: '⏳ En attente', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
    if (today > n.end_date) return { label: '✅ Terminé', color: 'bg-muted text-muted-foreground' };
    return { label: '🟢 Actif', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
  };

  const getRecipientsLabel = (r: any) => {
    if (r === 'all') return 'Tous';
    if (Array.isArray(r)) return `${r.length} élève(s)`;
    return 'Tous';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            📅 Notifications Programmées
          </CardTitle>
          <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Programmer
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-400">
          ⚠️ Ne créez des notifications de test que si vous êtes prêt à les recevoir. Supprimez-les après le test.
        </div>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucune notification programmée</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {notifications.map(n => {
              const status = getStatus(n);
              const moduleDef = MODULES.find(m => m.value === n.module);
              return (
                <div key={n.id} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">{moduleDef?.label || n.module}</Badge>
                        <Badge className={`text-xs ${status.color}`}>{status.label}</Badge>
                        {n.require_confirmation && <Badge variant="outline" className="text-xs">📩 Confirmation</Badge>}
                      </div>
                      <p className="text-sm mt-1 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {n.start_date} → {n.end_date} • {n.send_time?.substring(0, 5)} • {getRecipientsLabel(n.recipients)}
                        {n.require_confirmation && ` • ${(confirmationCounts as any)[n.id] || 0} confirmation(s)`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Switch
                        checked={n.is_active}
                        onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: n.id, is_active: checked })}
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(n)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(n.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); }}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" level="nested">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Modifier la notification' : 'Programmer une notification'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Module concerné</Label>
                <Select value={module} onValueChange={setModule}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODULES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Message ({message.length}/150)</Label>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value.slice(0, 150))}
                  placeholder="Contenu de la notification..."
                  rows={2}
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date de début</Label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label>Date de fin</Label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Heure d'envoi</Label>
                <Input type="time" value={sendTime} onChange={e => setSendTime(e.target.value)} />
              </div>

              <div>
                <Label>Destinataires</Label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={recipientMode === 'all'} onChange={() => setRecipientMode('all')} />
                    <Users className="h-4 w-4" /> Tous les élèves
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={recipientMode === 'select'} onChange={() => setRecipientMode('select')} />
                    <User className="h-4 w-4" /> Sélectionner
                  </label>
                </div>
              </div>

              {recipientMode === 'select' && (
                <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                  {students.map(s => (
                    <label key={s.user_id} className="flex items-center gap-2 text-sm cursor-pointer py-1">
                      <Checkbox
                        checked={selectedStudents.includes(s.user_id)}
                        onCheckedChange={(checked) => {
                          setSelectedStudents(prev =>
                            checked ? [...prev, s.user_id] : prev.filter(id => id !== s.user_id)
                          );
                        }}
                      />
                      {s.full_name || s.email}
                    </label>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label>Actif</Label>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>

              <div className="flex items-center justify-between">
                <Label>Confirmation de lecture requise</Label>
                <Switch checked={requireConfirmation} onCheckedChange={setRequireConfirmation} />
              </div>

              <Button
                className="w-full"
                onClick={() => saveMutation.mutate()}
                disabled={!message.trim() || !startDate || !endDate || saveMutation.isPending}
              >
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calendar className="h-4 w-4 mr-2" />}
                {editingId ? 'Modifier' : 'Programmer 📅'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ScheduledNotifications;
