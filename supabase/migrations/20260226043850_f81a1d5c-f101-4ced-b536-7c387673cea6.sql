
-- Table for admin-configurable point scale per module
CREATE TABLE public.point_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key text NOT NULL UNIQUE,
  module_label text NOT NULL,
  points_per_validation integer NOT NULL DEFAULT 5,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.point_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read point settings"
  ON public.point_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage point settings"
  ON public.point_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default values matching current system
INSERT INTO public.point_settings (module_key, module_label, points_per_validation) VALUES
  ('sourates', 'Sourate validée', 10),
  ('nourania', 'Nourania validée', 15),
  ('ramadan', 'Ramadan complété', 5),
  ('alphabet', 'Lettre validée', 5),
  ('invocations', 'Invocation mémorisée', 5),
  ('prayer', 'Prière validée', 10);

-- Update recalculate function to use dynamic point settings
CREATE OR REPLACE FUNCTION public.recalculate_student_points(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sourates int;
  v_nourania int;
  v_ramadan int;
  v_alphabet int;
  v_invocations int;
  v_prayer int;
  v_total int;
  pts_sourates int;
  pts_nourania int;
  pts_ramadan int;
  pts_alphabet int;
  pts_invocations int;
  pts_prayer int;
BEGIN
  -- Load dynamic point values
  SELECT COALESCE(points_per_validation, 10) INTO pts_sourates FROM point_settings WHERE module_key = 'sourates';
  SELECT COALESCE(points_per_validation, 15) INTO pts_nourania FROM point_settings WHERE module_key = 'nourania';
  SELECT COALESCE(points_per_validation, 5) INTO pts_ramadan FROM point_settings WHERE module_key = 'ramadan';
  SELECT COALESCE(points_per_validation, 5) INTO pts_alphabet FROM point_settings WHERE module_key = 'alphabet';
  SELECT COALESCE(points_per_validation, 5) INTO pts_invocations FROM point_settings WHERE module_key = 'invocations';
  SELECT COALESCE(points_per_validation, 10) INTO pts_prayer FROM point_settings WHERE module_key = 'prayer';

  -- Fallback if no row found
  pts_sourates := COALESCE(pts_sourates, 10);
  pts_nourania := COALESCE(pts_nourania, 15);
  pts_ramadan := COALESCE(pts_ramadan, 5);
  pts_alphabet := COALESCE(pts_alphabet, 5);
  pts_invocations := COALESCE(pts_invocations, 5);
  pts_prayer := COALESCE(pts_prayer, 10);

  SELECT COALESCE(COUNT(*), 0) * pts_sourates INTO v_sourates
  FROM user_sourate_progress WHERE user_id = p_user_id AND is_validated = true;

  SELECT COALESCE(COUNT(*), 0) * pts_nourania INTO v_nourania
  FROM user_nourania_progress WHERE user_id = p_user_id AND is_validated = true;

  SELECT COALESCE(COUNT(*), 0) * pts_ramadan INTO v_ramadan
  FROM user_ramadan_progress WHERE user_id = p_user_id AND video_watched = true AND quiz_completed = true;

  SELECT COALESCE(COUNT(*), 0) * pts_alphabet INTO v_alphabet
  FROM user_alphabet_progress WHERE user_id = p_user_id AND is_validated = true;

  SELECT COALESCE(COUNT(*), 0) * pts_invocations INTO v_invocations
  FROM user_invocation_progress WHERE user_id = p_user_id AND is_memorized = true;

  SELECT COALESCE(COUNT(*), 0) * pts_prayer INTO v_prayer
  FROM user_prayer_progress WHERE user_id = p_user_id AND is_validated = true;

  v_total := v_sourates + v_nourania + v_ramadan + v_alphabet + v_invocations + v_prayer;

  INSERT INTO student_ranking (user_id, total_points, sourates_points, nourania_points, ramadan_points, alphabet_points, invocations_points, prayer_points)
  VALUES (p_user_id, v_total, v_sourates, v_nourania, v_ramadan, v_alphabet, v_invocations, v_prayer)
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = v_total,
    sourates_points = v_sourates,
    nourania_points = v_nourania,
    ramadan_points = v_ramadan,
    alphabet_points = v_alphabet,
    invocations_points = v_invocations,
    prayer_points = v_prayer;
END;
$function$;
