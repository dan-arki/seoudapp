/*
  # Fix Users Table RLS Policies

  1. Changes
    - Drop existing policies
    - Create new policies that allow:
      - Users to insert their own profile during registration
      - Users to read and update their own profile
      - Public access for registration
    - Ensure RLS is enabled

  2. Security
    - Users can only access their own data
    - Registration process can create new profiles
    - Maintain data privacy and security
*/

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read own data" ON users;
  DROP POLICY IF EXISTS "Users can update own data" ON users;
  DROP POLICY IF EXISTS "Users can insert own data" ON users;
  DROP POLICY IF EXISTS "Public can insert during registration" ON users;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new policies
CREATE POLICY "Public can insert during registration"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (
    -- Allow insert only if the id matches the authenticated user's id
    -- or if there's no authenticated user (during registration)
    (auth.uid() IS NULL) OR
    (auth.uid() = id)
  );

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO public
  USING (
    -- Users can read their own data
    auth.uid() = id
  );

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO public
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);