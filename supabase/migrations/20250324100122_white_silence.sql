/*
  # Add email column to users table

  1. Changes
    - Add `email` column to `users` table
    - Add unique constraint on email
    - Add index for faster email lookups

  2. Security
    - No changes to RLS policies needed
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'email'
  ) THEN
    ALTER TABLE users ADD COLUMN email text;
    ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
    CREATE INDEX users_email_idx ON users (email);
  END IF;
END $$;