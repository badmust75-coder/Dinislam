import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';


const GROUPS = [
  { key: 'petits', label: 'Petits', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  { key: 'jeunes', label: 'Jeunes', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  { key: 'adultes', label: 'Adultes', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
];

const calculateAge = (dob: string | null): number | null => {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
};

const getAutoGroup = (age: number | null): string | null => {
  if (age === null) return null;
  if (age <= 6) return 'petits';
  if (age <= 10) return 'jeunes';
  return 'adultes';
};

const AdminPrayerGroupManager = () => {
  const queryClient = useQueryClient();

  const { data: students = [] } = useQuery({
    queryKey: ['admin-prayer-group-students'],
    queryFn: async () => {
      const { data: profiles, error } = await (supabase as any)
        .from('profiles')
        .select('user_id, full_name, email, date_of_birth, prayer_group')
        .eq('is_approved', true)
        .order('full_name', { ascending: true });
      if (error) throw error;

      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      const adminIds = new Set((adminRoles || []).map(r => r.user_id));

      return ((profiles || []) as Array<{
        user_id: string;
        full_name: string | null;
        email: string | null;
        date_of_birth: string | null;
        prayer_group: string | null;
      }>).filter(u => !adminIds.has(u.user_id));
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({ userId, group }: { userId: string; group: string | null }) => {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ prayer_group: group })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-prayer-group-students'] });
      toast.success('Groupe mis à jour');
    },
    onError: () => toast.error('Erreur'),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          👶 Gestion Age/Classe
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
          <div className="space-y-2">
            {students.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun élève</p>
            ) : (
              students.map((student) => {
                const age = calculateAge(student.date_of_birth);
                const autoGroup = getAutoGroup(age);
                const effectiveGroup = student.prayer_group || autoGroup;
                const isManual = !!student.prayer_group;
                const displayName = student.full_name || student.email?.split('@')[0] || 'Utilisateur';
                const groupInfo = GROUPS.find(g => g.key === effectiveGroup);

                return (
                  <div key={student.user_id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">{displayName.charAt(0).toUpperCase()}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{age !== null ? `${age} ans` : 'Âge inconnu'}</span>
                        {groupInfo && (
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${groupInfo.color}`}>
                            {groupInfo.label}
                            {isManual && ' ✏️'}
                          </span>
                        )}
                        {!effectiveGroup && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                            Non défini
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Group buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {GROUPS.map(g => (
                        <button
                          key={g.key}
                          onClick={() => updateGroupMutation.mutate({ userId: student.user_id, group: g.key })}
                          className={`text-[10px] px-2 py-1 rounded-lg font-semibold transition-all ${
                            effectiveGroup === g.key
                              ? `${g.color} ring-1 ring-current`
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                      {isManual && (
                        <button
                          onClick={() => updateGroupMutation.mutate({ userId: student.user_id, group: null })}
                          className="text-[10px] px-1.5 py-1 rounded-lg bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                          title="Reset automatique"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminPrayerGroupManager;
