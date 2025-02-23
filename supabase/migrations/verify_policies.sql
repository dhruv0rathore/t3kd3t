-- First, verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'projects';

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'projects';

-- Recreate policies if needed
DROP POLICY IF EXISTS "Enable read for users based on user_id" ON public.projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.projects;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.projects;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.projects;

-- Create more permissive policies for testing
CREATE POLICY "Enable read for users based on user_id" ON public.projects
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.projects
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users based on user_id" ON public.projects
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for users based on user_id" ON public.projects
    FOR DELETE USING (auth.uid() = user_id); 