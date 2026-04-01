import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, BookOpen, FileText, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuranVerses } from '@/hooks/useQuranVerses';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function LecteurVerset({ audioUrl }: { audioUrl: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [vitesse, setVitesse] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duree, setDuree] = useState(0);
  const [temps, setTemps] = useState(0);
  const [erreur, setErreur] = useState(false);
  const [charge, setCharge] = useState(false);
  const VITESSES = [0.5, 1, 1.5, 2];

  const formatTemps = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setErreur(false);
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      if (audio.readyState < 2) {
        setCharge(true);
        audio.load();
        await new Promise((resolve, reject) => {
          audio.oncanplay = resolve;
          audio.onerror = reject;
          setTimeout(reject, 10000);
        });
        setCharge(false);
      }
      audio.playbackRate = vitesse;
      await audio.play();
      setPlaying(true);
    } catch (e) {
      console.error('Audio error:', e);
      setCharge(false);
      setErreur(true);
      setPlaying(false);
    }
  };

  const changerVitesse = (v: number) => {
    if (audioRef.current) audioRef.current.playbackRate = v;
    setVitesse(v);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duree) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * duree;
  };

  if (!audioUrl) return null;

  return (
    <div className="rounded-xl p-3 mt-2"
      style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a' }}>
      <audio
        ref={audioRef}
        preload="none"
        onTimeUpdate={() => {
          const a = audioRef.current;
          if (!a) return;
          setTemps(a.currentTime);
          setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuree(audioRef.current.duration);
        }}
        onEnded={() => setPlaying(false)}
        onError={() => { setErreur(true); setPlaying(false); setCharge(false); }}
      >
        <source src={audioUrl} />
      </audio>
      {erreur && (
        <p className="text-red-500 text-xs mb-2">
          ⚠️ Impossible de charger l'audio
        </p>
      )}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={togglePlay}
          disabled={charge}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-sm active:scale-95"
          style={{ backgroundColor: charge ? '#9ca3af' : '#f59e0b' }}
        >
          {charge ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : playing ? (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="white">
              <rect x="5" y="3" width="4" height="18" rx="1"/>
              <rect x="15" y="3" width="4" height="18" rx="1"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="white">
              <polygon points="6,3 20,12 6,21"/>
            </svg>
          )}
        </button>
        <div className="flex-1">
          <div
            className="w-full h-2 rounded-full cursor-pointer mb-1"
            style={{ backgroundColor: '#e5e7eb' }}
            onClick={handleProgressClick}
          >
            <div className="h-2 rounded-full"
              style={{ width: `${progress}%`, backgroundColor: '#f59e0b' }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>{formatTemps(temps)}</span>
            <span>{formatTemps(duree)}</span>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-1">
        {VITESSES.map(v => (
          <button key={v} onClick={() => changerVitesse(v)}
            className="px-2.5 py-1 rounded-lg text-xs font-bold active:scale-95"
            style={{
              backgroundColor: vitesse === v ? '#f59e0b' : '#ffffff',
              color: vitesse === v ? '#ffffff' : '#9ca3af',
              border: `1px solid ${vitesse === v ? '#f59e0b' : '#e5e7eb'}`
            }}>
            ×{v}
          </button>
        ))}
      </div>
    </div>
  );
}

function LecteurVideoSourate({ videoUrl }: { videoUrl: string }) {
  const [playing, setPlaying] = useState(false);
  const [src, setSrc] = useState('');

  const buildUrl = (url: string, autoplay: boolean) => {
    const base = url.split('?')[0];
    return `${base}?` + new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      rel: '0',
      modestbranding: '1',
      playsinline: '1',
      iv_load_policy: '3',
      disablekb: '0',
      fs: '1',
    }).toString();
  };

  useEffect(() => {
    setSrc(buildUrl(videoUrl, false));
    setPlaying(false);
  }, [videoUrl]);

  const togglePlay = () => {
    const newPlaying = !playing;
    setPlaying(newPlaying);
    setSrc(buildUrl(videoUrl, newPlaying));
  };

  if (!videoUrl) return null;

  return (
    <div>
      <p className="text-sm font-semibold text-foreground mb-2">
        🎬 Vidéo de la sourate
      </p>
      <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
        <iframe
          src={src}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          frameBorder="0"
          sandbox="allow-scripts allow-same-origin allow-presentation"
        />
        <div className="absolute top-0 left-0 right-0" style={{ height: '55px' }} />
        {!playing && (
          <div
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
              style={{ backgroundColor: '#f59e0b' }}>
              <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
                <polygon points="6,3 20,12 6,21"/>
              </svg>
            </div>
          </div>
        )}
        {playing && (
          <button
            onClick={togglePlay}
            className="absolute top-2 right-2 w-10 h-10 rounded-full flex items-center justify-center shadow"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
              <rect x="5" y="3" width="4" height="18" rx="1"/>
              <rect x="15" y="3" width="4" height="18" rx="1"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

interface SourateDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourate: {
    number: number;
    name_arabic: string;
    name_french: string;
    verses_count: number;
    revelation_type: string;
  };
  dbId: string | undefined;
  verseProgress: Map<string, boolean>;
  sourateProgress: { is_validated: boolean; is_memorized: boolean; progress_percentage: number } | undefined;
  contents: any[];
  onVerseToggle: (dbId: string, verseNum: number, sourateNumber: number, versesCount: number) => void;
}

const SourateDetailDialog = ({
  open,
  onOpenChange,
  sourate,
  dbId,
  verseProgress,
  sourateProgress,
  contents,
  onVerseToggle,
}: SourateDetailDialogProps) => {
  const { verses, loading: versesLoading } = useQuranVerses(open ? sourate.number : null);
  const [versetsAudio, setVersetsAudio] = useState<any[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  useEffect(() => {
    if (open && dbId) {
      supabase
        .from('sourate_versets_audio' as any)
        .select('*')
        .eq('sourate_id', dbId)
        .order('verset_number', { ascending: true })
        .then(({ data }) => setVersetsAudio(data || []));

      supabase
        .from('sourates')
        .select('video_url' as any)
        .eq('id', dbId)
        .maybeSingle()
        .then(({ data }) => {
          setVideoUrl((data as any)?.video_url || null);
        });
    }
  }, [open, dbId]);

  if (!dbId) return null;

  let validatedVerses = 0;
  for (let i = 1; i <= sourate.verses_count; i++) {
    if (verseProgress.get(`${dbId}-${i}`)) validatedVerses++;
  }
  const versePercentage = Math.round((validatedVerses / sourate.verses_count) * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0',
              sourateProgress?.is_validated
                ? 'bg-green-500 text-white'
                : 'bg-gradient-to-br from-primary to-royal-dark text-primary-foreground'
            )}>
              {sourateProgress?.is_validated ? <Check className="h-5 w-5" /> : sourate.number === 1000 ? '📖' : sourate.number}
            </div>
            <div>
              <p className="font-arabic text-lg">{sourate.name_arabic}</p>
              <p className="text-sm text-muted-foreground font-normal">{sourate.name_french}</p>
              <p className="text-xs text-muted-foreground/70 font-normal">
                {sourate.verses_count} versets • {sourate.revelation_type} • {validatedVerses}/{sourate.verses_count} validés
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progression</span>
              <span className="font-medium text-primary">{versePercentage}%</span>
            </div>
            <Progress value={versePercentage} className="h-2" />
          </div>

          {/* Vidéo YouTube */}
          {videoUrl && (
            <LecteurVideoSourate videoUrl={videoUrl} />
          )}


          {contents.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Ressources</p>
              {contents.map((content: any) => (
                <div key={content.id}>
                  {content.content_type === 'audio' && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3">
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
                        🎵 {content.file_name || 'Audio de la sourate'}
                      </p>
                      <audio
                        src={content.file_url}
                        controls
                        preload="metadata"
                        className="w-full"
                        style={{ height: '40px' }}
                      />
                    </div>
                  )}
                  {content.content_type === 'video' && (
                    <video controls className="w-full rounded-lg" src={content.file_url}>
                      Votre navigateur ne supporte pas la lecture vidéo.
                    </video>
                  )}
                  {content.content_type === 'pdf' && (
                    <a href={content.file_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="text-sm">{content.file_name}</span>
                    </a>
                  )}
                  {content.content_type === 'image' && (
                    <img src={content.file_url} alt={content.file_name} className="w-full rounded-lg" />
                  )}
                  {content.content_type === 'document' && (
                    <a href={content.file_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <File className="h-4 w-4" />
                      <span className="text-sm">{content.file_name}</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Verses */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Versets</p>
            <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto">
              {versesLoading ? (
                Array.from({ length: Math.min(sourate.verses_count, 6) }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))
              ) : (
                Array.from({ length: sourate.verses_count }, (_, i) => i + 1).map(verseNum => {
                  const isVerseValidated = verseProgress.get(`${dbId}-${verseNum}`) || false;
                  const verseData = verses.find(v => v.id === verseNum);
                  const verseAudio = versetsAudio.find((a: any) => a.verset_number === verseNum);
                  return (
                    <div
                      key={verseNum}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg transition-colors border',
                        isVerseValidated 
                          ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' 
                          : 'bg-muted/30 border-transparent'
                      )}
                    >
                      <Checkbox
                        checked={isVerseValidated}
                        onCheckedChange={() => onVerseToggle(dbId, verseNum, sourate.number, sourate.verses_count)}
                        className={cn(
                          'h-5 w-5 rounded border-2 mt-1 shrink-0',
                          isVerseValidated ? 'border-green-500 bg-green-500 data-[state=checked]:bg-green-500' : 'border-gold'
                        )}
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        {/* Arabic text */}
                        <p className={cn(
                          'font-arabic text-right text-base leading-relaxed',
                          isVerseValidated ? 'text-green-700 dark:text-green-300' : 'text-foreground'
                        )}>
                          {verseData?.text_arabic || `﴿ ${verseNum} ﴾`}
                        </p>
                        {/* Transliteration */}
                        {verseData?.transliteration && (
                          <p className="text-xs text-primary/80 italic">
                            {verseData.transliteration}
                          </p>
                        )}
                        {/* French translation */}
                        {verseData?.translation_fr && (
                          <p className="text-xs text-muted-foreground">
                            {verseData.translation_fr}
                          </p>
                        )}
                        {/* Verse audio */}
                        {verseAudio && (
                          <LecteurVerset audioUrl={verseAudio.audio_url} />
                        )}
                        {/* Verse number indicator */}
                        <p className={cn(
                          'text-[10px] font-medium',
                          isVerseValidated ? 'text-green-500' : 'text-muted-foreground/60'
                        )}>
                          Verset {verseNum}
                        </p>
                      </div>
                      {isVerseValidated && <Check className="h-4 w-4 text-green-500 shrink-0 mt-1" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Memorization tips */}
          <div className="bg-muted/50 rounded-xl p-3 text-sm">
            <p className="font-medium text-foreground flex items-center gap-2 mb-1">
              <BookOpen className="h-4 w-4 text-gold" />
              Techniques de mémorisation
            </p>
            <ul className="text-muted-foreground text-xs space-y-1 ml-6">
              <li>• Écouter plusieurs fois</li>
              <li>• Répéter à voix haute</li>
              <li>• Réviser régulièrement</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SourateDetailDialog;
