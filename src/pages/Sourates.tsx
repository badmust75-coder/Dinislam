import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useConfetti } from '@/hooks/useConfetti';
import SourateUnlockDialog from '@/components/sourates/SourateUnlockDialog';
import SouratePathView from '@/components/sourates/SouratePathView';
import SourateDetailDialog from '@/components/sourates/SourateDetailDialog';
import { Search } from 'lucide-react';

// Complete list of 114 Surahs
const SOURATES_DATA = [
  { number: 1, name_arabic: 'الفاتحة', name_french: "Al-Fatiha (L'Ouverture)", verses_count: 7, revelation_type: 'Mecquoise' },
  { number: 2, name_arabic: 'البقرة', name_french: 'Al-Baqara (La Vache)', verses_count: 286, revelation_type: 'Médinoise' },
  { number: 3, name_arabic: 'آل عمران', name_french: "Al-Imran (La Famille d'Imran)", verses_count: 200, revelation_type: 'Médinoise' },
  { number: 4, name_arabic: 'النساء', name_french: 'An-Nisa (Les Femmes)', verses_count: 176, revelation_type: 'Médinoise' },
  { number: 5, name_arabic: 'المائدة', name_french: "Al-Ma'ida (La Table Servie)", verses_count: 120, revelation_type: 'Médinoise' },
  { number: 6, name_arabic: 'الأنعام', name_french: "Al-An'am (Les Bestiaux)", verses_count: 165, revelation_type: 'Mecquoise' },
  { number: 7, name_arabic: 'الأعراف', name_french: "Al-A'raf (Les Hauteurs)", verses_count: 206, revelation_type: 'Mecquoise' },
  { number: 8, name_arabic: 'الأنفال', name_french: 'Al-Anfal (Le Butin)', verses_count: 75, revelation_type: 'Médinoise' },
  { number: 9, name_arabic: 'التوبة', name_french: 'At-Tawba (Le Repentir)', verses_count: 129, revelation_type: 'Médinoise' },
  { number: 10, name_arabic: 'يونس', name_french: 'Yunus (Jonas)', verses_count: 109, revelation_type: 'Mecquoise' },
  { number: 11, name_arabic: 'هود', name_french: 'Hud (Houd)', verses_count: 123, revelation_type: 'Mecquoise' },
  { number: 12, name_arabic: 'يوسف', name_french: 'Yusuf (Joseph)', verses_count: 111, revelation_type: 'Mecquoise' },
  { number: 13, name_arabic: 'الرعد', name_french: "Ar-Ra'd (Le Tonnerre)", verses_count: 43, revelation_type: 'Médinoise' },
  { number: 14, name_arabic: 'إبراهيم', name_french: 'Ibrahim (Abraham)', verses_count: 52, revelation_type: 'Mecquoise' },
  { number: 15, name_arabic: 'الحجر', name_french: 'Al-Hijr', verses_count: 99, revelation_type: 'Mecquoise' },
  { number: 16, name_arabic: 'النحل', name_french: 'An-Nahl (Les Abeilles)', verses_count: 128, revelation_type: 'Mecquoise' },
  { number: 17, name_arabic: 'الإسراء', name_french: 'Al-Isra (Le Voyage Nocturne)', verses_count: 111, revelation_type: 'Mecquoise' },
  { number: 18, name_arabic: 'الكهف', name_french: 'Al-Kahf (La Caverne)', verses_count: 110, revelation_type: 'Mecquoise' },
  { number: 19, name_arabic: 'مريم', name_french: 'Maryam (Marie)', verses_count: 98, revelation_type: 'Mecquoise' },
  { number: 20, name_arabic: 'طه', name_french: 'Ta-Ha', verses_count: 135, revelation_type: 'Mecquoise' },
  { number: 21, name_arabic: 'الأنبياء', name_french: 'Al-Anbiya (Les Prophètes)', verses_count: 112, revelation_type: 'Mecquoise' },
  { number: 22, name_arabic: 'الحج', name_french: 'Al-Hajj (Le Pèlerinage)', verses_count: 78, revelation_type: 'Médinoise' },
  { number: 23, name_arabic: 'المؤمنون', name_french: "Al-Mu'minun (Les Croyants)", verses_count: 118, revelation_type: 'Mecquoise' },
  { number: 24, name_arabic: 'النور', name_french: 'An-Nur (La Lumière)', verses_count: 64, revelation_type: 'Médinoise' },
  { number: 25, name_arabic: 'الفرقان', name_french: 'Al-Furqan (Le Discernement)', verses_count: 77, revelation_type: 'Mecquoise' },
  { number: 26, name_arabic: 'الشعراء', name_french: "Ash-Shu'ara (Les Poètes)", verses_count: 227, revelation_type: 'Mecquoise' },
  { number: 27, name_arabic: 'النمل', name_french: 'An-Naml (Les Fourmis)', verses_count: 93, revelation_type: 'Mecquoise' },
  { number: 28, name_arabic: 'القصص', name_french: 'Al-Qasas (Le Récit)', verses_count: 88, revelation_type: 'Mecquoise' },
  { number: 29, name_arabic: 'العنكبوت', name_french: "Al-Ankabut (L'Araignée)", verses_count: 69, revelation_type: 'Mecquoise' },
  { number: 30, name_arabic: 'الروم', name_french: 'Ar-Rum (Les Romains)', verses_count: 60, revelation_type: 'Mecquoise' },
  { number: 31, name_arabic: 'لقمان', name_french: 'Luqman', verses_count: 34, revelation_type: 'Mecquoise' },
  { number: 32, name_arabic: 'السجدة', name_french: 'As-Sajda (La Prosternation)', verses_count: 30, revelation_type: 'Mecquoise' },
  { number: 33, name_arabic: 'الأحزاب', name_french: 'Al-Ahzab (Les Coalisés)', verses_count: 73, revelation_type: 'Médinoise' },
  { number: 34, name_arabic: 'سبأ', name_french: 'Saba', verses_count: 54, revelation_type: 'Mecquoise' },
  { number: 35, name_arabic: 'فاطر', name_french: 'Fatir (Le Créateur)', verses_count: 45, revelation_type: 'Mecquoise' },
  { number: 36, name_arabic: 'يس', name_french: 'Ya-Sin', verses_count: 83, revelation_type: 'Mecquoise' },
  { number: 37, name_arabic: 'الصافات', name_french: 'As-Saffat (Les Rangées)', verses_count: 182, revelation_type: 'Mecquoise' },
  { number: 38, name_arabic: 'ص', name_french: 'Sad', verses_count: 88, revelation_type: 'Mecquoise' },
  { number: 39, name_arabic: 'الزمر', name_french: 'Az-Zumar (Les Groupes)', verses_count: 75, revelation_type: 'Mecquoise' },
  { number: 40, name_arabic: 'غافر', name_french: 'Ghafir (Le Pardonneur)', verses_count: 85, revelation_type: 'Mecquoise' },
  { number: 41, name_arabic: 'فصلت', name_french: 'Fussilat (Les Versets Détaillés)', verses_count: 54, revelation_type: 'Mecquoise' },
  { number: 42, name_arabic: 'الشورى', name_french: 'Ash-Shura (La Consultation)', verses_count: 53, revelation_type: 'Mecquoise' },
  { number: 43, name_arabic: 'الزخرف', name_french: "Az-Zukhruf (L'Ornement)", verses_count: 89, revelation_type: 'Mecquoise' },
  { number: 44, name_arabic: 'الدخان', name_french: 'Ad-Dukhan (La Fumée)', verses_count: 59, revelation_type: 'Mecquoise' },
  { number: 45, name_arabic: 'الجاثية', name_french: "Al-Jathiya (L'Agenouillée)", verses_count: 37, revelation_type: 'Mecquoise' },
  { number: 46, name_arabic: 'الأحقاف', name_french: 'Al-Ahqaf (Les Dunes)', verses_count: 35, revelation_type: 'Mecquoise' },
  { number: 47, name_arabic: 'محمد', name_french: 'Muhammad', verses_count: 38, revelation_type: 'Médinoise' },
  { number: 48, name_arabic: 'الفتح', name_french: 'Al-Fath (La Victoire)', verses_count: 29, revelation_type: 'Médinoise' },
  { number: 49, name_arabic: 'الحجرات', name_french: 'Al-Hujurat (Les Appartements)', verses_count: 18, revelation_type: 'Médinoise' },
  { number: 50, name_arabic: 'ق', name_french: 'Qaf', verses_count: 45, revelation_type: 'Mecquoise' },
  { number: 51, name_arabic: 'الذاريات', name_french: 'Adh-Dhariyat (Les Vents)', verses_count: 60, revelation_type: 'Mecquoise' },
  { number: 52, name_arabic: 'الطور', name_french: 'At-Tur (Le Mont)', verses_count: 49, revelation_type: 'Mecquoise' },
  { number: 53, name_arabic: 'النجم', name_french: "An-Najm (L'Étoile)", verses_count: 62, revelation_type: 'Mecquoise' },
  { number: 54, name_arabic: 'القمر', name_french: 'Al-Qamar (La Lune)', verses_count: 55, revelation_type: 'Mecquoise' },
  { number: 55, name_arabic: 'الرحمن', name_french: 'Ar-Rahman (Le Miséricordieux)', verses_count: 78, revelation_type: 'Médinoise' },
  { number: 56, name_arabic: 'الواقعة', name_french: "Al-Waqi'a (L'Événement)", verses_count: 96, revelation_type: 'Mecquoise' },
  { number: 57, name_arabic: 'الحديد', name_french: 'Al-Hadid (Le Fer)', verses_count: 29, revelation_type: 'Médinoise' },
  { number: 58, name_arabic: 'المجادلة', name_french: 'Al-Mujadila (La Discussion)', verses_count: 22, revelation_type: 'Médinoise' },
  { number: 59, name_arabic: 'الحشر', name_french: "Al-Hashr (L'Exode)", verses_count: 24, revelation_type: 'Médinoise' },
  { number: 60, name_arabic: 'الممتحنة', name_french: "Al-Mumtahina (L'Éprouvée)", verses_count: 13, revelation_type: 'Médinoise' },
  { number: 61, name_arabic: 'الصف', name_french: 'As-Saff (Le Rang)', verses_count: 14, revelation_type: 'Médinoise' },
  { number: 62, name_arabic: 'الجمعة', name_french: "Al-Jumu'a (Le Vendredi)", verses_count: 11, revelation_type: 'Médinoise' },
  { number: 63, name_arabic: 'المنافقون', name_french: 'Al-Munafiqun (Les Hypocrites)', verses_count: 11, revelation_type: 'Médinoise' },
  { number: 64, name_arabic: 'التغابن', name_french: 'At-Taghabun (La Grande Perte)', verses_count: 18, revelation_type: 'Médinoise' },
  { number: 65, name_arabic: 'الطلاق', name_french: 'At-Talaq (Le Divorce)', verses_count: 12, revelation_type: 'Médinoise' },
  { number: 66, name_arabic: 'التحريم', name_french: "At-Tahrim (L'Interdiction)", verses_count: 12, revelation_type: 'Médinoise' },
  { number: 67, name_arabic: 'الملك', name_french: 'Al-Mulk (La Royauté)', verses_count: 30, revelation_type: 'Mecquoise' },
  { number: 68, name_arabic: 'القلم', name_french: 'Al-Qalam (La Plume)', verses_count: 52, revelation_type: 'Mecquoise' },
  { number: 69, name_arabic: 'الحاقة', name_french: 'Al-Haqqa (Celle Qui Montre)', verses_count: 52, revelation_type: 'Mecquoise' },
  { number: 70, name_arabic: 'المعارج', name_french: "Al-Ma'arij (Les Voies d'Ascension)", verses_count: 44, revelation_type: 'Mecquoise' },
  { number: 71, name_arabic: 'نوح', name_french: 'Nuh (Noé)', verses_count: 28, revelation_type: 'Mecquoise' },
  { number: 72, name_arabic: 'الجن', name_french: 'Al-Jinn (Les Djinns)', verses_count: 28, revelation_type: 'Mecquoise' },
  { number: 73, name_arabic: 'المزمل', name_french: "Al-Muzzammil (L'Enveloppé)", verses_count: 20, revelation_type: 'Mecquoise' },
  { number: 74, name_arabic: 'المدثر', name_french: 'Al-Muddathir (Le Revêtu)', verses_count: 56, revelation_type: 'Mecquoise' },
  { number: 75, name_arabic: 'القيامة', name_french: 'Al-Qiyama (La Résurrection)', verses_count: 40, revelation_type: 'Mecquoise' },
  { number: 76, name_arabic: 'الإنسان', name_french: "Al-Insan (L'Homme)", verses_count: 31, revelation_type: 'Médinoise' },
  { number: 77, name_arabic: 'المرسلات', name_french: 'Al-Mursalat (Les Envoyés)', verses_count: 50, revelation_type: 'Mecquoise' },
  { number: 78, name_arabic: 'النبأ', name_french: 'An-Naba (La Nouvelle)', verses_count: 40, revelation_type: 'Mecquoise' },
  { number: 79, name_arabic: 'النازعات', name_french: "An-Nazi'at (Les Anges)", verses_count: 46, revelation_type: 'Mecquoise' },
  { number: 80, name_arabic: 'عبس', name_french: "Abasa (Il S'est Renfrogné)", verses_count: 42, revelation_type: 'Mecquoise' },
  { number: 81, name_arabic: 'التكوير', name_french: "At-Takwir (L'Obscurcissement)", verses_count: 29, revelation_type: 'Mecquoise' },
  { number: 82, name_arabic: 'الانفطار', name_french: 'Al-Infitar (La Rupture)', verses_count: 19, revelation_type: 'Mecquoise' },
  { number: 83, name_arabic: 'المطففين', name_french: 'Al-Mutaffifin (Les Fraudeurs)', verses_count: 36, revelation_type: 'Mecquoise' },
  { number: 84, name_arabic: 'الانشقاق', name_french: 'Al-Inshiqaq (La Déchirure)', verses_count: 25, revelation_type: 'Mecquoise' },
  { number: 85, name_arabic: 'البروج', name_french: 'Al-Buruj (Les Constellations)', verses_count: 22, revelation_type: 'Mecquoise' },
  { number: 86, name_arabic: 'الطارق', name_french: "At-Tariq (L'Astre)", verses_count: 17, revelation_type: 'Mecquoise' },
  { number: 87, name_arabic: 'الأعلى', name_french: "Al-A'la (Le Très-Haut)", verses_count: 19, revelation_type: 'Mecquoise' },
  { number: 88, name_arabic: 'الغاشية', name_french: "Al-Ghashiya (L'Enveloppante)", verses_count: 26, revelation_type: 'Mecquoise' },
  { number: 89, name_arabic: 'الفجر', name_french: "Al-Fajr (L'Aube)", verses_count: 30, revelation_type: 'Mecquoise' },
  { number: 90, name_arabic: 'البلد', name_french: 'Al-Balad (La Cité)', verses_count: 20, revelation_type: 'Mecquoise' },
  { number: 91, name_arabic: 'الشمس', name_french: 'Ash-Shams (Le Soleil)', verses_count: 15, revelation_type: 'Mecquoise' },
  { number: 92, name_arabic: 'الليل', name_french: 'Al-Layl (La Nuit)', verses_count: 21, revelation_type: 'Mecquoise' },
  { number: 93, name_arabic: 'الضحى', name_french: 'Ad-Duha (Le Jour Montant)', verses_count: 11, revelation_type: 'Mecquoise' },
  { number: 94, name_arabic: 'الشرح', name_french: "Ash-Sharh (L'Ouverture)", verses_count: 8, revelation_type: 'Mecquoise' },
  { number: 95, name_arabic: 'التين', name_french: 'At-Tin (Le Figuier)', verses_count: 8, revelation_type: 'Mecquoise' },
  { number: 96, name_arabic: 'العلق', name_french: "Al-Alaq (L'Adhérence)", verses_count: 19, revelation_type: 'Mecquoise' },
  { number: 97, name_arabic: 'القدر', name_french: 'Al-Qadr (La Destinée)', verses_count: 5, revelation_type: 'Mecquoise' },
  { number: 98, name_arabic: 'البينة', name_french: 'Al-Bayyina (La Preuve)', verses_count: 8, revelation_type: 'Médinoise' },
  { number: 99, name_arabic: 'الزلزلة', name_french: 'Az-Zalzala (Le Séisme)', verses_count: 8, revelation_type: 'Médinoise' },
  { number: 100, name_arabic: 'العاديات', name_french: 'Al-Adiyat (Les Coursiers)', verses_count: 11, revelation_type: 'Mecquoise' },
  { number: 101, name_arabic: 'القارعة', name_french: "Al-Qari'a (Le Fracas)", verses_count: 11, revelation_type: 'Mecquoise' },
  { number: 102, name_arabic: 'التكاثر', name_french: 'At-Takathur (La Course)', verses_count: 8, revelation_type: 'Mecquoise' },
  { number: 103, name_arabic: 'العصر', name_french: "Al-Asr (Le Temps)", verses_count: 3, revelation_type: 'Mecquoise' },
  { number: 104, name_arabic: 'الهمزة', name_french: 'Al-Humaza (Le Calomniateur)', verses_count: 9, revelation_type: 'Mecquoise' },
  { number: 105, name_arabic: 'الفيل', name_french: "Al-Fil (L'Éléphant)", verses_count: 5, revelation_type: 'Mecquoise' },
  { number: 106, name_arabic: 'قريش', name_french: 'Quraysh', verses_count: 4, revelation_type: 'Mecquoise' },
  { number: 107, name_arabic: 'الماعون', name_french: "Al-Ma'un (L'Ustensile)", verses_count: 7, revelation_type: 'Mecquoise' },
  { number: 108, name_arabic: 'الكوثر', name_french: "Al-Kawthar (L'Abondance)", verses_count: 3, revelation_type: 'Mecquoise' },
  { number: 109, name_arabic: 'الكافرون', name_french: 'Al-Kafirun (Les Infidèles)', verses_count: 6, revelation_type: 'Mecquoise' },
  { number: 110, name_arabic: 'النصر', name_french: 'An-Nasr (Le Secours)', verses_count: 3, revelation_type: 'Médinoise' },
  { number: 111, name_arabic: 'المسد', name_french: 'Al-Masad (Les Fibres)', verses_count: 5, revelation_type: 'Mecquoise' },
  { number: 112, name_arabic: 'الإخلاص', name_french: 'Al-Ikhlas (Le Monothéisme)', verses_count: 4, revelation_type: 'Mecquoise' },
  { number: 113, name_arabic: 'الفلق', name_french: "Al-Falaq (L'Aube Naissante)", verses_count: 5, revelation_type: 'Mecquoise' },
  { number: 114, name_arabic: 'الناس', name_french: 'An-Nas (Les Hommes)', verses_count: 6, revelation_type: 'Mecquoise' },
];

// Display order: 114 first, then 113, ..., 1 last
const SOURATES_ORDERED = [...SOURATES_DATA].sort((a, b) => b.number - a.number);

const SouratesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { fireSuccess } = useConfetti();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSourate, setSelectedSourate] = useState<typeof SOURATES_DATA[0] | null>(null);
  const [sourateProgress, setSourateProgress] = useState<Map<number, { is_validated: boolean; is_memorized: boolean; progress_percentage: number }>>(new Map());
  const [verseProgress, setVerseProgress] = useState<Map<string, boolean>>(new Map());
  const [adminUnlocks, setAdminUnlocks] = useState<Set<number>>(new Set());
  const [sourateContents, setSourateContents] = useState<any[]>([]);
  const [unlockDialog, setUnlockDialog] = useState<{ open: boolean; sourateName: string; sourateNumber: number }>({ open: false, sourateName: '', sourateNumber: 0 });
  const [dbSourates, setDbSourates] = useState<Map<number, number>>(new Map());

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const [
        { data: progressData },
        { data: verseData },
        { data: unlockData },
        { data: contentData },
        { data: souratesDb },
      ] = await Promise.all([
        supabase.from('user_sourate_progress').select('*').eq('user_id', user.id),
        supabase.from('user_sourate_verse_progress').select('*').eq('user_id', user.id),
        supabase.from('sourate_admin_unlocks').select('*').eq('user_id', user.id),
        supabase.from('sourate_content').select('*').order('display_order'),
        supabase.from('sourates').select('id, number'),
      ]);

      const idMap = new Map<number, number>();
      souratesDb?.forEach(s => idMap.set(s.number, s.id));
      setDbSourates(idMap);

      const pMap = new Map<number, { is_validated: boolean; is_memorized: boolean; progress_percentage: number }>();
      progressData?.forEach(p => {
        pMap.set(p.sourate_id, {
          is_validated: p.is_validated,
          is_memorized: p.is_memorized,
          progress_percentage: p.progress_percentage,
        });
      });
      setSourateProgress(pMap);

      const vMap = new Map<string, boolean>();
      verseData?.forEach(v => {
        vMap.set(`${v.sourate_id}-${v.verse_number}`, v.is_validated);
      });
      setVerseProgress(vMap);

      const uSet = new Set<number>();
      unlockData?.forEach(u => uSet.add(u.sourate_id));
      setAdminUnlocks(uSet);

      setSourateContents(contentData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadAll();
  }, [user, loadAll]);

  // Listen for admin validation approvals in realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('user-validation-approvals')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sourate_validation_requests',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const newRecord = payload.new as any;
        if (newRecord.status === 'approved') {
          const approvedSourateId = newRecord.sourate_id;
          // Mark sourate as validated
          setSourateProgress(prev => {
            const newMap = new Map(prev);
            const existing = newMap.get(approvedSourateId) || { is_validated: false, is_memorized: false, progress_percentage: 0 };
            newMap.set(approvedSourateId, { ...existing, is_validated: true, progress_percentage: 100 });
            return newMap;
          });
          // Find the sourate number from dbSourates
          let validatedNumber: number | null = null;
          for (const [num, id] of dbSourates.entries()) {
            if (id === approvedSourateId) { validatedNumber = num; break; }
          }
          if (validatedNumber) {
            fireSuccess();
            const nextNumber = validatedNumber - 1;
            if (nextNumber >= 1) {
              const nextSourate = SOURATES_DATA.find(s => s.number === nextNumber);
              if (nextSourate) {
                setTimeout(() => {
                  setUnlockDialog({
                    open: true,
                    sourateName: nextSourate.name_french,
                    sourateNumber: nextNumber,
                  });
                }, 1500);
              }
            }
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, dbSourates, fireSuccess]);

  const isSourateAccessible = (sourateNumber: number): boolean => {
    const dbId = dbSourates.get(sourateNumber);
    if (!dbId) return sourateNumber === 114;
    if (sourateNumber === 114) return true;
    if (adminUnlocks.has(dbId)) return true;
    const prevNumber = sourateNumber + 1;
    const prevDbId = dbSourates.get(prevNumber);
    if (!prevDbId) return true;
    const prevProgress = sourateProgress.get(prevDbId);
    return prevProgress?.is_validated === true;
  };

  const handleVerseToggle = async (sourateDbId: number, verseNumber: number, sourateNumber: number, versesCount: number) => {
    if (!user) return;

    const key = `${sourateDbId}-${verseNumber}`;
    const currentValue = verseProgress.get(key) || false;
    const newValue = !currentValue;

    setVerseProgress(prev => {
      const newMap = new Map(prev);
      newMap.set(key, newValue);
      return newMap;
    });

    try {
      const { error } = await supabase
        .from('user_sourate_verse_progress')
        .upsert({
          user_id: user.id,
          sourate_id: sourateDbId,
          verse_number: verseNumber,
          is_validated: newValue,
        }, { onConflict: 'user_id,sourate_id,verse_number' });

      if (error) throw error;

      const newVerseProgress = new Map(verseProgress);
      newVerseProgress.set(key, newValue);

      let validatedVerses = 0;
      for (let i = 1; i <= versesCount; i++) {
        if (newVerseProgress.get(`${sourateDbId}-${i}`)) validatedVerses++;
      }
      const percentage = Math.round((validatedVerses / versesCount) * 100);
      const allValidated = validatedVerses === versesCount;

      // Update progress percentage (but NOT is_validated - admin must approve)
      await supabase
        .from('user_sourate_progress')
        .upsert({
          user_id: user.id,
          sourate_id: sourateDbId,
          progress_percentage: percentage,
        }, { onConflict: 'user_id,sourate_id' });

      setSourateProgress(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(sourateDbId) || { is_validated: false, is_memorized: false, progress_percentage: 0 };
        newMap.set(sourateDbId, { ...existing, progress_percentage: percentage });
        return newMap;
      });

      if (allValidated && !sourateProgress.get(sourateDbId)?.is_validated) {
        // Close dialog and return to path view
        setSelectedSourate(null);
        
        // Create a pending validation request for admin (ignore if already pending)
        await supabase
          .from('sourate_validation_requests')
          .insert({
            user_id: user.id,
            sourate_id: sourateDbId,
            status: 'pending',
          });

        toast({
          title: 'بارك الله فيك',
          description: 'Tous les versets sont cochés ! En attente de validation par l\'enseignant.',
        });
      }
    } catch (error) {
      console.error('Error updating verse:', error);
      setVerseProgress(prev => {
        const newMap = new Map(prev);
        newMap.set(key, currentValue);
        return newMap;
      });
    }
  };

  const handleSourateClick = (sourate: typeof SOURATES_DATA[0]) => {
    if (!isSourateAccessible(sourate.number)) {
      toast({
        title: "Sourate verrouillée",
        description: "Complétez d'abord la sourate précédente",
        variant: "destructive",
      });
      return;
    }
    setSelectedSourate(sourate);
  };

  const filteredSourates = searchQuery
    ? SOURATES_ORDERED.filter(s =>
        s.name_arabic.includes(searchQuery) ||
        s.name_french.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.number.toString().includes(searchQuery)
      )
    : SOURATES_ORDERED;

  const validatedCount = Array.from(sourateProgress.values()).filter(p => p.is_validated).length;
  const overallProgress = Math.round((validatedCount / 114) * 100);

  return (
    <AppLayout title="Sourates">
      <div className="p-4 space-y-4">
        {/* Progress Overview */}
        <div className="bg-card rounded-2xl p-4 shadow-card border border-border">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-foreground">Ma progression</h3>
              <p className="text-sm text-muted-foreground">
                {validatedCount} / 114 sourates validées
              </p>
            </div>
            <div className="text-3xl font-bold text-gold">{overallProgress}%</div>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une sourate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Serpentine Path */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-2xl" />
            ))}
          </div>
        ) : (
          <SouratePathView
            sourates={filteredSourates}
            dbSourates={dbSourates}
            sourateProgress={sourateProgress}
            isSourateAccessible={isSourateAccessible}
            onSourateClick={handleSourateClick}
          />
        )}
      </div>

      {/* Sourate Detail Modal */}
      {selectedSourate && (
        <SourateDetailDialog
          open={!!selectedSourate}
          onOpenChange={(open) => !open && setSelectedSourate(null)}
          sourate={selectedSourate}
          dbId={dbSourates.get(selectedSourate.number)}
          verseProgress={verseProgress}
          sourateProgress={dbSourates.get(selectedSourate.number) ? sourateProgress.get(dbSourates.get(selectedSourate.number)!) : undefined}
          contents={dbSourates.get(selectedSourate.number) ? sourateContents.filter(c => c.sourate_id === dbSourates.get(selectedSourate.number)) : []}
          onVerseToggle={handleVerseToggle}
        />
      )}

      <SourateUnlockDialog
        open={unlockDialog.open}
        onOpenChange={(open) => setUnlockDialog(prev => ({ ...prev, open }))}
        onConfirm={() => {
          setUnlockDialog(prev => ({ ...prev, open: false }));
          const nextSourate = SOURATES_DATA.find(s => s.number === unlockDialog.sourateNumber);
          if (nextSourate) setSelectedSourate(nextSourate);
        }}
        sourateName={unlockDialog.sourateName}
      />
    </AppLayout>
  );
};

export default SouratesPage;
