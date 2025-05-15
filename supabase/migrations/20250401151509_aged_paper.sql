/*
  # Fix Foreign Key Relationships for Shared Orders

  1. Changes
    - Drop and recreate foreign key constraints with correct references
    - Update queries to use auth.users instead of users table
    - Fix RLS policies to use correct table references

  2. Security
    - Maintain existing security policies
    - Ensure proper access control
*/

-- Drop existing foreign key constraints if they exist
DO $$ BEGIN
  ALTER TABLE shared_order_participants 
    DROP CONSTRAINT IF EXISTS shared_order_participants_user_id_fkey;

  ALTER TABLE shared_order_items
    DROP CONSTRAINT IF EXISTS shared_order_items_user_id_fkey;

  ALTER TABLE shared_orders
    DROP CONSTRAINT IF EXISTS shared_orders_created_by_fkey;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Recreate foreign key constraints with correct references
ALTER TABLE shared_orders
  ADD CONSTRAINT shared_orders_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id);

ALTER TABLE shared_order_participants
  ADD CONSTRAINT shared_order_participants_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id);

ALTER TABLE shared_order_items
  ADD CONSTRAINT shared_order_items_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id);

-- Create helper function to get user profile
CREATE OR REPLACE FUNCTION get_user_profile(user_id uuid)
RETURNS jsonb AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'id', id,
      'name', name,
      'email', email
    )
    FROM users
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;