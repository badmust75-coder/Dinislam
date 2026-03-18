ALTER TABLE public.user_ramadan_fasting DROP CONSTRAINT IF EXISTS user_ramadan_fasting_user_id_date_key;
ALTER TABLE public.user_ramadan_fasting DROP CONSTRAINT IF EXISTS ramadan_fasting_user_day_unique;
ALTER TABLE public.user_ramadan_fasting ADD CONSTRAINT user_ramadan_fasting_user_day_unique UNIQUE (user_id, day_number);