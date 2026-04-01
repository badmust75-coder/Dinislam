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

// Using api.alquran.cloud - reliable, CORS-enabled, multiple editions in one call
const API_BASE = 'https://api.alquran.cloud/v1/surah';

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
        // Special case: Ayat Al-Kursi (number 1000) = Surah 2, verse 255
        if (sourateNumber === 1000) {
          const AYAH_API = 'https://api.alquran.cloud/v1/ayah';
          const [arRes, frRes, transRes] = await Promise.all([
            fetch(`${AYAH_API}/2:255/quran-uthmani`),
            fetch(`${AYAH_API}/2:255/fr.hamidullah`),
            fetch(`${AYAH_API}/2:255/en.transliteration`),
          ]);
          const [arJson, frJson, transJson] = await Promise.all([arRes.json(), frRes.json(), transRes.json()]);

          if (cancelled) return;

          const combined: QuranVerse[] = [{
            id: 1,
            text_arabic: arJson.data?.text || '',
            transliteration: transJson.data?.text || '',
            translation_fr: frJson.data?.text || '',
          }];

          verseCache[sourateNumber] = combined;
          setVerses(combined);
          if (!cancelled) setLoading(false);
          return;
        }

        // Fetch Arabic (Uthmani), French (Hamidullah), and Transliteration in one call
        const res = await fetch(
          `${API_BASE}/${sourateNumber}/editions/quran-uthmani,fr.hamidullah,en.transliteration`
        );
        const json = await res.json();

        if (cancelled) return;

        if (json.code !== 200 || !json.data || json.data.length < 3) {
          console.error('Quran API returned unexpected data:', json);
          return;
        }

        const [arData, frData, transData] = json.data;

        const combined: QuranVerse[] = (arData.ayahs || []).map((ayah: any, i: number) => ({
          id: ayah.numberInSurah,
          text_arabic: ayah.text || '',
          transliteration: transData.ayahs?.[i]?.text || '',
          translation_fr: frData.ayahs?.[i]?.text || '',
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
