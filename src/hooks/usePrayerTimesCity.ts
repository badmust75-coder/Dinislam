import { useState, useEffect, useCallback } from 'react';

export interface PrayerTimesData {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  fajrDate: Date;
  sunriseDate: Date;
  dhuhrDate: Date;
  asrDate: Date;
  maghribDate: Date;
  ishaDate: Date;
}

export interface CityOption {
  label: string;
  country: string;
  lat: number;
  lon: number;
}

// Priority cities (local community) - displayed first
export const PRIORITY_CITIES: CityOption[] = [
  { label: 'Millau (12)', country: 'FR', lat: 44.10, lon: 3.08 },
  { label: 'Pignan (34)', country: 'FR', lat: 43.58, lon: 3.72 },
  { label: "Clermont-l'Hérault (34)", country: 'FR', lat: 43.63, lon: 3.43 },
  { label: 'Nébian (34)', country: 'FR', lat: 43.65, lon: 3.47 },
  { label: 'Paulhan (34)', country: 'FR', lat: 43.54, lon: 3.46 },
];

// Other cities sorted alphabetically
export const OTHER_CITIES: CityOption[] = [
  { label: 'Angers (49)', country: 'FR', lat: 47.47, lon: -0.55 },
  { label: 'Besançon (25)', country: 'FR', lat: 47.24, lon: 6.02 },
  { label: 'Bordeaux (33)', country: 'FR', lat: 44.84, lon: -0.58 },
  { label: 'Caen (14)', country: 'FR', lat: 49.18, lon: -0.37 },
  { label: 'Dijon (21)', country: 'FR', lat: 47.32, lon: 5.04 },
  { label: 'Grenoble (38)', country: 'FR', lat: 45.19, lon: 5.72 },
  { label: 'Lille (59)', country: 'FR', lat: 50.63, lon: 3.07 },
  { label: 'Lyon (69)', country: 'FR', lat: 45.75, lon: 4.83 },
  { label: 'Marseille (13)', country: 'FR', lat: 43.30, lon: 5.37 },
  { label: 'Metz (57)', country: 'FR', lat: 49.12, lon: 6.18 },
  { label: 'Montpellier (34)', country: 'FR', lat: 43.61, lon: 3.88 },
  { label: 'Nantes (44)', country: 'FR', lat: 47.22, lon: -1.55 },
  { label: 'Nice (06)', country: 'FR', lat: 43.71, lon: 7.26 },
  { label: 'Orléans (45)', country: 'FR', lat: 47.90, lon: 1.91 },
  { label: 'Paris (75)', country: 'FR', lat: 48.85, lon: 2.35 },
  { label: 'Perpignan (66)', country: 'FR', lat: 42.69, lon: 2.89 },
  { label: 'Reims (51)', country: 'FR', lat: 49.26, lon: 4.03 },
  { label: 'Rennes (35)', country: 'FR', lat: 48.11, lon: -1.68 },
  { label: 'Rouen (76)', country: 'FR', lat: 49.44, lon: 1.10 },
  { label: 'Saint-Étienne (42)', country: 'FR', lat: 45.43, lon: 4.39 },
  { label: 'Strasbourg (67)', country: 'FR', lat: 48.57, lon: 7.75 },
  { label: 'Tanger (Maroc)', country: 'MA', lat: 35.76, lon: -5.80 },
  { label: 'Toulon (83)', country: 'FR', lat: 43.12, lon: 5.93 },
  { label: 'Toulouse (31)', country: 'FR', lat: 43.60, lon: 1.44 },
];

export const CITIES: CityOption[] = [...PRIORITY_CITIES, ...OTHER_CITIES];

function parseTime(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function usePrayerTimesCity(city: CityOption) {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date();
      const day = today.getDate();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      // Method 2 = ISNA, method 12 = UOIF (France)
      const url = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${city.lat}&longitude=${city.lon}&method=12`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Erreur API');
      const json = await res.json();
      const t = json.data.timings;

      const fajr = t.Fajr;
      const sunrise = t.Sunrise;
      const dhuhr = t.Dhuhr;
      const asr = t.Asr;
      const maghrib = t.Maghrib;
      const isha = t.Isha;

      setPrayerTimes({
        fajr,
        sunrise,
        dhuhr,
        asr,
        maghrib,
        isha,
        fajrDate: parseTime(fajr),
        sunriseDate: parseTime(sunrise),
        dhuhrDate: parseTime(dhuhr),
        asrDate: parseTime(asr),
        maghribDate: parseTime(maghrib),
        ishaDate: parseTime(isha),
      });
    } catch (e) {
      setError('Impossible de charger les horaires');
    } finally {
      setLoading(false);
    }
  }, [city.lat, city.lon]);

  useEffect(() => {
    fetchTimes();
    // Refresh at midnight
    const now = new Date();
    const msToMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const timeout = setTimeout(fetchTimes, msToMidnight);
    return () => clearTimeout(timeout);
  }, [fetchTimes]);

  const getNextPrayer = useCallback(() => {
    if (!prayerTimes) return null;
    const now = new Date();
    const prayers = [
      { name: 'Sobh (Fajr)', arabic: 'الفجر', date: prayerTimes.fajrDate, time: prayerTimes.fajr },
      { name: 'Lever du soleil', arabic: 'الشروق', date: prayerTimes.sunriseDate, time: prayerTimes.sunrise },
      { name: 'Dohr', arabic: 'الظهر', date: prayerTimes.dhuhrDate, time: prayerTimes.dhuhr },
      { name: 'Asr', arabic: 'العصر', date: prayerTimes.asrDate, time: prayerTimes.asr },
      { name: 'Maghreb', arabic: 'المغرب', date: prayerTimes.maghribDate, time: prayerTimes.maghrib },
      { name: 'Icha', arabic: 'العشاء', date: prayerTimes.ishaDate, time: prayerTimes.isha },
    ];
    for (const p of prayers) {
      if (p.date > now) return p;
    }
    return prayers[0]; // Tomorrow's fajr
  }, [prayerTimes]);

  return { prayerTimes, loading, error, getNextPrayer };
}

export function calculateQiblaDirection(lat: number, lon: number): number {
  // Kaaba coordinates
  const kaabaLat = 21.3891 * (Math.PI / 180);
  const kaabaLon = 39.8579 * (Math.PI / 180);
  const userLat = lat * (Math.PI / 180);
  const dLon = kaabaLon - lon * (Math.PI / 180);

  const x = Math.sin(dLon) * Math.cos(kaabaLat);
  const y = Math.cos(userLat) * Math.sin(kaabaLat) - Math.sin(userLat) * Math.cos(kaabaLat) * Math.cos(dLon);
  const bearing = Math.atan2(x, y) * (180 / Math.PI);
  return (bearing + 360) % 360;
}
