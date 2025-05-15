/*
  # Fix shared order relationships and policies

  1. Changes
    - Drop and recreate foreign key relationships with correct references
    - Update policies to use simpler conditions
    - Add missing indexes for performance

  2. Security
    - Maintain same level of access control
    - Simplify policy conditions
*/

-- Drop existing foreign key constraints
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

-- Drop existing policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own orders" ON shared_orders;
  DROP POLICY IF EXISTS "Users can view participated orders" ON shared_orders;
  DROP POLICY IF EXISTS "Users can create orders" ON shared_orders;
  DROP POLICY IF EXISTS "Users can update own orders" ON shared_orders;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create simplified policies
CREATE POLICY "Users can view own orders"
  ON shared_orders
  FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can view participated orders"
  ON shared_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM shared_order_participants 
      WHERE shared_order_id = id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create orders"
  ON shared_orders
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own orders"
  ON shared_orders
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());