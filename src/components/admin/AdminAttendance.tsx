import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface AdminAttendanceProps {
  onBack: () => void;
}

type AttendanceStatus = 'present' | 'absent' | 'late';

const STATUS_DISPLAY: Record<AttendanceStatus, { color: string; label: string }> = {
  present: { color: '#22c55e', label: 'Présent' },
  absent: { color: '#ef4444', label: 'Absent' },
  late: { color: '#f59e0b', label: 'En retard' },
};

const AdminAttendance = ({ onBack }: AdminAttendanceProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: students = [] } = useQuery({
    queryKey: ['attendance-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .eq('is_approved', true)
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: records = [], refetch: refetchRecords } = useQuery({
    queryKey: ['attendance-records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .order('date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const dates = useMemo(() => {
    const dateSet = new Set(records.map(r => r.date));
    return Array.from(dateSet).sort();
  }, [records]);

  const recordMap = useMemo(() => {
    const map = new Map<string, { id: string; status: AttendanceStatus }>();
    records.forEach(r => {
      map.set(`${r.user_id}-${r.date}`, { id: r.id, status: r.status as AttendanceStatus });
    });
    return map;
  }, [records]);

  const addToday = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    if (dates.includes(today)) {
      toast.info("La date d'aujourd'hui existe déjà");
      return;
    }
    if (students.length > 0) {
      const { error } = await supabase.from('attendance_records').insert({
        user_id: students[0].user_id,
        date: today,
        status: 'present',
        marked_by: user?.id,
      });
      if (error && !error.message.includes('duplicate')) {
        toast.error('Erreur: ' + error.message);
        return;
      }
    }
    refetchRecords();
    queryClient.invalidateQueries({ queryKey: ['all-attendance'] });
    toast.success('Séance du jour ajoutée');
  };

  const deleteDate = async (date: string) => {
    const { error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('date', date);
    if (error) {
      toast.error('Erreur: ' + error.message);
      return;
    }
    refetchRecords();
    queryClient.invalidateQueries({ queryKey: ['all-attendance'] });
    toast.success('Séance supprimée');
  };

  const handleClickPresence = async (userId: string, date: string, currentStatus?: AttendanceStatus) => {
    const cycle: Record<string, AttendanceStatus | null> = {
      present: 'absent',
      absent: 'late',
      late: null,
    };

    if (!currentStatus) {
      // Empty → Present
      const { error } = await supabase.from('attendance_records').insert({
        user_id: userId,
        date,
        status: 'present',
        marked_by: user?.id,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const nextStatus = cycle[currentStatus] ?? null;
      const record = recordMap.get(`${userId}-${date}`);
      if (nextStatus === null && record) {
        // Late → Delete
        const { error } = await supabase
          .from('attendance_records')
          .delete()
          .eq('id', record.id);
        if (error) {
          toast.error(error.message);
          return;
        }
      } else if (record && nextStatus) {
        // Cycle to next
        const { error } = await supabase
          .from('attendance_records')
          .update({ status: nextStatus })
          .eq('id', record.id);
        if (error) {
          toast.error(error.message);
          return;
        }
      }
    }
    refetchRecords();
    queryClient.invalidateQueries({ queryKey: ['all-attendance'] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>
        <h2 className="text-xl font-bold text-foreground">📋 Registre de Présence</h2>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {Object.entries(STATUS_DISPLAY).map(([key, val]) => (
          <span key={key} className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: val.color }} />
            {val.label}
          </span>
        ))}
      </div>

      {/* Tableau */}
      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        <ScrollArea className="w-full">
          <div className="min-w-max">
            {/* Header */}
            <div className="flex border-b border-border bg-muted/30">
              <div className="w-48 shrink-0 px-4 py-3 font-semibold text-foreground text-sm sticky left-0 bg-muted/30 z-10">
                Élève
              </div>
              {dates.map(date => (
                <div key={date} className="w-20 shrink-0 text-center py-2 text-xs text-muted-foreground border-l border-border">
                  <div className="font-semibold">{format(parseISO(date), 'EEE', { locale: fr })}</div>
                  <div>{format(parseISO(date), 'dd/MM', { locale: fr })}</div>
                  <button
                    onClick={() => deleteDate(date)}
                    className="mt-1 text-destructive hover:text-destructive/80 transition-colors"
                    title="Supprimer cette séance"
                  >
                    <Trash2 className="h-3 w-3 mx-auto" />
                  </button>
                </div>
              ))}
              <div className="w-16 shrink-0 flex items-center justify-center border-l border-border">
                <Button variant="ghost" size="icon" onClick={addToday} className="h-8 w-8">
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Rows */}
            {students.map((student, idx) => (
              <div
                key={student.user_id}
                className={cn(
                  'flex border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors',
                  idx % 2 === 0 ? 'bg-card' : 'bg-muted/10'
                )}
              >
                <div className="w-48 shrink-0 px-4 py-3 text-sm font-medium text-foreground truncate sticky left-0 bg-inherit z-10 flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">{idx + 1}.</span>
                  {student.full_name || student.email || 'Sans nom'}
                </div>
                {dates.map(date => {
                  const record = recordMap.get(`${student.user_id}-${date}`);
                  const status = record?.status;
                  const display = status ? STATUS_DISPLAY[status] : null;

                  return (
                    <div
                      key={date}
                      className="w-20 shrink-0 flex items-center justify-center border-l border-border cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => handleClickPresence(student.user_id, date, status)}
                    >
                      {display ? (
                        <div
                          className="w-7 h-7 rounded-full"
                          style={{ backgroundColor: display.color }}
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full border-2 border-dashed border-muted-foreground/30" />
                      )}
                    </div>
                  );
                })}
                <div className="w-16 shrink-0 border-l border-border" />
              </div>
            ))}

            {students.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                Aucun élève inscrit
              </div>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Résumé */}
      {dates.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-card p-4">
          <h3 className="font-semibold text-foreground mb-3">📊 Résumé</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-bold" style={{ color: '#22c55e' }}>
                {records.filter(r => r.status === 'present').length}
              </div>
              <p className="text-xs text-muted-foreground">Présences</p>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: '#ef4444' }}>
                {records.filter(r => r.status === 'absent').length}
              </div>
              <p className="text-xs text-muted-foreground">Absences</p>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>
                {records.filter(r => r.status === 'late').length}
              </div>
              <p className="text-xs text-muted-foreground">Retards</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendance;
