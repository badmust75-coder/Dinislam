import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const GROUPS = [
  { key: 'petits', label: 'Petits', active: 'bg-blue-200 text-blue-800 border border-blue-400', },
  { key: 'jeunes', label: 'Jeunes', active: 'bg-green-200 text-green-800 border border-green-400', },
  { key: 'adultes', label: 'Adultes', active: 'bg-purple-200 text-purple-800 border border-purple-400', },
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
                const displayName = student.full_name || student.email?.split('@')[0] || 'Utilisateur';
                const ageLabel = age !== null ? `${age} ans` : 'Âge non renseigné';

                return (
                  <div key={student.user_id} className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                    <p className="text-sm font-medium text-foreground break-words">
                      {displayName} — <span className="text-muted-foreground font-normal">{ageLabel}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      {GROUPS.map(g => (
                        <button
                          key={g.key}
                          onClick={() => updateGroupMutation.mutate({ userId: student.user_id, group: g.key })}
                          className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                            effectiveGroup === g.key
                              ? g.active
                              : 'bg-muted text-muted-foreground border border-transparent hover:bg-muted/80'
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
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
