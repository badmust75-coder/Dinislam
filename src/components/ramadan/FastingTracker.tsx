import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

const FastingTracker = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [joursJeunes, setJoursJeunes] = useState<number[]>([]);

  const { data: fastingData = [] } = useQuery({
    queryKey: ['ramadan-fasting', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_ramadan_fasting')
        .select('*')
        .eq('user_id', user.id)
        .eq('has_fasted', true);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    setJoursJeunes(fastingData.map(f => f.day_number));
  }, [fastingData]);

  const handleClickJour = async (dayNumber: number) => {
    if (!user?.id) return;
    const dejaJeune = joursJeunes.includes(dayNumber);

    if (dejaJeune) {
      // Optimistic remove
      setJoursJeunes(prev => prev.filter(d => d !== dayNumber));
      const { error } = await supabase
        .from('user_ramadan_fasting')
        .delete()
        .eq('user_id', user.id)
        .eq('day_number', dayNumber);
      if (error) {
        toast.error('Erreur: ' + error.message);
        setJoursJeunes(prev => [...prev, dayNumber]);
        return;
      }
    } else {
      // Optimistic add
      setJoursJeunes(prev => [...prev, dayNumber]);
      const { error } = await (supabase as any)
        .from('user_ramadan_fasting')
        .upsert({
          user_id: user.id,
          day_number: dayNumber,
          has_fasted: true,
          date: new Date().toISOString().split('T')[0],
        }, { onConflict: 'user_id,day_number' });
      if (error) {
        toast.error('Erreur: ' + error.message);
        setJoursJeunes(prev => prev.filter(d => d !== dayNumber));
        return;
      }
      // Confettis
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#f59e0b', '#22c55e', '#3b82f6', '#f97316'],
        zIndex: 9999,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['ramadan-fasting'] });
  };

  const fastedCount = joursJeunes.length;

  return (
    <div className="module-card rounded-2xl p-4 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Suivi du Jeûne 🌙</span>
        <span className="text-xs text-muted-foreground">{fastedCount}/30 jours jeûnés</span>
      </div>
      <div className="grid grid-cols-10 gap-1.5">
        {Array.from({ length: 30 }, (_, i) => i + 1).map(day => {
          const jeune = joursJeunes.includes(day);
          return (
            <button
              key={day}
              onClick={() => handleClickJour(day)}
              className="relative flex flex-col items-center justify-center w-full aspect-square transition-all active:scale-90"
            >
              <span style={{
                fontSize: '20px',
                filter: jeune ? 'none' : 'grayscale(100%) opacity(0.4)',
                transition: 'filter 0.2s',
              }}>
                ⭐
              </span>
              <span className={cn(
                "text-[9px] font-bold",
                jeune ? 'text-amber-500' : 'text-muted-foreground',
              )}>{day}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 justify-center text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <span style={{ fontSize: '12px' }}>⭐</span>
          <span>Jeûné</span>
        </div>
        <div className="flex items-center gap-1">
          <span style={{ fontSize: '12px', filter: 'grayscale(100%) opacity(0.4)' }}>⭐</span>
          <span>À marquer</span>
        </div>
      </div>
    </div>
  );
};

export default FastingTracker;
