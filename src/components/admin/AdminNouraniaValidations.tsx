import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { sendPushNotification } from '@/lib/pushHelper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Clock, ArrowLeft, User } from 'lucide-react';
import { useEffect } from 'react';

interface AdminNouraniaValidationsProps {
  onBack: () => void;
}

const AdminNouraniaValidations = ({ onBack }: AdminNouraniaValidationsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-nourania-validations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nourania_validation_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = [...new Set((data || []).map(r => r.user_id))];
      const lessonIds = [...new Set((data || []).map(r => r.lesson_id))];

      const [{ data: profiles }, { data: lessons }] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, email').in('user_id', userIds.length ? userIds : ['none']),
        supabase.from('nourania_lessons').select('id, lesson_number, title_arabic, title_french').in('id', lessonIds.length ? lessonIds : [0]),
      ]);

      return (data || []).map(req => ({
        ...req,
        profile: profiles?.find(p => p.user_id === req.user_id),
        lesson: lessons?.find(l => l.id === req.lesson_id),
      }));
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('admin-nourania-validation-requests')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'nourania_validation_requests',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-nourania-validations'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const approveMutation = useMutation({
    mutationFn: async (request: any) => {
      // 1. Mark request as approved
      const { error: updateError } = await supabase
        .from('nourania_validation_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // 2. Validate the nourania progress
      const existing = await supabase
        .from('user_nourania_progress')
        .select('id')
        .eq('user_id', request.user_id)
        .eq('lesson_id', request.lesson_id)
        .maybeSingle();

      if (existing.data) {
        const { error } = await supabase
          .from('user_nourania_progress')
          .update({ is_validated: true, updated_at: new Date().toISOString() })
          .eq('id', existing.data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_nourania_progress')
          .insert({ user_id: request.user_id, lesson_id: request.lesson_id, is_validated: true });
        if (error) throw error;
      }
    },
    onSuccess: (_, request) => {
      toast({
        title: '✅ Leçon validée, niveau suivant débloqué !',
        description: `Leçon ${request.lesson?.lesson_number || ''} validée pour ${request.profile?.full_name || 'l\'élève'}`,
      });
      
      // Notify student
      sendPushNotification({
        title: '⭐ Félicitations !',
        body: `Ton professeur a validé ${request.lesson?.title_french || 'ta leçon'} ! Continue comme ça !`,
        type: 'user',
        userId: request.user_id,
      });
      
      queryClient.invalidateQueries({ queryKey: ['admin-nourania-validations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-nourania-count'] });
    },
    onError: (err: any) => {
      console.error('Erreur validation nourania:', err);
      toast({ title: 'Erreur lors de la validation', description: err?.message || 'Veuillez réessayer.', variant: 'destructive' });
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
          <h2 className="text-xl font-bold text-foreground">Validation Nourania</h2>
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
                    <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                      <User className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {req.profile?.full_name || req.profile?.email || 'Élève'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Leçon {req.lesson?.lesson_number} - {req.lesson?.title_french}
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

export default AdminNouraniaValidations;
