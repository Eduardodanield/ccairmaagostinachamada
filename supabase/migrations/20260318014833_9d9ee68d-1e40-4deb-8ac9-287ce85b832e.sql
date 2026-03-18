-- Junction table for teacher-classroom assignments
CREATE TABLE public.teacher_classrooms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id uuid NOT NULL,
    classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (teacher_id, classroom_id)
);

ALTER TABLE public.teacher_classrooms ENABLE ROW LEVEL SECURITY;

-- Directors can manage all assignments
CREATE POLICY "Directors can manage teacher_classrooms"
ON public.teacher_classrooms
FOR ALL
TO authenticated
USING (public.is_director())
WITH CHECK (public.is_director());

-- Teachers can view their own assignments
CREATE POLICY "Teachers can view own assignments"
ON public.teacher_classrooms
FOR SELECT
TO authenticated
USING (teacher_id = auth.uid());
