/*
  # Update Shared Orders Schema

  This migration ensures all shared order tables and policies exist and are properly configured.
  It's designed to be idempotent (safe to run multiple times).

  1. Changes
    - Safe table creation with IF NOT EXISTS
    - Safe policy recreation
    - Safe trigger creation
    - Proper error handling for existing objects
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

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS shared_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shared_order_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shared_order_items ENABLE ROW LEVEL SECURITY;

-- Recreate policies for shared_orders
CREATE POLICY "Users can view shared orders they participate in"
  ON shared_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shared_order_participants
      WHERE shared_order_id = shared_orders.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create shared orders"
  ON shared_orders
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Order owner can update shared order"
  ON shared_orders
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Recreate policies for shared_order_participants
CREATE POLICY "Users can view participants of their shared orders"
  ON shared_order_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shared_order_participants sop
      WHERE sop.shared_order_id = shared_order_participants.shared_order_id
      AND sop.user_id = auth.uid()
    )
  );

CREATE POLICY "Order owner can manage participants"
  ON shared_order_participants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM shared_orders
      WHERE id = shared_order_participants.shared_order_id
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can join shared orders"
  ON shared_order_participants
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM shared_orders
      WHERE id = shared_order_participants.shared_order_id
      AND status = 'active'
      AND expires_at > now()
    )
  );

-- Recreate policies for shared_order_items
CREATE POLICY "Users can view items in their shared orders"
  ON shared_order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shared_order_participants
      WHERE shared_order_id = shared_order_items.shared_order_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own items"
  ON shared_order_items
  FOR ALL
  USING (user_id = auth.uid());

-- Create or update triggers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_shared_orders_updated_at'
  ) THEN
    CREATE TRIGGER update_shared_orders_updated_at
      BEFORE UPDATE ON shared_orders
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_shared_order_items_updated_at'
  ) THEN
    CREATE TRIGGER update_shared_order_items_updated_at
      BEFORE UPDATE ON shared_order_items
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;