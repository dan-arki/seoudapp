/*
  # Fix shared orders policies to prevent infinite recursion

  1. Changes
    - Drop existing policies
    - Create new policies with optimized conditions to prevent recursion
    - Use direct conditions instead of nested EXISTS clauses where possible

  2. Security
    - Maintain same level of access control
    - Simplify policy conditions for better performance
*/

-- Drop existing policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view shared orders they participate in" ON shared_orders;
  DROP POLICY IF EXISTS "Users can view orders they participate in" ON shared_orders;
  DROP POLICY IF EXISTS "Users can view their created orders" ON shared_orders;
  DROP POLICY IF EXISTS "Users can create shared orders" ON shared_orders;
  DROP POLICY IF EXISTS "Order owner can update shared order" ON shared_orders;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new optimized policies for shared_orders
CREATE POLICY "Users can view own orders"
  ON shared_orders
  FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can view participated orders"
  ON shared_orders
  FOR SELECT
  USING (
    id IN (
      SELECT shared_order_id 
      FROM shared_order_participants 
      WHERE user_id = auth.uid()
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