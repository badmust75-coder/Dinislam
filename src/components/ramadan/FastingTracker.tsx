import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const FastingTracker = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: fastingData = [] } = useQuery({
    queryKey: ['ramadan-fasting', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_ramadan_fasting')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const toggleFastingMutation = useMutation({
    mutationFn: async ({ dayNumber, hasFasted }: { dayNumber: number; hasFasted: boolean }) => {
      if (!user?.id) throw new Error('Non connecté');
      const existing = fastingData.find(f => f.day_number === dayNumber);
      if (existing) {
        const { error } = await supabase
          .from('user_ramadan_fasting')
          .update({ has_fasted: hasFasted })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_ramadan_fasting')
          .insert({ user_id: user.id, day_number: dayNumber, has_fasted: hasFasted });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ramadan-fasting'] }),
  });

  const getFastingStatus = (dayNumber: number) => {
    const entry = fastingData.find(f => f.day_number === dayNumber);
    if (!entry) return 'default'; // not yet marked
    return entry.has_fasted ? 'fasted' : 'not-fasted';
  };

  const handleToggle = (dayNumber: number) => {
    const current = getFastingStatus(dayNumber);
    if (current === 'default') {
      toggleFastingMutation.mutate({ dayNumber, hasFasted: true });
    } else if (current === 'fasted') {
      toggleFastingMutation.mutate({ dayNumber, hasFasted: false });
    } else {
      // not-fasted -> back to default (delete or set fasted)
      toggleFastingMutation.mutate({ dayNumber, hasFasted: true });
    }
  };

  const fastedCount = fastingData.filter(f => f.has_fasted).length;

  return (
    <div className="module-card rounded-2xl p-4 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Suivi du Jeûne 🌙</span>
        <span className="text-xs text-muted-foreground">{fastedCount}/30 jours jeûnés</span>
      </div>
      <div className="grid grid-cols-10 gap-1.5">
        {Array.from({ length: 30 }, (_, i) => i + 1).map(day => {
          const status = getFastingStatus(day);
          return (
            <button
              key={day}
              onClick={() => handleToggle(day)}
              className={cn(
                'relative flex items-center justify-center w-full aspect-square rounded-lg transition-all duration-200 hover:scale-110',
                status === 'fasted' && 'ring-2 ring-amber-400',
              )}
              title={`Jour ${day} - ${status === 'fasted' ? 'Jeûné ✓' : status === 'not-fasted' ? 'Non jeûné' : 'Cliquer pour marquer'}`}
            >
              <Star
                className={cn(
                  'h-5 w-5 sm:h-6 sm:w-6 transition-colors',
                  status === 'fasted' && 'text-green-500 fill-green-500',
                  status === 'not-fasted' && 'text-yellow-400 fill-yellow-400',
                  status === 'default' && 'text-red-300 fill-red-200',
                )}
              />
              <span className="absolute text-[7px] font-bold text-foreground/60">{day}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 justify-center text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 text-green-500 fill-green-500" />
          <span>Jeûné</span>
        </div>
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
          <span>Non jeûné</span>
        </div>
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 text-red-300 fill-red-200" />
          <span>À marquer</span>
        </div>
      </div>
    </div>
  );
};

export default FastingTracker;
