/*
  # Fix Shared Orders Policies

  1. Changes
    - Drop existing policies safely
    - Recreate policies with correct permissions
    - Ensure proper access control for shared orders

  2. Security
    - Maintain same level of security
    - Use simpler policy conditions
*/

-- Drop existing policies safely
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view shared orders they participate in" ON shared_orders;
  DROP POLICY IF EXISTS "Users can view participated orders" ON shared_orders;
  DROP POLICY IF EXISTS "Users can create shared orders" ON shared_orders;
  DROP POLICY IF EXISTS "Users can create orders" ON shared_orders;
  DROP POLICY IF EXISTS "Order owner can update shared order" ON shared_orders;
  DROP POLICY IF EXISTS "Users can update own orders" ON shared_orders;
  DROP POLICY IF EXISTS "Users can view participants" ON shared_order_participants;
  DROP POLICY IF EXISTS "Users can view order participants" ON shared_order_participants;
  DROP POLICY IF EXISTS "Order owner can manage participants" ON shared_order_participants;
  DROP POLICY IF EXISTS "Users can join orders" ON shared_order_participants;
  DROP POLICY IF EXISTS "Users can join active orders" ON shared_order_participants;
  DROP POLICY IF EXISTS "Users can view items" ON shared_order_items;
  DROP POLICY IF EXISTS "Users can view order items" ON shared_order_items;
  DROP POLICY IF EXISTS "Users can manage their items" ON shared_order_items;
  DROP POLICY IF EXISTS "Users can manage own items" ON shared_order_items;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create simplified policies for shared_orders
CREATE POLICY "shared_orders_select_policy"
  ON shared_orders
  FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM shared_order_participants
      WHERE shared_order_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "shared_orders_insert_policy"
  ON shared_orders
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "shared_orders_update_policy"
  ON shared_orders
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Create simplified policies for shared_order_participants
CREATE POLICY "participants_select_policy"
  ON shared_order_participants
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM shared_orders
      WHERE id = shared_order_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "participants_insert_policy"
  ON shared_order_participants
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM shared_orders
      WHERE id = shared_order_id
      AND status = 'active'
      AND expires_at > now()
    )
  );

CREATE POLICY "participants_manage_policy"
  ON shared_order_participants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM shared_orders
      WHERE id = shared_order_id AND created_by = auth.uid()
    )
  );

-- Create simplified policies for shared_order_items
CREATE POLICY "items_select_policy"
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

CREATE POLICY "items_manage_policy"
  ON shared_order_items
  FOR ALL
  USING (user_id = auth.uid());