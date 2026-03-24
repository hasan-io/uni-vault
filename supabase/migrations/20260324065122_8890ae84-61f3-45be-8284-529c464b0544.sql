
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('student', 'faculty', 'admin');

-- Create attendance status enum
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late');

-- Departments
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Courses
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, department_id)
);

-- Sections
CREATE TABLE public.sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  section_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, year, section_name)
);

-- Profiles (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  department_id UUID REFERENCES public.departments(id),
  course_id UUID REFERENCES public.courses(id),
  section_id UUID REFERENCES public.sections(id),
  year INTEGER,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles per security best practices)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Subjects
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  faculty_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Academic records
CREATE TABLE public.academic_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  marks_obtained NUMERIC NOT NULL,
  max_marks NUMERIC NOT NULL,
  grade TEXT,
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Attendance
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  marked_by UUID NOT NULL REFERENCES auth.users(id),
  marked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_id, date)
);

-- Credential batches
CREATE TABLE public.credential_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  generated_by UUID NOT NULL REFERENCES auth.users(id),
  role_target app_role NOT NULL,
  course_id UUID REFERENCES public.courses(id),
  year INTEGER,
  section_id UUID REFERENCES public.sections(id),
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pdf_url TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credential_batches ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function to check if user is blocked
CREATE OR REPLACE FUNCTION public.is_blocked(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_blocked FROM public.profiles WHERE id = _user_id),
    false
  )
$$;

-- RLS Policies for departments (readable by all authenticated, writable by admin)
CREATE POLICY "Authenticated can read departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage departments" ON public.departments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for courses
CREATE POLICY "Authenticated can read courses" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage courses" ON public.courses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for sections
CREATE POLICY "Authenticated can read sections" ON public.sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage sections" ON public.sections FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Admin can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Faculty can read student profiles in their sections" ON public.profiles FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'faculty')
);
CREATE POLICY "Admin can manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Faculty can insert student profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'faculty'));
CREATE POLICY "Faculty can update student profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'faculty'));

-- RLS Policies for user_roles
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Faculty can insert student roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'faculty'));

-- RLS Policies for subjects
CREATE POLICY "Authenticated can read subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage subjects" ON public.subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for academic_records
CREATE POLICY "Students can read own records" ON public.academic_records FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Faculty can read records they recorded" ON public.academic_records FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'faculty'));
CREATE POLICY "Admin can read all records" ON public.academic_records FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Faculty can insert records" ON public.academic_records FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'faculty'));
CREATE POLICY "Faculty can update records" ON public.academic_records FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'faculty'));

-- RLS Policies for attendance
CREATE POLICY "Students can read own attendance" ON public.attendance FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Faculty can read attendance" ON public.attendance FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'faculty'));
CREATE POLICY "Admin can read all attendance" ON public.attendance FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Faculty can insert attendance" ON public.attendance FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'faculty'));
CREATE POLICY "Faculty can update attendance within 24h" ON public.attendance FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'faculty') AND marked_at > now() - interval '24 hours'
);

-- RLS Policies for credential_batches
CREATE POLICY "Admin can manage credential batches" ON public.credential_batches FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Faculty can manage own credential batches" ON public.credential_batches FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'faculty') AND generated_by = auth.uid()
) WITH CHECK (
  public.has_role(auth.uid(), 'faculty') AND generated_by = auth.uid()
);

-- Function to auto-calculate grade
CREATE OR REPLACE FUNCTION public.calculate_grade()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  percentage NUMERIC;
BEGIN
  IF NEW.max_marks > 0 THEN
    percentage := (NEW.marks_obtained / NEW.max_marks) * 100;
    IF percentage >= 90 THEN NEW.grade := 'A';
    ELSIF percentage >= 75 THEN NEW.grade := 'B';
    ELSIF percentage >= 60 THEN NEW.grade := 'C';
    ELSIF percentage >= 45 THEN NEW.grade := 'D';
    ELSE NEW.grade := 'F';
    END IF;
  ELSE
    NEW.grade := 'N/A';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_grade
BEFORE INSERT OR UPDATE ON public.academic_records
FOR EACH ROW EXECUTE FUNCTION public.calculate_grade();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.academic_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
