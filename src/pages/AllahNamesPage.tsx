import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, Play, FileText, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AllahNamesPage = () => {
  const [selected, setSelected] = useState<any>(null);
  const [mediaOpen, setMediaOpen] = useState<'video' | 'audio' | 'pdf' | null>(null);

  const { data: names = [], isLoading } = useQuery({
    queryKey: ['allah-names'],
    queryFn: async () => {
      const { data, error } = await supabase.from('allah_names').select('*').order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: selectedMedia = [] } = useQuery({
    queryKey: ['allah-name-media', selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('allah_name_media')
        .select('*')
        .eq('name_id', selected.id);
      if (error) throw error;
      return (data || []) as Array<{ id: string; media_type: string; file_url: string; file_name: string }>;
    },
  });

  const getMedia = (type: string) => selectedMedia.find((m: any) => m.media_type === type);

  // Gradient backgrounds for cards (dark Islamic palette)
  const cardGradients = [
    'from-[#1a2a1a] to-[#2d4a2d]',
    'from-[#1a1a2e] to-[#16213e]',
    'from-[#2d1b00] to-[#4a2d00]',
    'from-[#1a0a2e] to-[#2d1a4a]',
    'from-[#0a1a2d] to-[#1a2d4a]',
    'from-[#2d0a0a] to-[#4a1a1a]',
  ];

  return (
    <AppLayout title="99 Noms d'Allah">
      {/* Dark textured background */}
      <div
        className="min-h-screen relative"
        style={{
          background: 'radial-gradient(ellipse at top, hsl(220 60% 8%) 0%, hsl(220 80% 4%) 100%)',
        }}
      >
        {/* Decorative pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4af37' fill-opacity='1'%3E%3Cpath d='M30 0l8.66 15H21.34L30 0zm0 60L21.34 45h17.32L30 60zM0 30l15-8.66V38.66L0 30zm60 0L45 38.66V21.34L60 30zM30 22.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 p-4 pb-24 space-y-6">
          {/* Header */}
          <div className="text-center py-6">
            <h1
              className="font-bold text-2xl mb-1"
              style={{ color: 'hsl(45 90% 55%)' }}
            >
              99 Noms d'Allah
            </h1>
            <p
              className="font-arabic text-3xl mb-2"
              style={{ color: 'hsl(45 70% 80%)' }}
            >
              أسماء الله الحسنى
            </p>
            <p className="text-sm" style={{ color: 'hsl(220 20% 60%)' }}>
              {names.length} noms • Explorez les significations divines
            </p>
            {/* Decorative divider */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="h-px w-16" style={{ background: 'hsl(45 90% 50%)' }} />
              <span style={{ color: 'hsl(45 90% 55%)' }}>✦</span>
              <div className="h-px w-16" style={{ background: 'hsl(45 90% 50%)' }} />
            </div>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-36 rounded-2xl animate-pulse" style={{ background: 'hsl(220 60% 10%)' }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {names.map((name: any, idx: number) => {
                const grad = cardGradients[idx % cardGradients.length];
                return (
                  <button
                    key={name.id}
                    onClick={() => setSelected(name)}
                    className={`relative flex flex-col items-center justify-between rounded-2xl p-4 bg-gradient-to-br ${grad} border active:scale-95 transition-all duration-200 overflow-hidden text-left`}
                    style={{
                      borderColor: 'rgba(212, 175, 55, 0.25)',
                      minHeight: '140px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                    }}
                  >
                    {/* Number badge */}
                    <span
                      className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{ color: 'hsl(45 90% 55%)', background: 'rgba(212,175,55,0.15)' }}
                    >
                      {name.display_order}
                    </span>

                    {/* Custom image or decorative arch */}
                    {name.image_url ? (
                      <img
                        src={name.image_url}
                        alt={name.name_french}
                        className="w-full h-16 object-cover rounded-xl mb-2 opacity-80"
                      />
                    ) : (
                      <div className="w-full flex items-center justify-center h-10 mt-4 mb-1">
                        {/* Decorative Islamic arch SVG */}
                        <svg width="48" height="32" viewBox="0 0 48 32" fill="none" opacity="0.35">
                          <path d="M4 32 Q4 8 24 4 Q44 8 44 32" stroke="hsl(45 90% 55%)" strokeWidth="1.5" fill="none"/>
                          <line x1="4" y1="32" x2="44" y2="32" stroke="hsl(45 90% 55%)" strokeWidth="1.5"/>
                        </svg>
                      </div>
                    )}

                    {/* Arabic calligraphy */}
                    <p
                      className="font-arabic text-2xl font-bold text-center leading-tight w-full mt-1"
                      style={{ color: 'hsl(0 0% 95%)' }}
                    >
                      {name.name_arabic}
                    </p>

                    {/* Transliteration (phonetic golden) */}
                    {name.transliteration && (
                      <p
                        className="text-xs font-semibold text-center mt-1"
                        style={{ color: 'hsl(45 90% 55%)' }}
                      >
                        {name.transliteration}
                      </p>
                    )}

                    {/* French translation */}
                    <p
                      className="text-[11px] text-center mt-0.5 leading-tight"
                      style={{ color: 'hsl(220 20% 70%)' }}
                    >
                      {name.name_french}
                    </p>

                    {/* Gold bottom accent */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ background: 'linear-gradient(90deg, transparent, hsl(45 90% 50%), transparent)' }}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail dialog */}
      {selected && (
        <Dialog open onOpenChange={() => { setSelected(null); setMediaOpen(null); }}>
          <DialogContent
            className="max-w-md max-h-[90vh] overflow-y-auto p-0 border-0"
            style={{
              background: 'linear-gradient(180deg, hsl(220 70% 8%) 0%, hsl(220 80% 4%) 100%)',
              borderColor: 'rgba(212,175,55,0.3)',
            }}
          >
            {/* Close button */}
            <button
              onClick={() => { setSelected(null); setMediaOpen(null); }}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(212,175,55,0.2)', color: 'hsl(45 90% 55%)' }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-6 space-y-5">
              {/* Header area */}
              <div className="text-center pt-2">
                <p className="text-xs font-bold mb-3" style={{ color: 'hsl(45 90% 55%)' }}>
                  Nom #{selected.display_order}
                </p>

                {selected.image_url && (
                  <img
                    src={selected.image_url}
                    alt={selected.name_french}
                    className="w-full h-40 object-cover rounded-2xl mb-4 opacity-90"
                  />
                )}

                {/* Arabic */}
                <p className="font-arabic text-5xl font-bold leading-tight mb-3" style={{ color: 'hsl(0 0% 95%)' }}>
                  {selected.name_arabic}
                </p>

                {/* Divider */}
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="h-px w-12" style={{ background: 'hsl(45 90% 50%)' }} />
                  <span style={{ color: 'hsl(45 90% 55%)' }}>✦</span>
                  <div className="h-px w-12" style={{ background: 'hsl(45 90% 50%)' }} />
                </div>

                {/* Transliteration */}
                {selected.transliteration && (
                  <p className="text-lg font-bold mb-1" style={{ color: 'hsl(45 90% 55%)' }}>
                    {selected.transliteration}
                  </p>
                )}

                {/* French */}
                <p className="text-base" style={{ color: 'hsl(220 20% 75%)' }}>
                  {selected.name_french}
                </p>
              </div>

              {/* Explanation */}
              {selected.explanation && (
                <div
                  className="rounded-xl p-4"
                  style={{ background: 'rgba(212,175,55,0.08)', borderColor: 'rgba(212,175,55,0.2)', border: '1px solid' }}
                >
                  <p className="text-xs font-bold mb-2" style={{ color: 'hsl(45 90% 55%)' }}>
                    Explication
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'hsl(220 20% 75%)' }}>
                    {selected.explanation}
                  </p>
                </div>
              )}

              {/* Media buttons */}
              {(getMedia('video') || getMedia('audio') || getMedia('pdf')) && (
                <div className="space-y-2">
                  <p className="text-xs font-bold" style={{ color: 'hsl(45 90% 55%)' }}>Ressources</p>
                  <div className="flex flex-wrap gap-2">
                    {getMedia('video') && (
                      <Button
                        size="sm"
                        onClick={() => setMediaOpen('video')}
                        className="gap-2 text-xs"
                        style={{ background: 'rgba(212,175,55,0.15)', color: 'hsl(45 90% 55%)', border: '1px solid rgba(212,175,55,0.3)' }}
                        variant="outline"
                      >
                        <Play className="h-3.5 w-3.5" /> Vidéo
                      </Button>
                    )}
                    {getMedia('audio') && (
                      <Button
                        size="sm"
                        onClick={() => setMediaOpen('audio')}
                        className="gap-2 text-xs"
                        style={{ background: 'rgba(212,175,55,0.15)', color: 'hsl(45 90% 55%)', border: '1px solid rgba(212,175,55,0.3)' }}
                        variant="outline"
                      >
                        <Music className="h-3.5 w-3.5" /> Audio
                      </Button>
                    )}
                    {getMedia('pdf') && (
                      <Button
                        size="sm"
                        onClick={() => setMediaOpen('pdf')}
                        className="gap-2 text-xs"
                        style={{ background: 'rgba(212,175,55,0.15)', color: 'hsl(45 90% 55%)', border: '1px solid rgba(212,175,55,0.3)' }}
                        variant="outline"
                      >
                        <FileText className="h-3.5 w-3.5" /> PDF
                      </Button>
                    )}
                  </div>

                  {/* Inline media players */}
                  {mediaOpen === 'video' && getMedia('video') && (
                    <video controls className="w-full rounded-xl mt-2" style={{ maxHeight: '200px' }}>
                      <source src={getMedia('video').file_url} />
                    </video>
                  )}
                  {mediaOpen === 'audio' && getMedia('audio') && (
                    <audio controls className="w-full mt-2">
                      <source src={getMedia('audio').file_url} />
                    </audio>
                  )}
                  {mediaOpen === 'pdf' && getMedia('pdf') && (
                    <a
                      href={getMedia('pdf').file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-2 text-center py-3 rounded-xl text-sm font-bold"
                      style={{ background: 'rgba(212,175,55,0.15)', color: 'hsl(45 90% 55%)' }}
                    >
                      📄 Ouvrir le PDF
                    </a>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
};

export default AllahNamesPage;
