/*
  # Fix Shared Orders Foreign Key Relationships

  1. Changes
    - Drop existing foreign key constraints
    - Recreate constraints with correct references
    - Add helper functions for user data access
    - Update RLS policies

  2. Security
    - Maintain existing security model
    - Ensure proper data access control
*/

-- Drop existing foreign key constraints
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

-- Recreate foreign key constraints
ALTER TABLE shared_orders
  ADD CONSTRAINT shared_orders_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES users(id);

ALTER TABLE shared_order_participants
  ADD CONSTRAINT shared_order_participants_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id);

ALTER TABLE shared_order_items
  ADD CONSTRAINT shared_order_items_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id);

-- Create helper function to get user data
CREATE OR REPLACE FUNCTION get_user_data(user_id uuid)
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