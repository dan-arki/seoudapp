/*
  # Fix Foreign Key Constraints for Shared Orders

  1. Changes
    - Drop existing foreign key constraints if they exist
    - Recreate foreign key constraints with correct names
    - Ensure all relationships are properly defined between tables

  2. Security
    - No changes to RLS policies needed
    - Existing security remains intact
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
  REFERENCES auth.users(id);

ALTER TABLE shared_order_participants
  ADD CONSTRAINT shared_order_participants_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id),
  ADD CONSTRAINT shared_order_participants_shared_order_id_fkey
  FOREIGN KEY (shared_order_id)
  REFERENCES shared_orders(id) ON DELETE CASCADE;

ALTER TABLE shared_order_items
  ADD CONSTRAINT shared_order_items_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id),
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

CREATE INDEX IF NOT EXISTS idx_shared_order_items_user_id
  ON shared_order_items(user_id);

CREATE INDEX IF NOT EXISTS idx_shared_order_items_shared_order_id
  ON shared_order_items(shared_order_id);

CREATE INDEX IF NOT EXISTS idx_shared_order_items_product_id
  ON shared_order_items(product_id);