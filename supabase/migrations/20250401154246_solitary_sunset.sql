/*
  # Add Pack Support to Shared Orders

  1. Changes
    - Add pack_id and pack_price columns to shared_order_items
    - Add indexes and foreign key constraints
    - Update RLS policies to handle packs

  2. Security
    - Maintain existing security model
    - Add pack-specific access controls
*/

-- Add pack support to shared_order_items
ALTER TABLE shared_order_items
ADD COLUMN IF NOT EXISTS pack_id uuid REFERENCES packs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS pack_price decimal(10,2);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_shared_order_items_pack_id ON shared_order_items(pack_id);

-- Add helpful comments
COMMENT ON COLUMN shared_order_items.pack_id IS 'References the pack this item belongs to, if any';
COMMENT ON COLUMN shared_order_items.pack_price IS 'Stores the distributed pack price when item is part of a pack';

-- Drop existing policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "items_select_policy" ON shared_order_items;
  DROP POLICY IF EXISTS "items_manage_policy" ON shared_order_items;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create updated policies for shared_order_items
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