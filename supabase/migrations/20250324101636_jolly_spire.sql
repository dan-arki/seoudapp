/*
  # Create Shared Orders Tables

  1. New Tables
    - `shared_orders`
      - `id` (uuid, primary key)
      - `name` (text) - Name of the shared order
      - `created_by` (uuid) - User who created the order
      - `status` (text) - Status of the order (active, completed, cancelled)
      - `expires_at` (timestamptz) - When the shared order expires
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `shared_order_participants`
      - `id` (uuid, primary key)
      - `shared_order_id` (uuid) - Reference to shared_orders
      - `user_id` (uuid) - Reference to users
      - `role` (text) - Role in the order (owner, participant)
      - `created_at` (timestamptz)

    - `shared_order_items`
      - `id` (uuid, primary key)
      - `shared_order_id` (uuid) - Reference to shared_orders
      - `product_id` (uuid) - Reference to products
      - `user_id` (uuid) - User who added the item
      - `quantity` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
*/

-- Create shared_orders table
CREATE TABLE shared_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create shared_order_participants table
CREATE TABLE shared_order_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_order_id uuid NOT NULL REFERENCES shared_orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL DEFAULT 'participant' CHECK (role IN ('owner', 'participant')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(shared_order_id, user_id)
);

-- Create shared_order_items table
CREATE TABLE shared_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_order_id uuid NOT NULL REFERENCES shared_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE shared_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_order_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_order_items ENABLE ROW LEVEL SECURITY;

-- Policies for shared_orders
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

-- Policies for shared_order_participants
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

-- Policies for shared_order_items
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

-- Create updated_at triggers
CREATE TRIGGER update_shared_orders_updated_at
  BEFORE UPDATE ON shared_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shared_order_items_updated_at
  BEFORE UPDATE ON shared_order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();