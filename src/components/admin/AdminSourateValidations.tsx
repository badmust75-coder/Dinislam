import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { sendPushNotification } from '@/lib/pushHelper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Clock, ArrowLeft, User } from 'lucide-react';
import { useEffect } from 'react';

interface AdminSourateValidationsProps {
  onBack: () => void;
}

const AdminSourateValidations = ({ onBack }: AdminSourateValidationsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-sourate-validations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sourate_validation_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user profiles and sourate info
      const userIds = [...new Set((data || []).map(r => r.user_id))];
      const sourateIds = [...new Set((data || []).map(r => r.sourate_id))];

      const [{ data: profiles }, { data: sourates }] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, email').in('user_id', userIds),
        supabase.from('sourates').select('id, number, name_arabic, name_french').in('id', sourateIds),
      ]);

      return (data || []).map(req => ({
        ...req,
        profile: profiles?.find(p => p.user_id === req.user_id),
        sourate: sourates?.find(s => s.id === req.sourate_id),
      }));
    },
  });

  // Realtime subscription for new requests
  useEffect(() => {
    const channel = supabase
      .channel('admin-validation-requests')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sourate_validation_requests',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-sourate-validations'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const approveMutation = useMutation({
    mutationFn: async (request: any) => {
      // 1. Mark request as approved
      const { error: updateError } = await supabase
        .from('sourate_validation_requests')
        .update({ 
          status: 'approved', 
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id 
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // 2. Validate the sourate progress
      const { error: progressError } = await supabase
        .from('user_sourate_progress')
        .upsert({
          user_id: request.user_id,
          sourate_id: request.sourate_id,
          is_validated: true,
          progress_percentage: 100,
        }, { onConflict: 'user_id,sourate_id' });

      if (progressError) throw progressError;
    },
    onSuccess: (_, request) => {
      toast({ title: `Sourate ${request.sourate?.name_french || ''} validée pour ${request.profile?.full_name || 'l\'élève'}` });
      
      // Notify student
      sendPushNotification({
        title: '⭐ Félicitations !',
        body: `Ton professeur a validé ${request.sourate?.name_french || 'ta sourate'} ! Continue comme ça !`,
        type: 'user',
        userId: request.user_id,
      });
      
      queryClient.invalidateQueries({ queryKey: ['admin-sourate-validations'] });
    },
    onError: () => {
      toast({ title: 'Erreur lors de la validation', variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground">Validations en attente</h2>
          <p className="text-sm text-muted-foreground">{requests?.length || 0} demande(s)</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-20 bg-muted/50" />
            </Card>
          ))}
        </div>
      ) : requests?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-400" />
          <p>Aucune validation en attente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests?.map((req) => (
            <Card key={req.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {req.profile?.full_name || req.profile?.email || 'Élève'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Sourate {req.sourate?.number} - {req.sourate?.name_french}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {new Date(req.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-green-500 hover:bg-green-600 text-white"
                    onClick={() => approveMutation.mutate(req)}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Valider
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSourateValidations;
