/*
  # Add image column to categories table

  1. Changes
    - Add `image_url` column to `categories` table
    - Update existing categories with default images
*/

-- Add image_url column to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url text;

-- Update existing categories with default images
UPDATE categories SET image_url = CASE
  WHEN name = 'Fruits' THEN 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?q=80&w=1000'
  WHEN name = 'Vegetables' THEN 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?q=80&w=1000'
  WHEN name = 'Bakery' THEN 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1000'
  WHEN name = 'Dairy' THEN 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?q=80&w=1000'
  ELSE 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000'
END;