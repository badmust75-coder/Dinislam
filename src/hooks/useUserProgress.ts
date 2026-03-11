import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ModuleProgress {
  validated: number;
  total: number;
}

interface UserProgress {
  sourates: ModuleProgress;
  nourania: ModuleProgress;
  ramadan: { completed: number; total: number };
  alphabet: ModuleProgress;
  invocations: { memorized: number; total: number };
  prayer: { validated: number };
}

export const useUserProgress = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-progress', user?.id],
    queryFn: async (): Promise<UserProgress> => {
      if (!user) throw new Error('No user');

      const [
        { data: sourateProgress },
        { data: nouraniaProgress },
        { data: ramadanProgress },
        { data: alphabetProgress },
        { data: invocationProgress },
        { data: dailyPrayers },
        { count: totalSourates },
        { count: totalNourania },
        { count: totalRamadan },
        { count: totalAlphabet },
        { count: totalInvocations },
      ] = await Promise.all([
        (supabase as any).from('user_sourate_progress').select('is_validated').eq('user_id', user.id),
        (supabase as any).from('user_nourania_progress').select('is_validated').eq('user_id', user.id),
        (supabase as any).from('user_ramadan_progress').select('video_watched, quiz_completed').eq('user_id', user.id),
        (supabase as any).from('user_alphabet_progress').select('is_validated').eq('user_id', user.id),
        (supabase as any).from('user_invocation_progress').select('is_memorized').eq('user_id', user.id),
        (supabase as any).from('user_daily_prayers').select('is_checked').eq('user_id', user.id).eq('is_checked', true),
        supabase.from('sourates').select('*', { count: 'exact', head: true }),
        supabase.from('nourania_lessons').select('*', { count: 'exact', head: true }),
        supabase.from('ramadan_days').select('*', { count: 'exact', head: true }),
        supabase.from('alphabet_letters').select('*', { count: 'exact', head: true }),
        supabase.from('invocations').select('*', { count: 'exact', head: true }),
      ]);

      return {
        sourates: {
          validated: sourateProgress?.filter(p => p.is_validated).length || 0,
          total: totalSourates || 0,
        },
        nourania: {
          validated: nouraniaProgress?.filter(p => p.is_validated).length || 0,
          total: totalNourania || 0,
        },
        ramadan: {
          completed: ramadanProgress?.filter(p => p.video_watched && p.quiz_completed).length || 0,
          total: totalRamadan || 0,
        },
        alphabet: {
          validated: alphabetProgress?.filter(p => p.is_validated).length || 0,
          total: totalAlphabet || 0,
        },
        invocations: {
          memorized: invocationProgress?.filter(p => p.is_memorized).length || 0,
          total: totalInvocations || 0,
        },
        prayer: {
          validated: dailyPrayers?.length || 0,
        },
      };
    },
    enabled: !!user,
    staleTime: 30000,
  });
};
