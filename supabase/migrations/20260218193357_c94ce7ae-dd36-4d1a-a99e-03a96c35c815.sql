
-- Add explanation text and question_order to ramadan_quizzes
ALTER TABLE public.ramadan_quizzes 
ADD COLUMN IF NOT EXISTS explanation text,
ADD COLUMN IF NOT EXISTS question_order integer NOT NULL DEFAULT 0;

-- Add attempt_number to quiz_responses (1 = first attempt, 2 = second attempt)
ALTER TABLE public.quiz_responses
ADD COLUMN IF NOT EXISTS attempt_number integer NOT NULL DEFAULT 1;

-- Add is_correct to quiz_responses for tracking
ALTER TABLE public.quiz_responses
ADD COLUMN IF NOT EXISTS is_correct boolean NOT NULL DEFAULT false;
