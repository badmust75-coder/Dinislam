import { supabase } from '@/integrations/supabase/client';

// Keep notification preferences functions (backward compat)
export async function getNotificationPreferences(userId: string) {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching preferences:', error);
  }

  return data;
}

export async function updateNotificationPreferences(
  userId: string,
  preferences: {
    prayer_reminders?: boolean;
    ramadan_activities?: boolean;
    daily_reminder_time?: string;
    fajr_reminder?: boolean;
    dhuhr_reminder?: boolean;
    asr_reminder?: boolean;
    maghrib_reminder?: boolean;
    isha_reminder?: boolean;
  }
) {
  const { error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      ...preferences,
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('Error updating preferences:', error);
    return false;
  }

  return true;
}
