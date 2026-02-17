import { useState, useEffect } from 'react';

interface QuranVerse {
  id: number;
  text_arabic: string;
  transliteration: string;
  translation_fr: string;
}

interface QuranVerseCache {
  [sourateNumber: number]: QuranVerse[];
}

const verseCache: QuranVerseCache = {};

const API_BASE = 'https://alquran-api.pages.dev/api/quran/surah';

export const useQuranVerses = (sourateNumber: number | null) => {
  const [verses, setVerses] = useState<QuranVerse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sourateNumber) {
      setVerses([]);
      return;
    }

    if (verseCache[sourateNumber]) {
      setVerses(verseCache[sourateNumber]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchVerses = async () => {
      try {
        const [arRes, frRes, transRes] = await Promise.all([
          fetch(`${API_BASE}/${sourateNumber}?lang=ar`),
          fetch(`${API_BASE}/${sourateNumber}?lang=fr`),
          fetch(`${API_BASE}/${sourateNumber}?lang=transliteration`),
        ]);

        const [arData, frData, transData] = await Promise.all([
          arRes.json(),
          frRes.json(),
          transRes.json(),
        ]);

        if (cancelled) return;

        const combined: QuranVerse[] = (arData.verses || []).map((v: any, i: number) => ({
          id: v.id,
          text_arabic: v.text || '',
          transliteration: transData.verses?.[i]?.transliteration || '',
          translation_fr: frData.verses?.[i]?.translation || '',
        }));

        verseCache[sourateNumber] = combined;
        setVerses(combined);
      } catch (error) {
        console.error('Error fetching Quran verses:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchVerses();
    return () => { cancelled = true; };
  }, [sourateNumber]);

  return { verses, loading };
};
