import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Bell, Send, Users, Moon, Clock, Eye, EyeOff } from 'lucide-react';
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
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [notificationType, setNotificationType] = useState<'all' | 'prayer' | 'ramadan'>('all');
  const [showSubs, setShowSubs] = useState(false);

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

  const { data: subscriptionsList, refetch: refetchSubs } = useQuery({
    queryKey: ['admin-push-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('user_id, endpoint, p256dh, auth_key, is_active, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: showSubs,
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

  return (
    <div className="space-y-6">
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

      {/* Send Custom Notification */}
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

      {/* Subscriptions Debug */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Abonnements push</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowSubs(!showSubs);
                if (!showSubs) refetchSubs();
              }}
            >
              {showSubs ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showSubs ? 'Masquer' : 'Voir les abonnements'}
            </Button>
          </CardTitle>
        </CardHeader>
        {showSubs && (
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Actif</TableHead>
                    <TableHead>p256dh</TableHead>
                    <TableHead>auth_key</TableHead>
                    <TableHead>Créé le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptionsList?.map((sub, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">
                        {sub.user_id?.substring(0, 6)}…
                      </TableCell>
                      <TableCell>
                        <Badge variant={sub.is_active ? 'default' : 'destructive'}>
                          {sub.is_active ? 'Oui' : 'Non'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {sub.p256dh?.substring(0, 10)}…
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {sub.auth_key?.substring(0, 10)}…
                      </TableCell>
                      <TableCell className="text-xs">
                        {sub.created_at ? new Date(sub.created_at).toLocaleDateString('fr-FR') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!subscriptionsList || subscriptionsList.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Aucun abonnement trouvé
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default AdminNotifications;
