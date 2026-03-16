import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AdminRegistrationValidations from '@/components/admin/AdminRegistrationValidations';
import AdminSourateValidations from '@/components/admin/AdminSourateValidations';
import AdminNouraniaValidations from '@/components/admin/AdminNouraniaValidations';
import AdminHomework from '@/components/admin/AdminHomework';
import AdminGlobalStats from '@/components/admin/AdminGlobalStats';
import AdminNotifications from '@/components/admin/AdminNotifications';

interface AdminCommandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingRegistrations: number;
  pendingSourates: number;
  pendingNourania: number;
  pendingInvocations: number;
  pendingMessages: number;
  pendingHomework: number;
  total: number;
}

const BOUTONS_DEFAULT = [
  { id: 'inscriptions', label: 'Inscriptions en attente', section: 'users', emoji: '📝' },
  { id: 'sourates', label: 'Sourates à valider', section: 'sourates-validations', emoji: '📖' },
  { id: 'nourania', label: 'Nourania à valider', section: 'nourania-validations', emoji: '🔤' },
  { id: 'devoirs', label: 'Devoirs à corriger', section: 'cahier-texte', emoji: '📚' },
];

const AdminCommandModal = ({
  open,
  onOpenChange,
  pendingRegistrations,
  pendingSourates,
  pendingNourania,
  pendingHomework,
  total,
}: AdminCommandModalProps) => {
  const navigate = useNavigate();
  const [boutons, setBoutons] = useState(BOUTONS_DEFAULT);
  const [modalSection, setModalSection] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const longPressTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const compteurs: Record<string, number> = {
    inscriptions: pendingRegistrations,
    sourates: pendingSourates,
    nourania: pendingNourania,
    devoirs: pendingHomework,
  };

  useEffect(() => {
    const saved = localStorage.getItem('admin_boutons_order');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === BOUTONS_DEFAULT.length) {
          setBoutons(parsed);
        }
      } catch { /* ignore */ }
    }
  }, []);

  const handlePressStart = (index: number) => {
    longPressTimers.current[index] = setTimeout(() => {
      setDragIndex(index);
      setIsDragging(true);
    }, 2000);
  };

  const handlePressEnd = (index: number) => {
    clearTimeout(longPressTimers.current[index]);
    if (!isDragging) {
      setModalSection(boutons[index].section);
    }
    setIsDragging(false);
    setDragIndex(null);
  };

  const handleDragOver = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    const newBoutons = [...boutons];
    const [moved] = newBoutons.splice(dragIndex, 1);
    newBoutons.splice(index, 0, moved);
    setBoutons(newBoutons);
    setDragIndex(index);
    localStorage.setItem('admin_boutons_order', JSON.stringify(newBoutons));
  };

  const onClose = () => onOpenChange(false);

  if (!open) return null;

  const totalBadge = Object.values(compteurs).reduce((a, b) => a + b, 0);

  return (
    <>
      {/* Popup principale */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
        onClick={onClose}
      >
        <div
          className="bg-background rounded-t-3xl w-full max-w-lg p-5 pb-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛡️</span>
              <h2 className="text-xl font-bold text-foreground">Administration</h2>
              {totalBadge > 0 && (
                <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                  {totalBadge}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="bg-destructive text-destructive-foreground w-8 h-8 rounded-full flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Boutons réorganisables */}
          <div className="space-y-2 mb-4">
            {boutons.map((btn, index) => {
              const count = compteurs[btn.id] || 0;
              const hasAction = count > 0;
              return (
                <div
                  key={btn.id}
                  draggable={isDragging}
                  onDragOver={() => handleDragOver(index)}
                  onTouchStart={() => handlePressStart(index)}
                  onTouchEnd={() => handlePressEnd(index)}
                  onMouseDown={() => handlePressStart(index)}
                  onMouseUp={() => handlePressEnd(index)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-white cursor-pointer select-none transition-all active:scale-95 ${
                    hasAction ? 'bg-destructive' : 'bg-emerald-500'
                  }`}
                  style={{
                    boxShadow:
                      isDragging && dragIndex === index
                        ? '0 8px 24px rgba(0,0,0,0.2)'
                        : undefined,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 opacity-50" />
                    <span>
                      {btn.emoji} {btn.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasAction && (
                      <span className="bg-white text-destructive text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                        {count}
                      </span>
                    )}
                    <span className="text-white/70">→</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Boutons navigation */}
          <div className="space-y-2">
            <button
              onClick={() => {
                onClose();
                navigate('/admin');
              }}
              className="w-full py-3 rounded-xl font-semibold text-primary-foreground bg-primary"
            >
              Voir le tableau de bord complet →
            </button>
            <button
              onClick={() => setModalSection('monitoring')}
              className="w-full py-3 rounded-xl font-semibold border border-border text-foreground bg-background"
            >
              📊 Monitoring →
            </button>
            <button
              onClick={() => setModalSection('stats')}
              className="w-full py-3 rounded-xl font-semibold border border-border text-foreground bg-background"
            >
              📈 Statistiques globales →
            </button>
            <button
              onClick={() => setModalSection('notifications')}
              className="w-full py-3 rounded-xl font-semibold border border-border text-foreground bg-background"
            >
              🔔 Gestion des notifications →
            </button>
          </div>

          {isDragging && (
            <p className="text-center text-xs text-muted-foreground mt-3">
              🔀 Glisse pour réorganiser...
            </p>
          )}
        </div>
      </div>

      {/* Modale section à 80% */}
      {modalSection && (
        <div
          className="fixed inset-0 bg-black/60 z-[60] flex items-end justify-center"
          onClick={() => setModalSection(null)}
        >
          <div
            className="bg-background rounded-t-3xl w-full max-w-lg overflow-y-auto"
            style={{ height: '80vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-background border-b border-border px-4 py-3 flex items-center justify-between rounded-t-3xl z-10">
              <h3 className="font-bold text-lg text-foreground">
                {boutons.find((b) => b.section === modalSection)?.emoji}{' '}
                {boutons.find((b) => b.section === modalSection)?.label || modalSection}
              </h3>
              <button
                onClick={() => setModalSection(null)}
                className="bg-muted rounded-full w-8 h-8 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <AdminSectionRenderer
                section={modalSection}
                onClose={() => setModalSection(null)}
                onNavigate={(path) => {
                  setModalSection(null);
                  onClose();
                  navigate(path);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

function AdminSectionRenderer({
  section,
  onClose,
  onNavigate,
}: {
  section: string;
  onClose: () => void;
  onNavigate: (path: string) => void;
}) {
  switch (section) {
    case 'users':
      return <AdminRegistrationValidations onBack={onClose} />;
    case 'sourates-validations':
      return <AdminSourateValidations onBack={onClose} />;
    case 'nourania-validations':
      return <AdminNouraniaValidations onBack={onClose} />;
    case 'cahier-texte':
      return <AdminHomework onBack={onClose} />;
    case 'monitoring':
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">Accédez au monitoring complet</p>
          <button
            onClick={() => onNavigate('/monitoring')}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold"
          >
            Ouvrir le Monitoring →
          </button>
        </div>
      );
    case 'stats':
      return <AdminGlobalStats onBack={onClose} />;
    case 'notifications':
      return <AdminNotifications />;
    default:
      return (
        <p className="text-muted-foreground text-center py-8">
          Section en cours de développement
        </p>
      );
  }
}

export default AdminCommandModal;
