/*
  # Add email column to users table

  1. Changes
    - Add email column to users table
    - Make email column required and unique
    - Add email to existing users from auth.users

  2. Notes
    - Email is required and must be unique
    - Existing users will have their email populated from auth.users
*/

-- Add email column if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email text;

-- Update existing users with their email from auth.users
UPDATE public.users 
SET email = au.email 
FROM auth.users au
WHERE public.users.id = au.id;

-- Make email required and unique after populating data
ALTER TABLE public.users 
  ALTER COLUMN email SET NOT NULL,
  ADD CONSTRAINT users_email_unique UNIQUE (email);