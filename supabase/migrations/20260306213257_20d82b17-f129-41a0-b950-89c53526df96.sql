
-- Student groups table
CREATE TABLE public.student_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT 'bg-blue-100',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.student_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage student groups" ON public.student_groups
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read student groups" ON public.student_groups
  FOR SELECT TO authenticated
  USING (true);

-- Student group members junction table
CREATE TABLE public.student_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.student_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.student_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage group members" ON public.student_group_members
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read group members" ON public.student_group_members
  FOR SELECT TO authenticated
  USING (true);
