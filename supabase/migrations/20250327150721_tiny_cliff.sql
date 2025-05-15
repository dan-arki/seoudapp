/*
  # Fix shared order relationships

  1. Changes
    - Drop and recreate foreign key constraints with correct names
    - Add missing indexes
    - Update RLS policies to use simpler conditions

  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control
*/

-- Drop existing foreign key constraints if they exist
DO $$ BEGIN
  ALTER TABLE shared_order_participants 
    DROP CONSTRAINT IF EXISTS shared_order_participants_user_id_fkey,
    DROP CONSTRAINT IF EXISTS shared_order_participants_shared_order_id_fkey;

  ALTER TABLE shared_order_items
    DROP CONSTRAINT IF EXISTS shared_order_items_user_id_fkey,
    DROP CONSTRAINT IF EXISTS shared_order_items_shared_order_id_fkey,
    DROP CONSTRAINT IF EXISTS shared_order_items_product_id_fkey;

  ALTER TABLE shared_orders
    DROP CONSTRAINT IF EXISTS shared_orders_created_by_fkey;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Recreate foreign key constraints with correct names
ALTER TABLE shared_orders
  ADD CONSTRAINT shared_orders_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES users(id);

ALTER TABLE shared_order_participants
  ADD CONSTRAINT shared_order_participants_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id),
  ADD CONSTRAINT shared_order_participants_shared_order_id_fkey
  FOREIGN KEY (shared_order_id)
  REFERENCES shared_orders(id) ON DELETE CASCADE;

ALTER TABLE shared_order_items
  ADD CONSTRAINT shared_order_items_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id),
  ADD CONSTRAINT shared_order_items_shared_order_id_fkey
  FOREIGN KEY (shared_order_id)
  REFERENCES shared_orders(id) ON DELETE CASCADE,
  ADD CONSTRAINT shared_order_items_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES products(id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_shared_order_participants_user_id
  ON shared_order_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_shared_order_participants_shared_order_id
  ON shared_order_participants(shared_order_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shared_order_participants_unique
  ON shared_order_participants(shared_order_id, user_id);

CREATE INDEX IF NOT EXISTS idx_shared_order_items_user_id
  ON shared_order_items(user_id);

CREATE INDEX IF NOT EXISTS idx_shared_order_items_shared_order_id
  ON shared_order_items(shared_order_id);

CREATE INDEX IF NOT EXISTS idx_shared_order_items_product_id
  ON shared_order_items(product_id);

-- Drop existing policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view shared orders they participate in" ON shared_orders;
  DROP POLICY IF EXISTS "Users can create shared orders" ON shared_orders;
  DROP POLICY IF EXISTS "Order owner can update shared order" ON shared_orders;
  DROP POLICY IF EXISTS "Users can view participants of their shared orders" ON shared_order_participants;
  DROP POLICY IF EXISTS "Order owner can manage participants" ON shared_order_participants;
  DROP POLICY IF EXISTS "Users can join shared orders" ON shared_order_participants;
  DROP POLICY IF EXISTS "Users can view items in their shared orders" ON shared_order_items;
  DROP POLICY IF EXISTS "Users can manage their own items" ON shared_order_items;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Recreate policies with simpler conditions
CREATE POLICY "Users can view shared orders they participate in"
  ON shared_orders
  FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM shared_order_participants
      WHERE shared_order_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create shared orders"
  ON shared_orders
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Order owner can update shared order"
  ON shared_orders
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can view participants"
  ON shared_order_participants
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM shared_orders
      WHERE id = shared_order_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can join orders"
  ON shared_order_participants
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM shared_orders
      WHERE id = shared_order_id AND status = 'active' AND expires_at > now()
    )
  );

CREATE POLICY "Order owner can manage participants"
  ON shared_order_participants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM shared_orders
      WHERE id = shared_order_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can view items"
  ON shared_order_items
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM shared_order_participants
      WHERE shared_order_id = shared_order_items.shared_order_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their items"
  ON shared_order_items
  FOR ALL
  USING (user_id = auth.uid());