import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Check, Bell, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserMessage {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

const AdminMessages = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMessageCount, setNewMessageCount] = useState(0);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['admin-user-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for each message
      const messagesWithProfiles = await Promise.all(
        data.map(async (msg) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', msg.user_id)
            .single();
          return { ...msg, profile };
        })
      );

      return messagesWithProfiles as UserMessage[];
    },
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('user-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_messages',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['admin-user-messages'] });
          setNewMessageCount((prev) => prev + 1);
          toast({
            title: '📬 Nouveau message !',
            description: 'Un élève vient d\'envoyer un message',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('user_messages')
        .update({ is_read: true })
        .eq('id', messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-messages'] });
    },
  });

  const unreadCount = messages.filter((m) => !m.is_read).length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-24 bg-muted/50" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with badge */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Messages des élèves
        </h2>
        {unreadCount > 0 && (
          <Badge variant="destructive" className="animate-pulse">
            {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Messages list */}
      <div className="space-y-3">
        {messages.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun message pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          messages.map((msg) => (
            <Card
              key={msg.id}
              className={`transition-all ${
                !msg.is_read ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-foreground">
                          {msg.profile?.full_name || 'Élève'}
                        </p>
                        {!msg.is_read && (
                          <Badge variant="default" className="text-xs">
                            Nouveau
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {msg.profile?.email} •{' '}
                        {format(new Date(msg.created_at), 'dd MMM yyyy à HH:mm', {
                          locale: fr,
                        })}
                      </p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {msg.message}
                      </p>
                    </div>
                  </div>
                  {!msg.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsReadMutation.mutate(msg.id)}
                      className="flex-shrink-0"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminMessages;
