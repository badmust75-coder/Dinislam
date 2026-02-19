
-- Create homework_assignments table
CREATE TABLE public.homework_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL CHECK (subject IN ('nourania', 'alphabet', 'invocation', 'sourate', 'priere')),
  title TEXT NOT NULL,
  description TEXT,
  lesson_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create homework_submissions table
CREATE TABLE public.homework_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.homework_assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.homework_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for homework_assignments
CREATE POLICY "Admins can manage all assignments"
  ON public.homework_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own assignments"
  ON public.homework_assignments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own assignments status"
  ON public.homework_assignments FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS policies for homework_submissions
CREATE POLICY "Admins can manage all submissions"
  ON public.homework_submissions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own submissions"
  ON public.homework_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own submissions"
  ON public.homework_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update trigger for updated_at
CREATE TRIGGER update_homework_assignments_updated_at
  BEFORE UPDATE ON public.homework_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for homework_assignments
ALTER PUBLICATION supabase_realtime ADD TABLE public.homework_assignments;

-- Create storage bucket for homework submissions
INSERT INTO storage.buckets (id, name, public) VALUES ('homework-submissions', 'homework-submissions', true);

-- Storage policies
CREATE POLICY "Users can upload homework files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'homework-submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view homework files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'homework-submissions');

CREATE POLICY "Admins can manage homework files"
  ON storage.objects FOR ALL
  USING (bucket_id = 'homework-submissions' AND public.has_role(auth.uid(), 'admin'));
