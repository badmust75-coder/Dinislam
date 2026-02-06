import { useState, useEffect, useCallback } from 'react';
import {
  calculatePrayerTimes,
  getUserLocation,
  getNextPrayer,
  formatPrayerTime,
  getTimeUntilPrayer,
} from '@/lib/prayerTimes';
import { useAuth } from '@/contexts/AuthContext';
import { getNotificationPreferences } from '@/lib/notifications';

interface PrayerTimesData {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

interface UsePrayerTimesResult {
  prayerTimes: PrayerTimesData | null;
  nextPrayer: { name: string; timeFormatted: string; timeUntil: string } | null;
  loading: boolean;
  error: string | null;
  location: { latitude: number; longitude: number } | null;
}

export const usePrayerTimes = (): UsePrayerTimesResult => {
  const { user } = useAuth();
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimesData | null>(null);
  const [nextPrayer, setNextPrayer] = useState<{ name: string; timeFormatted: string; timeUntil: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const calculateTimes = useCallback(async () => {
    try {
      const coords = await getUserLocation();
      setLocation(coords);
      
      const today = new Date();
      const times = calculatePrayerTimes(today, coords);
      
      setPrayerTimes({
        fajr: formatPrayerTime(times.fajr),
        sunrise: formatPrayerTime(times.sunrise),
        dhuhr: formatPrayerTime(times.dhuhr),
        asr: formatPrayerTime(times.asr),
        maghrib: formatPrayerTime(times.maghrib),
        isha: formatPrayerTime(times.isha),
      });
      
      const next = getNextPrayer(times);
      if (next) {
        setNextPrayer({
          name: next.name,
          timeFormatted: formatPrayerTime(next.time),
          timeUntil: getTimeUntilPrayer(next.time),
        });
      }
      
      setLoading(false);
    } catch (err) {
      setError('Impossible de calculer les horaires de prière');
      setLoading(false);
    }
  }, []);

  // Schedule local notification for next prayer
  const scheduleNotification = useCallback(async (prayerName: string, prayerTime: Date) => {
    if (!user) return;
    
    // Check if notifications are enabled
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }
    
    // Check user preferences
    const prefs = await getNotificationPreferences(user.id);
    if (!prefs?.prayer_reminders) return;
    
    // Map prayer name to preference
    const prefMap: Record<string, boolean> = {
      'Fajr': prefs.fajr_reminder,
      'Dhuhr': prefs.dhuhr_reminder,
      'Asr': prefs.asr_reminder,
      'Maghrib': prefs.maghrib_reminder,
      'Isha': prefs.isha_reminder,
    };
    
    if (!prefMap[prayerName]) return;
    
    const now = new Date();
    const timeUntilPrayer = prayerTime.getTime() - now.getTime();
    
    // Schedule notification 5 minutes before prayer
    const notifyBefore = 5 * 60 * 1000; // 5 minutes in ms
    const scheduleTime = timeUntilPrayer - notifyBefore;
    
    if (scheduleTime > 0 && scheduleTime < 24 * 60 * 60 * 1000) { // Within 24 hours
      setTimeout(() => {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          // Use service worker for background notification
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(`Rappel - Prière ${prayerName}`, {
              body: `Il sera bientôt l'heure de la prière ${prayerName}`,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: `prayer-${prayerName.toLowerCase()}`,
            });
          });
        } else {
          // Fallback to regular notification
          new Notification(`Rappel - Prière ${prayerName}`, {
            body: `Il sera bientôt l'heure de la prière ${prayerName}`,
            icon: '/favicon.ico',
          });
        }
      }, scheduleTime);
    }
  }, [user]);

  useEffect(() => {
    calculateTimes();
    
    // Recalculate every minute for countdown
    const interval = setInterval(() => {
      if (location) {
        const today = new Date();
        const times = calculatePrayerTimes(today, location);
        const next = getNextPrayer(times);
        if (next) {
          setNextPrayer({
            name: next.name,
            timeFormatted: formatPrayerTime(next.time),
            timeUntil: getTimeUntilPrayer(next.time),
          });
          
          // Schedule notification for this prayer
          scheduleNotification(next.name, next.time);
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [calculateTimes, location, scheduleNotification]);

  return { prayerTimes, nextPrayer, loading, error, location };
};
