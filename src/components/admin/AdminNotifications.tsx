import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Bell, Send, Users, Moon, Clock, TestTube, ChevronUp, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const AdminNotifications = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [notificationType, setNotificationType] = useState<'all' | 'prayer' | 'ramadan'>('all');
  const [testSending, setTestSending] = useState(false);

  // État pour statut notifications élèves
  const [elevesStatut, setElevesStatut] = useState<any[]>([]);
  const [showStatuts, setShowStatuts] = useState(false);
  const [envoiIndividuel, setEnvoiIndividuel] = useState('');

  useEffect(() => { chargerStatutsEleves(); }, []);

  const chargerStatutsEleves = async () => {
    const { data: profils } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .eq('is_approved', true);

    const ids = (profils || []).map(p => p.user_id);
    if (!ids.length) { setElevesStatut([]); return; }

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('user_id, is_active')
      .in('user_id', ids);

    const enrichis = (profils || []).map(p => ({
      id: p.user_id,
      full_name: p.full_name || 'Sans nom',
      notifActive: subs?.some(s => s.user_id === p.user_id && s.is_active) || false,
    }));
    setElevesStatut(enrichis.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')));
  };

  const handleRenvoyerInvitation = async (userId?: string) => {
    const cibles = userId ? [userId] : elevesStatut.filter(e => !e.notifActive).map(e => e.id);
    if (!cibles.length) {
      toast({ title: 'Aucun élève à relancer' });
      return;
    }

    try {
      for (const id of cibles) {
        await (supabase as any)
          .from('notification_invitations')
          .upsert({ 
            user_id: id, 
            show_banner: true,
            sent_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
      }

      toast({ title: `✅ Bannière renvoyée à ${cibles.length} élève(s)` });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const handleTestAdmin = async () => {
    if (!user) return;
    setTestSending(true);
    try {
      console.log('Admin user_id:', user.id);
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: user.id,
          title: '🔔 Test admin',
          body: 'Notification test pour l\'admin',
          tag: 'admin-test',
        },
      });
      if (error) {
        console.error('Erreur invoke:', error);
        toast({ title: 'Erreur: ' + error.message, variant: 'destructive' });
      } else {
        console.log('Résultat envoi admin:', JSON.stringify(data));
        toast({ title: `Test envoyé: ${data?.sent ?? 0}/${data?.total ?? 0}` });
      }
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setTestSending(false);
    }
  };

  const { data: subscriptionStats } = useQuery({
    queryKey: ['admin-push-stats'],
    queryFn: async () => {
      const { count: totalSubscriptions } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true });

      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select('prayer_reminders, ramadan_activities');

      const prayerEnabled = preferences?.filter(p => p.prayer_reminders).length || 0;
      const ramadanEnabled = preferences?.filter(p => p.ramadan_activities).length || 0;

      return {
        totalSubscriptions: totalSubscriptions || 0,
        prayerEnabled,
        ramadanEnabled,
      };
    },
  });


  const sendNotification = useMutation({
    mutationFn: async () => {
      const { data, error: fnError } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: notificationTitle,
          body: notificationBody,
          type: notificationType,
          sendToAll: true,
        },
      });

      if (fnError) {
        console.error('Erreur invoke:', fnError);
        throw fnError;
      }
      console.log('Résultat:', JSON.stringify(data));
      return data;
    },
    onSuccess: (data) => {
      toast({ title: `Envoyé: ${data?.sent ?? 0}/${data?.total ?? 0}` });
      setNotificationTitle('');
      setNotificationBody('');
    },
    onError: (error) => {
      console.error('Error sending notifications:', error);
      toast({ 
        title: 'Erreur lors de l\'envoi', 
        description: error?.message || 'Les notifications n\'ont pas pu être envoyées',
        variant: 'destructive' 
      });
    },
  });

  const presetNotifications = [
    {
      title: 'Rappel de prière - Fajr',
      body: 'Il est temps de prier Fajr. Qu\'Allah accepte votre prière.',
      type: 'prayer' as const,
    },
    {
      title: 'Rappel de prière - Dhuhr',
      body: 'Il est temps de prier Dhuhr. Qu\'Allah accepte votre prière.',
      type: 'prayer' as const,
    },
    {
      title: 'Activité Ramadan',
      body: 'N\'oubliez pas de regarder la vidéo du jour et de répondre au quiz !',
      type: 'ramadan' as const,
    },
    {
      title: 'Nouveau contenu disponible',
      body: 'De nouvelles leçons sont disponibles dans l\'application.',
      type: 'all' as const,
    },
  ];

  const [abonnements, setAbonnements] = useState<any[]>([]);
  const [showAbo, setShowAbo] = useState(false);

  const handleVoirAbonnements = async () => {
    const [{ data, error }, { data: roles }] = await Promise.all([
      supabase
        .from('push_subscriptions')
        .select('user_id, endpoint, p256dh, auth_key, is_active, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('user_roles')
        .select('user_id, role'),
    ]);

    if (error) {
      toast({ title: 'Erreur: ' + error.message, variant: 'destructive' });
      return;
    }
    const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));
    setAbonnements((data || []).map((a: any) => ({ ...a, role: roleMap.get(a.user_id) || '—' })));
    setShowAbo(true);
  };

  return (
    <div className="space-y-6">
      {/* Test admin button + Voir abonnements */}
      <div className="p-4 space-y-3">
        <Button
          onClick={handleTestAdmin}
          disabled={testSending}
          className="w-full py-4 rounded-2xl font-bold text-lg"
          variant="default"
        >
          <TestTube className="h-5 w-5 mr-2" />
          {testSending ? 'Envoi en cours...' : '🔔 Tester notification (moi-même)'}
        </Button>
        <button
          onClick={handleVoirAbonnements}
          className="w-full py-4 rounded-2xl font-bold text-white text-lg"
          style={{ backgroundColor: "#7c3aed" }}
        >
          🔍 Voir les abonnements ({abonnements.length})
        </button>

        {showAbo && (
          <div className="bg-white rounded-2xl p-4 mb-4 shadow">
            <h3 className="font-bold mb-3">Abonnements enregistrés : {abonnements.length}</h3>
            {abonnements.length === 0 ? (
              <p className="text-red-500">⚠️ Aucun abonnement en base — les élèves n'ont pas accepté les notifications</p>
            ) : (
              abonnements.map((a, i) => (
                <div key={i} className="border-b py-2 text-sm">
                  <p>👤 {a.user_id?.slice(0, 8)}... — <span className="font-semibold">{a.role}</span></p>
                  <p>✅ Actif : {a.is_active ? 'oui' : 'non'}</p>
                  <p>🔑 p256dh : {a.p256dh?.slice(0, 10)}...</p>
                  <p>🔐 auth : {a.auth_key?.slice(0, 10)}...</p>
                  <p>📅 {new Date(a.created_at).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{subscriptionStats?.totalSubscriptions || 0}</p>
            <p className="text-xs text-muted-foreground">Abonnés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-gold" />
            <p className="text-2xl font-bold">{subscriptionStats?.prayerEnabled || 0}</p>
            <p className="text-xs text-muted-foreground">Prière activé</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Moon className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{subscriptionStats?.ramadanEnabled || 0}</p>
            <p className="text-xs text-muted-foreground">Ramadan activé</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Envoyer une notification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Type de notification</Label>
            <Select value={notificationType} onValueChange={(v) => setNotificationType(v as typeof notificationType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les utilisateurs</SelectItem>
                <SelectItem value="prayer">Rappels de prière activés</SelectItem>
                <SelectItem value="ramadan">Activités Ramadan activées</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Titre</Label>
            <Input
              value={notificationTitle}
              onChange={(e) => setNotificationTitle(e.target.value)}
              placeholder="Titre de la notification"
            />
          </div>

          <div>
            <Label>Message</Label>
            <Textarea
              value={notificationBody}
              onChange={(e) => setNotificationBody(e.target.value)}
              placeholder="Corps du message"
              rows={3}
            />
          </div>

          <Button
            onClick={() => sendNotification.mutate()}
            disabled={!notificationTitle || !notificationBody || sendNotification.isPending}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {sendNotification.isPending ? 'Envoi en cours...' : 'Envoyer'}
          </Button>
        </CardContent>
      </Card>

      {/* Preset Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications prédéfinies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {presetNotifications.map((preset, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex-1">
                <p className="font-medium">{preset.title}</p>
                <p className="text-sm text-muted-foreground">{preset.body}</p>
                <Badge variant="outline" className="mt-1">
                  {preset.type === 'all' ? 'Tous' : preset.type === 'prayer' ? 'Prière' : 'Ramadan'}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNotificationTitle(preset.title);
                  setNotificationBody(preset.body);
                  setNotificationType(preset.type);
                }}
              >
                Utiliser
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Invitations notifications */}
      <Card>
        <CardHeader>
          <CardTitle>📢 Invitations notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={() => handleRenvoyerInvitation()}
            className="w-full py-4 rounded-2xl font-bold text-lg bg-orange-500 hover:bg-orange-600"
          >
            🔔 Renvoyer à tous les élèves
          </Button>

          <Select value={envoiIndividuel} onValueChange={setEnvoiIndividuel}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un élève..." />
            </SelectTrigger>
            <SelectContent>
              {elevesStatut.map(e => (
                <SelectItem key={e.id} value={e.id}>
                  {e.notifActive ? '✅' : '❌'} {e.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {envoiIndividuel && (
            <Button
              onClick={() => handleRenvoyerInvitation(envoiIndividuel)}
              className="w-full py-4 rounded-2xl font-bold text-lg"
            >
              🔔 Envoyer à cet élève
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Statut notifications élèves */}
      <Card>
        <button
          onClick={() => setShowStatuts(!showStatuts)}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold">📋 Statut notifications élèves</span>
            <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-300">
              {elevesStatut.filter(e => e.notifActive).length} actifs
            </Badge>
            <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-300">
              {elevesStatut.filter(e => !e.notifActive).length} inactifs
            </Badge>
          </div>
          {showStatuts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showStatuts && (
          <CardContent className="pt-0">
            {elevesStatut.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-2">Aucun élève inscrit</p>
            )}
            {elevesStatut.map(e => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm font-medium">{e.full_name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={e.notifActive ? 'bg-green-500/10 text-green-700 border-green-300' : 'bg-red-500/10 text-red-700 border-red-300'}>
                    {e.notifActive ? '✅ Actif' : '❌ Inactif'}
                  </Badge>
                  {!e.notifActive && (
                    <Button size="sm" variant="outline" onClick={() => handleRenvoyerInvitation(e.id)} className="text-xs">
                      Relancer
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

    </div>
  );
};

export default AdminNotifications;
