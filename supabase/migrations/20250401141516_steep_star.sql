/*
  # Fix cart_items table schema

  1. Changes
    - Drop existing pack_id and pack_price columns if they exist
    - Recreate pack_id and pack_price columns with correct constraints
    - Create index for pack_id
    - Add comments for clarity

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing columns and constraints safely
DO $$ BEGIN
  -- Drop foreign key constraint if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'cart_items_pack_id_fkey'
  ) THEN
    ALTER TABLE cart_items DROP CONSTRAINT cart_items_pack_id_fkey;
  END IF;

  -- Drop columns if they exist
  ALTER TABLE cart_items 
    DROP COLUMN IF EXISTS pack_id,
    DROP COLUMN IF EXISTS pack_price;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add columns with correct constraints
ALTER TABLE cart_items
  ADD COLUMN pack_id uuid REFERENCES packs(id) ON DELETE SET NULL,
  ADD COLUMN pack_price decimal(10,2);

-- Create index for better query performance
DROP INDEX IF EXISTS idx_cart_items_pack_id;
CREATE INDEX idx_cart_items_pack_id ON cart_items(pack_id);

-- Add helpful comments
COMMENT ON COLUMN cart_items.pack_id IS 'References the pack this item belongs to, if any';
COMMENT ON COLUMN cart_items.pack_price IS 'Stores the distributed pack price when item is part of a pack';