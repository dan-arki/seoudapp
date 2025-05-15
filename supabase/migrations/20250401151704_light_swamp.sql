/*
  # Fix Auth Relationships for Shared Orders

  1. Changes
    - Drop and recreate foreign key constraints to properly reference auth.users
    - Add helper functions for accessing user metadata
    - Update RLS policies to use correct references

  2. Security
    - Maintain existing security policies
    - Ensure proper access control
*/

-- Drop existing foreign key constraints if they exist
DO $$ BEGIN
  ALTER TABLE shared_orders 
    DROP CONSTRAINT IF EXISTS shared_orders_created_by_fkey;

  ALTER TABLE shared_order_participants
    DROP CONSTRAINT IF EXISTS shared_order_participants_user_id_fkey;

  ALTER TABLE shared_order_items
    DROP CONSTRAINT IF EXISTS shared_order_items_user_id_fkey;
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

-- Create helper function to get user metadata
CREATE OR REPLACE FUNCTION get_auth_user_metadata(user_id uuid)
RETURNS jsonb AS $$
BEGIN
  RETURN (
    SELECT raw_user_meta_data
    FROM auth.users
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;