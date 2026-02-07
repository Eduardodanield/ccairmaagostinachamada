-- Create app_role enum for role management
CREATE TYPE public.app_role AS ENUM ('director', 'teacher');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create classrooms table
CREATE TABLE public.classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create students table with soft delete
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    age INTEGER NOT NULL CHECK (age > 0 AND age < 100),
    classroom_id UUID REFERENCES public.classrooms(id) ON DELETE SET NULL,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance table
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    arrival_time TIME,
    is_present BOOLEAN NOT NULL DEFAULT false,
    hours_attended NUMERIC(4,2) NOT NULL DEFAULT 0,
    recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (student_id, date)
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is director
CREATE OR REPLACE FUNCTION public.is_director()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'director')
$$;

-- Create function to check if user is teacher
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'teacher')
$$;

-- Create function to check if user has any valid role
CREATE OR REPLACE FUNCTION public.is_authenticated_with_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_director() OR public.is_teacher()
$$;

-- RLS Policies for user_roles table
CREATE POLICY "Directors can view all roles" ON public.user_roles
    FOR SELECT USING (public.is_director());

CREATE POLICY "Directors can insert roles" ON public.user_roles
    FOR INSERT WITH CHECK (public.is_director());

CREATE POLICY "Directors can update roles" ON public.user_roles
    FOR UPDATE USING (public.is_director());

CREATE POLICY "Directors can delete roles" ON public.user_roles
    FOR DELETE USING (public.is_director());

CREATE POLICY "Users can view their own role" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for profiles table
CREATE POLICY "Directors can view all profiles" ON public.profiles
    FOR SELECT USING (public.is_director());

CREATE POLICY "Directors can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (public.is_director());

CREATE POLICY "Directors can update profiles" ON public.profiles
    FOR UPDATE USING (public.is_director());

CREATE POLICY "Directors can delete profiles" ON public.profiles
    FOR DELETE USING (public.is_director());

CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for classrooms table
CREATE POLICY "Authenticated users with role can view classrooms" ON public.classrooms
    FOR SELECT USING (public.is_authenticated_with_role());

CREATE POLICY "Directors can insert classrooms" ON public.classrooms
    FOR INSERT WITH CHECK (public.is_director());

CREATE POLICY "Directors can update classrooms" ON public.classrooms
    FOR UPDATE USING (public.is_director());

CREATE POLICY "Directors can delete classrooms" ON public.classrooms
    FOR DELETE USING (public.is_director());

-- RLS Policies for students table
CREATE POLICY "Authenticated users with role can view non-archived students" ON public.students
    FOR SELECT USING (public.is_authenticated_with_role());

CREATE POLICY "Directors can insert students" ON public.students
    FOR INSERT WITH CHECK (public.is_director());

CREATE POLICY "Directors can update students" ON public.students
    FOR UPDATE USING (public.is_director());

CREATE POLICY "Directors can delete students" ON public.students
    FOR DELETE USING (public.is_director());

-- RLS Policies for attendance table
CREATE POLICY "Directors can view all attendance" ON public.attendance
    FOR SELECT USING (public.is_director());

CREATE POLICY "Teachers can view all attendance" ON public.attendance
    FOR SELECT USING (public.is_teacher());

CREATE POLICY "Directors can insert attendance" ON public.attendance
    FOR INSERT WITH CHECK (public.is_director());

CREATE POLICY "Teachers can insert attendance" ON public.attendance
    FOR INSERT WITH CHECK (public.is_teacher() AND recorded_by = auth.uid());

CREATE POLICY "Directors can update attendance" ON public.attendance
    FOR UPDATE USING (public.is_director());

CREATE POLICY "Teachers can update their own attendance records" ON public.attendance
    FOR UPDATE USING (public.is_teacher() AND recorded_by = auth.uid());

CREATE POLICY "Directors can delete attendance" ON public.attendance
    FOR DELETE USING (public.is_director());

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classrooms_updated_at
    BEFORE UPDATE ON public.classrooms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at
    BEFORE UPDATE ON public.attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger function for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto profile creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create function to set fixed hours when marked present
CREATE OR REPLACE FUNCTION public.set_attendance_hours()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_present = true THEN
        NEW.hours_attended = 8.00;
    ELSE
        NEW.hours_attended = 0;
        NEW.arrival_time = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto hours assignment
CREATE TRIGGER set_attendance_hours_trigger
    BEFORE INSERT OR UPDATE ON public.attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.set_attendance_hours();