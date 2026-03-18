import { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const NB_VERSETS: Record<number, number> = {
  1:7,2:286,3:200,4:176,5:120,6:165,7:206,8:75,9:129,10:109,
  11:123,12:111,13:43,14:52,15:99,16:128,17:111,18:110,19:98,20:135,
  21:112,22:78,23:118,24:64,25:77,26:227,27:93,28:88,29:69,30:60,
  31:34,32:30,33:73,34:54,35:45,36:83,37:182,38:88,39:75,40:85,
  41:54,42:53,43:89,44:59,45:37,46:35,47:38,48:29,49:18,50:45,
  51:60,52:49,53:62,54:55,55:78,56:96,57:29,58:22,59:24,60:13,
  61:14,62:11,63:11,64:18,65:12,66:12,67:30,68:52,69:52,70:44,
  71:28,72:28,73:20,74:56,75:40,76:31,77:50,78:40,79:46,80:42,
  81:29,82:19,83:36,84:25,85:22,86:17,87:19,88:26,89:30,90:20,
  91:15,92:21,93:11,94:8,95:8,96:19,97:5,98:8,99:8,100:11,
  101:11,102:8,103:3,104:9,105:5,106:4,107:7,108:3,109:6,110:3,
  111:5,112:4,113:5,114:6
};

interface AdminSourateVersetsProps {
  sourate: {
    id: string;
    number: number;
    name_french: string;
    name_arabic: string;
    verses_count?: number | null;
  };
}

const AdminSourateVersets = ({ sourate }: AdminSourateVersetsProps) => {
  const [versets, setVersets] = useState<any[]>([]);
  const [uploading, setUploading] = useState<number | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const nbVersets = sourate.verses_count || NB_VERSETS[sourate.number] || 7;

  const chargerVersets = async () => {
    const { data } = await supabase
      .from('sourate_versets_audio' as any)
      .select('*')
      .eq('sourate_id', sourate.id)
      .order('verset_number', { ascending: true });
    setVersets(data || []);
  };

  useEffect(() => {
    if (ouvert) chargerVersets();
  }, [sourate.id, ouvert]);

  const getVersetAudio = (versetNum: number) =>
    versets.find((v: any) => v.verset_number === versetNum);

  const handleUpload = async (versetNum: number, file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast.error('Fichier audio uniquement');
      return;
    }
    setUploading(versetNum);

    const fileName = `sourate-${sourate.number}/verset-${versetNum}-${Date.now()}.${file.name.split('.').pop()}`;

    const existing = getVersetAudio(versetNum);
    if (existing?.file_path) {
      await supabase.storage.from('sourates-versets').remove([existing.file_path]);
    }

    const { error: uploadError } = await supabase.storage
      .from('sourates-versets')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast.error('Erreur upload: ' + uploadError.message);
      setUploading(null);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('sourates-versets')
      .getPublicUrl(fileName);

    const { error } = await (supabase as any)
      .from('sourate_versets_audio')
      .upsert({
        sourate_id: sourate.id,
        sourate_number: sourate.number,
        verset_number: versetNum,
        audio_url: urlData.publicUrl,
        file_path: fileName,
      }, { onConflict: 'sourate_id,verset_number' });

    if (error) {
      toast.error('Erreur: ' + error.message);
    } else {
      toast.success(`✅ Verset ${versetNum} uploadé`);
    }
    setUploading(null);
    chargerVersets();
  };

  const handleDelete = async (versetNum: number) => {
    const existing = getVersetAudio(versetNum);
    if (!existing) return;

    if (existing.file_path) {
      await supabase.storage.from('sourates-versets').remove([existing.file_path]);
    }

    await (supabase as any)
      .from('sourate_versets_audio')
      .delete()
      .eq('id', existing.id);

    toast.success(`Verset ${versetNum} supprimé`);
    chargerVersets();
  };

  const uploadedCount = versets.length;

  return (
    <div className="bg-background rounded-2xl shadow-sm border overflow-hidden">
      <button
        onClick={() => setOuvert(!ouvert)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm text-foreground">
            🎵 Versets audio — {sourate.name_french}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
            uploadedCount === nbVersets
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : uploadedCount > 0
              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
              : 'bg-muted text-muted-foreground'
          }`}>
            {uploadedCount}/{nbVersets}
          </span>
        </div>
        {ouvert
          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />
        }
      </button>

      {ouvert && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-1 gap-2">
            {Array.from({ length: nbVersets }, (_, i) => i + 1).map(versetNum => {
              const audio = getVersetAudio(versetNum);
              const isUploading = uploading === versetNum;

              return (
                <div
                  key={versetNum}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    audio
                      ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
                      : 'bg-muted/30 border-border'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    audio
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {audio ? <Check className="w-4 h-4" /> : versetNum}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                      Verset {versetNum}
                    </p>
                    {audio ? (
                      <audio
                        src={audio.audio_url}
                        controls
                        preload="none"
                        className="w-full"
                        style={{ height: '28px' }}
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground/60">Aucun audio</p>
                    )}
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <input
                      ref={el => { inputRefs.current[versetNum] = el; }}
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(versetNum, file);
                        e.target.value = '';
                      }}
                    />
                    <button
                      onClick={() => inputRefs.current[versetNum]?.click()}
                      disabled={isUploading}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary text-primary-foreground disabled:opacity-50 shrink-0"
                    >
                      {isUploading
                        ? <div className="w-3 h-3 border border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        : <Upload className="w-3 h-3" />
                      }
                    </button>
                    {audio && (
                      <button
                        onClick={() => handleDelete(versetNum)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-destructive/10 text-destructive shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSourateVersets;
