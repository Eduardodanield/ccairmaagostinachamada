-- Drop existing restrictive policies on profiles
DROP POLICY IF EXISTS "Directors can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Directors can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Directors can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Directors can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Drop existing restrictive policies on user_roles
DROP POLICY IF EXISTS "Directors can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Directors can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Directors can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Directors can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

-- Create PERMISSIVE policies for profiles table

-- SELECT: Directors see all, users see only their own
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Directors can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_director());

-- INSERT: Only directors can insert profiles (or system via trigger)
CREATE POLICY "Directors can insert profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (public.is_director());

-- UPDATE: Directors can update all, users can update their own
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Directors can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_director());

-- DELETE: Only directors
CREATE POLICY "Directors can delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (public.is_director());

-- Create PERMISSIVE policies for user_roles table

-- SELECT: Directors see all, users see only their own role
CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Directors can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.is_director());

-- INSERT: Only directors can assign roles
CREATE POLICY "Directors can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.is_director());

-- UPDATE: Only directors can modify roles
CREATE POLICY "Directors can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.is_director());

-- DELETE: Only directors can remove roles
CREATE POLICY "Directors can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.is_director());