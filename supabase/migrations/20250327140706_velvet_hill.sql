/*
  # Create Shared Orders Tables (Safe Migration)

  1. Changes
    - Add IF NOT EXISTS clauses to table creation
    - Add IF NOT EXISTS to policy creation
    - Add safe trigger creation
    - Ensure idempotent execution
*/

-- Create shared_orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS shared_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create shared_order_participants table if it doesn't exist
CREATE TABLE IF NOT EXISTS shared_order_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_order_id uuid NOT NULL REFERENCES shared_orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL DEFAULT 'participant' CHECK (role IN ('owner', 'participant')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(shared_order_id, user_id)
);

-- Create shared_order_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS shared_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_order_id uuid NOT NULL REFERENCES shared_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS (safe to run multiple times)
ALTER TABLE shared_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_order_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
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
  WHEN undefined_object THEN
    NULL;
END $$;

-- Recreate policies
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

-- Create triggers safely
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