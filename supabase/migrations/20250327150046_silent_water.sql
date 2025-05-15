/*
  # Add Avatar URL to Users Table

  1. Changes
    - Add avatar_url column to users table
    - Add default avatar URL for users without a custom avatar
*/

-- Add avatar_url column to users table if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Set default avatar URL for existing users
UPDATE users 
SET avatar_url = 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=100'
WHERE avatar_url IS NULL;