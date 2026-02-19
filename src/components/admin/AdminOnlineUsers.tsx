/**
 * AdminOnlineUsers — Real-time online users monitoring card
 * Shows users with green dot (online < 5min) and last connection time
 */
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Circle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

const AdminOnlineUsers = () => {
  const queryClient = useQueryClient();

  // Update current user's last_seen every minute
  useEffect(() => {
    const updateLastSeen = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await (supabase as any).from('profiles').update({ last_seen: new Date().toISOString() }).eq('user_id', user.id);
      }
    };
    updateLastSeen();
    const interval = setInterval(updateLastSeen, 60_000);
    return () => clearInterval(interval);
  }, []);

  const { data: users = [] } = useQuery({
    queryKey: ['admin-online-users'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('user_id, full_name, email, last_seen, is_approved')
        .eq('is_approved', true)
        .order('last_seen', { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as Array<{ user_id: string; full_name: string | null; email: string | null; last_seen: string | null; is_approved: boolean }>;
    },
    refetchInterval: 30_000,
  });

  // Realtime: refresh when profiles change
  useEffect(() => {
    const channel = supabase
      .channel('admin-online-users-rt')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-online-users'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const now = Date.now();
  const onlineUsers = users.filter((u: any) => u.last_seen && (now - new Date(u.last_seen).getTime()) < ONLINE_THRESHOLD_MS);
  const recentUsers = users.slice(0, 8); // Show last 8 active users

  return (
    <div className="rounded-2xl border border-border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">Suivi en temps réel</p>
            <p className="text-xs text-muted-foreground">Dernières connexions</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
            {onlineUsers.length} en ligne
          </span>
        </div>
      </div>

      {/* User list */}
      <div className="divide-y divide-border/50">
        {recentUsers.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Aucune activité récente
          </div>
        ) : (
          recentUsers.map((user: any) => {
            const lastSeenMs = user.last_seen ? now - new Date(user.last_seen).getTime() : Infinity;
            const isOnline = lastSeenMs < ONLINE_THRESHOLD_MS;
            const displayName = user.full_name || user.email?.split('@')[0] || 'Utilisateur';

            return (
              <div key={user.user_id} className="flex items-center gap-3 px-4 py-2.5">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {/* Online indicator */}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${
                      isOnline ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                    }`}
                  />
                </div>

                {/* Name & last seen */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.last_seen
                      ? isOnline
                        ? 'En ligne maintenant'
                        : `il y a ${formatDistanceToNow(new Date(user.last_seen), { locale: fr })}`
                      : 'Jamais connecté'}
                  </p>
                </div>

                {/* Status badge */}
                {isOnline && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shrink-0">
                    Actif
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminOnlineUsers;
