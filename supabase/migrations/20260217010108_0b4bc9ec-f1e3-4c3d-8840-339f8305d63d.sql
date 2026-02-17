
-- Table for pending sourate validation requests
CREATE TABLE public.sourate_validation_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sourate_id INTEGER NOT NULL REFERENCES public.sourates(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID
);

-- Enable RLS
ALTER TABLE public.sourate_validation_requests ENABLE ROW LEVEL SECURITY;

-- Users can create their own validation requests
CREATE POLICY "Users can create validation requests"
ON public.sourate_validation_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own requests
CREATE POLICY "Users can view their own validation requests"
ON public.sourate_validation_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all validation requests"
ON public.sourate_validation_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update requests (approve/reject)
CREATE POLICY "Admins can update validation requests"
ON public.sourate_validation_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete validation requests
CREATE POLICY "Admins can delete validation requests"
ON public.sourate_validation_requests
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Unique constraint: one pending request per user per sourate
CREATE UNIQUE INDEX idx_sourate_validation_unique 
ON public.sourate_validation_requests(user_id, sourate_id) 
WHERE status = 'pending';

-- Enable realtime for admin notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.sourate_validation_requests;
