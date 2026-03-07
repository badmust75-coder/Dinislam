import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminUsersListProps {
  onBack: () => void;
}

const AdminUsersList = ({ onBack }: AdminUsersListProps) => {
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
      return profiles || [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-20 bg-muted/50" />
          </Card>
        ))}
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground">Utilisateurs</h2>
          <p className="text-sm text-muted-foreground">{users?.length || 0} inscrit(s)</p>
        </div>
      </div>

      <div className="space-y-3">
        {users?.map((user) => (
          <Card key={user.user_id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {user.full_name || 'Utilisateur'}
                  </p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3" />
                    <span>Inscrit le {formatDate(user.created_at)}</span>
                  </div>
                </div>
                <Badge variant="outline">Élève</Badge>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!users || users.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            Aucun utilisateur inscrit
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsersList;
