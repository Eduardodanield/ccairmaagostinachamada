
CREATE TABLE public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  user_name text NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  page_url text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert bug reports
CREATE POLICY "Authenticated users can insert bug reports"
ON public.bug_reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Directors can view all bug reports
CREATE POLICY "Directors can view all bug reports"
ON public.bug_reports FOR SELECT TO authenticated
USING (is_director());

-- Directors can update bug reports
CREATE POLICY "Directors can update bug reports"
ON public.bug_reports FOR UPDATE TO authenticated
USING (is_director());

-- Directors can delete bug reports
CREATE POLICY "Directors can delete bug reports"
ON public.bug_reports FOR DELETE TO authenticated
USING (is_director());
