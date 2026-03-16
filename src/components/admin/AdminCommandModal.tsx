import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, GripVertical } from 'lucide-react';
import AdminRegistrationValidations from '@/components/admin/AdminRegistrationValidations';
import AdminSourateValidations from '@/components/admin/AdminSourateValidations';
import AdminNouraniaValidations from '@/components/admin/AdminNouraniaValidations';
import AdminHomework from '@/components/admin/AdminHomework';
import AdminGlobalStats from '@/components/admin/AdminGlobalStats';
import AdminNotifications from '@/components/admin/AdminNotifications';
import AdminStudents from '@/components/admin/AdminStudents';
import AdminAttendance from '@/components/admin/AdminAttendance';

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

const BOUTONS_ACTIONS = [
  { id: 'devoirs', label: 'Devoirs à corriger', section: 'cahier-texte', emoji: '📚' },
  { id: 'sourates', label: 'Sourates à valider', section: 'sourates-validations', emoji: '📖' },
  { id: 'nourania', label: 'Nourania à valider', section: 'nourania-validations', emoji: '🔤' },
  { id: 'inscriptions', label: 'Inscriptions', section: 'users', emoji: '📝' },
];

const BOUTONS_MODULES = [
  { id: 'eleves', label: 'Élèves', section: 'eleves', emoji: '👨‍🎓' },
  { id: 'registre', label: 'Registre', section: 'registre-presence', emoji: '📋' },
  { id: 'cahier', label: 'Cahier de texte', section: 'cahier-texte-module', emoji: '📓' },
  { id: 'dictionnaire', label: 'Dictionnaire', section: 'dictionnaire', emoji: '📘' },
];

const AdminCommandModal = ({
  open,
  onOpenChange,
  pendingRegistrations,
  pendingSourates,
  pendingNourania,
  pendingHomework,
}: AdminCommandModalProps) => {
  const navigate = useNavigate();
  const [boutons, setBoutons] = useState(BOUTONS_ACTIONS);
  const [modalSection, setModalSection] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

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
        if (Array.isArray(parsed) && parsed.length === BOUTONS_ACTIONS.length) {
          setBoutons(parsed);
        }
      } catch { /* ignore */ }
    }
  }, []);

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

  const allBoutons = [...BOUTONS_ACTIONS, ...BOUTONS_MODULES];

  return (
    <>
      {/* Popup principale — centrée */}
      <div
        className="fixed inset-0 bg-black/60 z-[400] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-background rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <span>🛡️</span>
              <h2 className="text-lg font-bold text-foreground">Administration</h2>
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

          <div className="px-4 pb-5 space-y-3">
            {/* Boutons actions — 1 par ligne */}
            {boutons.map((btn, index) => {
              const count = compteurs[btn.id] || 0;
              const hasAction = count > 0;
              return (
                <button
                  key={btn.id}
                  onClick={() => setModalSection(btn.section)}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => { e.preventDefault(); handleDragOver(index); }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-semibold text-white transition-all active:scale-95 ${
                    hasAction ? 'bg-destructive' : 'bg-emerald-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 opacity-40" />
                    <span className="text-sm">{btn.emoji} {btn.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasAction && (
                      <span className="bg-white text-destructive text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {count}
                      </span>
                    )}
                    <span className="opacity-70 text-sm">→</span>
                  </div>
                </button>
              );
            })}

            {/* Séparateur */}
            <div className="border-t border-border pt-1" />

            {/* Boutons modules — 2 par ligne */}
            <div className="grid grid-cols-2 gap-2">
              {BOUTONS_MODULES.map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setModalSection(btn.section)}
                  className="flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-2xl font-semibold text-white text-sm transition-all active:scale-95 bg-emerald-500"
                >
                  <span className="text-xl">{btn.emoji}</span>
                  <span className="text-xs">{btn.label}</span>
                </button>
              ))}
            </div>

            {/* Séparateur */}
            <div className="border-t border-border pt-1" />

            {/* Bouton tableau de bord */}
            <button
              onClick={() => { onClose(); navigate('/admin'); }}
              className="w-full py-3 rounded-2xl font-semibold text-primary-foreground text-sm bg-primary"
            >
              Voir le tableau de bord complet →
            </button>

            {/* Boutons navigation en grille */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setModalSection('monitoring')}
                className="py-2 rounded-xl border border-border text-muted-foreground text-xs font-semibold"
              >
                📊 Monitoring
              </button>
              <button
                onClick={() => setModalSection('stats')}
                className="py-2 rounded-xl border border-border text-muted-foreground text-xs font-semibold"
              >
                📈 Stats
              </button>
              <button
                onClick={() => setModalSection('notifications')}
                className="py-2 rounded-xl border border-border text-muted-foreground text-xs font-semibold"
              >
                🔔 Notifs
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modale section à 80% */}
      {modalSection && (
        <div
          className="fixed inset-0 bg-black/60 z-[500] flex items-end justify-center"
          onClick={() => setModalSection(null)}
        >
          <div
            className="bg-background rounded-t-3xl w-full max-w-lg"
            style={{ height: '80vh', overflowY: 'auto', overflowX: 'visible' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-background border-b border-border px-4 py-3 flex items-center justify-between rounded-t-3xl z-10">
              <h3 className="font-bold text-lg text-foreground">
                {allBoutons.find((b) => b.section === modalSection)?.emoji}{' '}
                {allBoutons.find((b) => b.section === modalSection)?.label || modalSection}
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
    case 'cahier-texte-module':
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
    case 'eleves':
      return <AdminStudents />;
    case 'registre-presence':
      return <AdminAttendance onBack={onClose} />;
    case 'dictionnaire':
      return (
        <p className="text-muted-foreground text-center py-8">
          Section en cours de développement
        </p>
      );
    default:
      return (
        <p className="text-muted-foreground text-center py-8">
          Section en cours de développement
        </p>
      );
  }
}

export default AdminCommandModal;
