-- Create activities table for teacher schedule
CREATE TABLE public.activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id uuid REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
    teacher_id uuid NOT NULL,
    activity_date date NOT NULL,
    title text NOT NULL,
    description text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (classroom_id, activity_date)
);

-- Enable RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Directors can do everything
CREATE POLICY "Directors can manage all activities"
ON public.activities FOR ALL
USING (is_director())
WITH CHECK (is_director());

-- Teachers can view all activities
CREATE POLICY "Teachers can view all activities"
ON public.activities FOR SELECT
USING (is_teacher());

-- Teachers can insert their own activities
CREATE POLICY "Teachers can insert activities"
ON public.activities FOR INSERT
WITH CHECK (is_teacher() AND teacher_id = auth.uid());

-- Teachers can update their own activities
CREATE POLICY "Teachers can update own activities"
ON public.activities FOR UPDATE
USING (is_teacher() AND teacher_id = auth.uid());

-- Teachers can delete their own activities
CREATE POLICY "Teachers can delete own activities"
ON public.activities FOR DELETE
USING (is_teacher() AND teacher_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_activities_updated_at
BEFORE UPDATE ON public.activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.activities IS 'Cronograma de atividades dos professores';