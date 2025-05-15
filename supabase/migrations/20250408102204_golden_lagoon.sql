/*
  # Add Pack Customization Support

  1. Changes
    - Add is_fixed column to pack_products
    - Add pack_categories table for customizable categories
    - Update existing pack_products entries to be fixed by default

  2. Security
    - Maintain existing RLS policies
    - Add policies for pack categories
*/

-- Add is_fixed column to pack_products
ALTER TABLE pack_products
ADD COLUMN IF NOT EXISTS is_fixed boolean DEFAULT true;

-- Create pack_categories table
CREATE TABLE IF NOT EXISTS pack_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid REFERENCES packs(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id),
  products_count integer NOT NULL CHECK (products_count > 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE(pack_id, category_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pack_categories_pack_id ON pack_categories(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_categories_category_id ON pack_categories(category_id);

-- Enable RLS
ALTER TABLE pack_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin users can manage pack categories" ON pack_categories;
  DROP POLICY IF EXISTS "Anyone can read pack categories" ON pack_categories;
  DROP POLICY IF EXISTS "Anyone can read pack categories for active packs" ON pack_categories;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create policies for pack_categories
CREATE POLICY "Admin users can manage pack categories"
  ON pack_categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Anyone can read pack categories"
  ON pack_categories
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM packs
      WHERE id = pack_categories.pack_id
      AND is_active = true
    )
  );