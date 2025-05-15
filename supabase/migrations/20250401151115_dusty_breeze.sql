/*
  # Fix Shared Orders Schema

  1. Changes
    - Add pack_id and pack_price columns to shared_order_items
    - Add proper foreign key constraints
    - Add indexes for better performance

  2. Security
    - No changes to RLS policies needed
*/

-- Add new columns to shared_order_items
ALTER TABLE shared_order_items
ADD COLUMN IF NOT EXISTS pack_id uuid REFERENCES packs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS pack_price decimal(10,2);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_shared_order_items_pack_id ON shared_order_items(pack_id);

-- Add helpful comments
COMMENT ON COLUMN shared_order_items.pack_id IS 'References the pack this item belongs to, if any';
COMMENT ON COLUMN shared_order_items.pack_price IS 'Stores the distributed pack price when item is part of a pack';