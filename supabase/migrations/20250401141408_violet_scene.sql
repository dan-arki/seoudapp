/*
  # Add pack information to cart items

  1. Changes
    - Add pack_id column to reference the pack
    - Add pack_price column to store the distributed pack price
    - Add foreign key constraint to packs table

  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to cart_items table
ALTER TABLE cart_items
ADD COLUMN IF NOT EXISTS pack_id uuid REFERENCES packs(id),
ADD COLUMN IF NOT EXISTS pack_price decimal(10,2);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_cart_items_pack_id ON cart_items(pack_id);

-- Add comment to explain pack_price
COMMENT ON COLUMN cart_items.pack_price IS 'Stores the distributed pack price when item is part of a pack';