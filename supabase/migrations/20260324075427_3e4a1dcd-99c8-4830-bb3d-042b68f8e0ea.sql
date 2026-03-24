
-- Achievements table
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'Other',
  description text,
  organizer text,
  date date,
  skills text[] DEFAULT '{}',
  proof_url text,
  status text NOT NULL DEFAULT 'pending',
  submitted_at timestamptz NOT NULL DEFAULT now()
);

-- Verifications table
CREATE TABLE public.verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  faculty_id uuid NOT NULL,
  status text NOT NULL,
  remarks text,
  verified_at timestamptz NOT NULL DEFAULT now()
);

-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Achievement RLS
CREATE POLICY "Students can insert own achievements" ON public.achievements FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can read own achievements" ON public.achievements FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Faculty can read all achievements" ON public.achievements FOR SELECT TO authenticated USING (has_role(auth.uid(), 'faculty'::app_role));
CREATE POLICY "Faculty can update achievements" ON public.achievements FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'faculty'::app_role));
CREATE POLICY "Admin can read all achievements" ON public.achievements FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read approved achievements" ON public.achievements FOR SELECT TO authenticated USING (status = 'approved');

-- Verification RLS
CREATE POLICY "Faculty can insert verifications" ON public.verifications FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'faculty'::app_role));
CREATE POLICY "Faculty can read verifications" ON public.verifications FOR SELECT TO authenticated USING (has_role(auth.uid(), 'faculty'::app_role));
CREATE POLICY "Students can read own verifications" ON public.verifications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.achievements WHERE achievements.id = achievement_id AND achievements.student_id = auth.uid()));
CREATE POLICY "Admin can read all verifications" ON public.verifications FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Notification RLS
CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Authenticated can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Storage bucket for certificates
INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', true);
CREATE POLICY "Authenticated can upload certificates" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'certificates');
CREATE POLICY "Anyone can read certificates" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'certificates');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.achievements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Engagement score function
CREATE OR REPLACE FUNCTION public.calculate_engagement_score(_student_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  score integer := 0;
  avg_marks numeric;
BEGIN
  SELECT COALESCE(SUM(
    CASE type
      WHEN 'Hackathon' THEN 30
      WHEN 'Internship' THEN 25
      WHEN 'Sports' THEN 20
      WHEN 'Workshop' THEN 15
      WHEN 'Cultural' THEN 10
      ELSE 10
    END
  ), 0) INTO score
  FROM achievements
  WHERE student_id = _student_id AND status = 'approved';

  SELECT AVG(CASE WHEN max_marks > 0 THEN (marks_obtained / max_marks) * 100 ELSE 0 END)
  INTO avg_marks
  FROM academic_records
  WHERE student_id = _student_id;

  IF avg_marks >= 90 THEN score := score + 20;
  ELSIF avg_marks >= 75 THEN score := score + 10;
  END IF;

  RETURN score;
END;
$$;

-- Leaderboard function
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE(student_id uuid, student_name text, course_name text, year integer, section_name text, score integer, course_id uuid, section_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as student_id,
    p.name as student_name,
    c.name as course_name,
    p.year,
    s.section_name,
    calculate_engagement_score(p.id) as score,
    p.course_id,
    p.section_id
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.id
  LEFT JOIN courses c ON c.id = p.course_id
  LEFT JOIN sections s ON s.id = p.section_id
  WHERE ur.role = 'student' AND p.is_blocked = false
  ORDER BY score DESC;
END;
$$;
