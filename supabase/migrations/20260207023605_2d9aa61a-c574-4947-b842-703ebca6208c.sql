-- Ensure RLS is enabled (should already be)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Grant the project owner (specific user) full access to PROFILES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Owner can manage all profiles'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Owner can manage all profiles"
      ON public.profiles
      FOR ALL
      TO authenticated
      USING (auth.uid() = 'eb6a082c-4e26-4bc5-a0c6-62b1bcef4d92')
      WITH CHECK (auth.uid() = 'eb6a082c-4e26-4bc5-a0c6-62b1bcef4d92');
    $pol$;
  END IF;
END
$$;

-- Grant the project owner (specific user) full access to USER_ROLES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_roles' 
      AND policyname = 'Owner can manage all roles'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Owner can manage all roles"
      ON public.user_roles
      FOR ALL
      TO authenticated
      USING (auth.uid() = 'eb6a082c-4e26-4bc5-a0c6-62b1bcef4d92')
      WITH CHECK (auth.uid() = 'eb6a082c-4e26-4bc5-a0c6-62b1bcef4d92');
    $pol$;
  END IF;
END
$$;
