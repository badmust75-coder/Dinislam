import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const COMMENTAIRE_DEFAULT = "📌 Tu t'es arrêté à :\n✅ Ligne : \n✅ Page : ";

interface Props {
  leconId: string;
}

const AdminCommentaireLecon = ({ leconId }: Props) => {
  const [eleves, setEleves] = useState<any[]>([]);
  const [eleveSelectionne, setEleveSelectionne] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [commentairesExistants, setCommentairesExistants] = useState<any[]>([]);

  useEffect(() => {
    chargerEleves();
    chargerCommentaires();
  }, [leconId]);

  const chargerEleves = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .eq('is_approved', true);

    setEleves((profiles || []).map(p => ({ id: p.user_id, full_name: p.full_name })));
  };

  const chargerCommentaires = async () => {
    const { data } = await (supabase as any)
      .from('nourania_commentaires_eleves')
      .select('*')
      .eq('lecon_id', leconId);

    // Fetch profile names for existing comments
    const comments = data || [];
    if (comments.length > 0) {
      const ids = comments.map((c: any) => c.student_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', ids);

      const nameMap: Record<string, string> = {};
      (profiles || []).forEach(p => { nameMap[p.user_id] = p.full_name || ''; });

      setCommentairesExistants(comments.map((c: any) => ({
        ...c,
        full_name: nameMap[c.student_id] || 'Élève inconnu',
      })));
    } else {
      setCommentairesExistants([]);
    }
  };

  const handleSelectEleve = (studentId: string) => {
    setEleveSelectionne(studentId);
    const existant = commentairesExistants.find((c: any) => c.student_id === studentId);
    setCommentaire(existant?.commentaire || COMMENTAIRE_DEFAULT);
  };

  const handleValider = async () => {
    if (!eleveSelectionne) {
      toast.error('Sélectionne un élève');
      return;
    }

    const { error } = await (supabase as any)
      .from('nourania_commentaires_eleves')
      .upsert({
        lecon_id: leconId,
        student_id: eleveSelectionne,
        commentaire,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'lecon_id,student_id' });

    if (error) {
      toast.error('Erreur: ' + error.message);
      return;
    }

    // Notify student via push
    sendPushNotification({
      userIds: [eleveSelectionne],
      title: '📝 Note de l\'enseignante',
      body: 'Votre enseignante a mis à jour votre progression Nourania',
      data: { url: '/nourania' },
    });

    toast.success('✅ Commentaire envoyé à l\'élève !');
    chargerCommentaires();
  };

  return (
    <div className="bg-amber-50 rounded-xl p-3 mb-3 border border-amber-200">
      <p className="text-sm font-semibold text-amber-800 mb-2">
        💬 Commentaire individuel
      </p>

      <select
        value={eleveSelectionne}
        onChange={e => handleSelectEleve(e.target.value)}
        className="w-full border rounded-xl p-2 text-sm mb-3 bg-white"
      >
        <option value="">Sélectionner un élève...</option>
        {eleves.map(e => {
          const aCommentaire = commentairesExistants.some((c: any) => c.student_id === e.id);
          return (
            <option key={e.id} value={e.id}>
              {aCommentaire ? '✅ ' : '○ '}{e.full_name}
            </option>
          );
        })}
      </select>

      {eleveSelectionne && (
        <>
          <textarea
            value={commentaire}
            onChange={e => setCommentaire(e.target.value)}
            className="w-full border rounded-xl p-3 text-sm mb-2 bg-white"
            rows={4}
            placeholder={COMMENTAIRE_DEFAULT}
          />
          <button
            onClick={handleValider}
            className="w-full py-2 rounded-xl text-white font-bold text-sm"
            style={{ backgroundColor: '#22c55e' }}
          >
            ✅ Valider et envoyer à l'élève
          </button>
        </>
      )}

      {commentairesExistants.length > 0 && (
        <div className="mt-3 border-t border-amber-200 pt-2">
          <p className="text-xs font-semibold text-amber-700 mb-1">
            Commentaires enregistrés :
          </p>
          {commentairesExistants.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between py-1 text-xs">
              <span className="text-amber-800 font-semibold">
                ✅ {c.full_name}
              </span>
              <button
                onClick={() => handleSelectEleve(c.student_id)}
                className="text-blue-500 underline text-xs"
              >
                Modifier
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCommentaireLecon;
