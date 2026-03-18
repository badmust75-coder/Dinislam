import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    setJoursJeunes(fastingData.filter(f => f.has_fasted).map(f => f.day_number));
  }, [fastingData]);

  const handleClickJour = async (dayNumber: number) => {
    if (!user?.id) return;
    const dejaJeune = joursJeunes.includes(dayNumber);

    if (dejaJeune) {
      // Delete by user_id + day_number
      const { error } = await supabase
        .from('user_ramadan_fasting')
        .delete()
        .eq('user_id', user.id)
        .eq('day_number', dayNumber);

      if (error) { toast.error('Erreur suppression: ' + error.message); return; }
      setJoursJeunes(prev => prev.filter(d => d !== dayNumber));
      queryClient.invalidateQueries({ queryKey: ['ramadan-fasting'] });
      return;
    }

    // Check if row already exists before inserting
    const { data: existing, error: checkError } = await supabase
      .from('user_ramadan_fasting')
      .select('id')
      .eq('user_id', user.id)
      .eq('day_number', dayNumber)
      .maybeSingle();

    if (checkError) { toast.error('Erreur: ' + checkError.message); return; }

    if (existing) {
      await supabase
        .from('user_ramadan_fasting')
        .update({ has_fasted: true } as any)
        .eq('id', existing.id);
    } else {
      const { error: insertError } = await (supabase as any)
        .from('user_ramadan_fasting')
        .insert({
          user_id: user.id,
          day_number: dayNumber,
          has_fasted: true,
          date: new Date().toISOString().split('T')[0],
        });

      if (insertError) {
        toast.error('Erreur insert: ' + insertError.message);
        return;
      }
    }

    setJoursJeunes(prev => [...prev, dayNumber]);

    // Confettis
    const confetti = (await import('canvas-confetti')).default;
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#22c55e', '#16a34a', '#4ade80', '#f59e0b'],
      zIndex: 9999,
    });

    queryClient.invalidateQueries({ queryKey: ['ramadan-fasting'] });
  };

  const fastedCount = joursJeunes.length;

  return (
    <div className="module-card rounded-2xl p-4 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Suivi du Jeûne 🌙</span>
        <span className="text-xs text-muted-foreground">{fastedCount}/30 jours jeûnés</span>
      </div>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 30 }, (_, i) => i + 1).map(day => {
          const jeune = joursJeunes.includes(day);
          return (
            <button
              key={day}
              onClick={() => handleClickJour(day)}
              className="flex items-center justify-center transition-all active:scale-90"
              style={{ 
                width: '28px', 
                height: '28px',
                background: 'none',
                border: 'none',
                padding: 0
              }}
            >
              <svg 
                viewBox="0 0 24 24" 
                width="28" 
                height="28"
              >
                <polygon
                  points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                  fill={jeune ? '#22c55e' : '#e5e7eb'}
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                />
                <text
                  x="12"
                  y="14"
                  textAnchor="middle"
                  fontSize={day >= 10 ? "5.5" : "6.5"}
                  fontWeight="bold"
                  fill={jeune ? '#ffffff' : '#374151'}
                  fontFamily="Arial, sans-serif"
                >
                  {day}
                </text>
              </svg>
            </button>
          );
        })}
      </div>
      <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <svg viewBox="0 0 24 24" width="14" height="14">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              fill="#22c55e" stroke="#16a34a" strokeWidth="1"/>
          </svg>
          Jeûné
        </span>
        <span className="flex items-center gap-1">
          <svg viewBox="0 0 24 24" width="14" height="14">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              fill="#e5e7eb" stroke="#d1d5db" strokeWidth="1"/>
          </svg>
          À marquer
        </span>
      </div>
    </div>
  );
};

export default FastingTracker;
