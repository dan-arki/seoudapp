/*
  # Fix users table RLS policies

  1. Changes
    - Drop existing policies if they exist
    - Recreate policies with correct permissions
    - Ensure users can read and update their own data

  2. Security
    - Users can only read and update their own data
    - No other access is allowed
*/

-- Drop existing policies if they exist
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read own data" ON public.users;
  DROP POLICY IF EXISTS "Users can update own data" ON public.users;
  DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Recreate policies with correct permissions
CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own data"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);