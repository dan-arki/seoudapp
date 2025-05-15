/*
  # Fix Shared Orders RLS Policies

  1. Changes
    - Drop existing policies that cause recursion
    - Create new, simplified policies that avoid circular dependencies
    - Use direct user checks where possible instead of nested queries

  2. Security
    - Maintain same level of security with simpler policy logic
    - Ensure proper access control for all operations
*/

-- Drop existing policies safely
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

-- Create function to check if user is order owner
CREATE OR REPLACE FUNCTION is_shared_order_owner(order_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM shared_orders
    WHERE id = order_id AND created_by = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is order participant
CREATE OR REPLACE FUNCTION is_shared_order_participant(order_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM shared_order_participants
    WHERE shared_order_id = order_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate policies for shared_orders
CREATE POLICY "Users can view their created orders"
  ON shared_orders
  FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can view orders they participate in"
  ON shared_orders
  FOR SELECT
  USING (is_shared_order_participant(id));

CREATE POLICY "Users can create shared orders"
  ON shared_orders
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Order owner can update shared order"
  ON shared_orders
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Recreate policies for shared_order_participants
CREATE POLICY "Users can view participants of their orders"
  ON shared_order_participants
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    is_shared_order_owner(shared_order_id)
  );

CREATE POLICY "Users can join active orders"
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

CREATE POLICY "Order owner can manage participants"
  ON shared_order_participants
  FOR ALL
  USING (is_shared_order_owner(shared_order_id));

-- Recreate policies for shared_order_items
CREATE POLICY "Users can view items in their orders"
  ON shared_order_items
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    is_shared_order_participant(shared_order_id)
  );

CREATE POLICY "Users can manage their own items"
  ON shared_order_items
  FOR ALL
  USING (user_id = auth.uid());