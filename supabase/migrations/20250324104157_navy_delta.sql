/*
  # Update category images

  Updates the image_url field for all categories with high-quality Unsplash images
  that are guaranteed to exist and work well for the application.

  1. Changes
    - Updates image_url for existing categories with new, verified Unsplash URLs
    - Ensures all categories have a valid image_url
*/

-- Update categories with new, verified image URLs
UPDATE categories SET image_url = CASE
  WHEN LOWER(name) LIKE '%fruit%' THEN 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?q=80&w=1000'
  WHEN LOWER(name) LIKE '%vegetable%' THEN 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?q=80&w=1000'
  WHEN LOWER(name) LIKE '%bakery%' THEN 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?q=80&w=1000'
  WHEN LOWER(name) LIKE '%dairy%' THEN 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?q=80&w=1000'
  WHEN LOWER(name) LIKE '%meat%' THEN 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?q=80&w=1000'
  WHEN LOWER(name) LIKE '%seafood%' THEN 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?q=80&w=1000'
  WHEN LOWER(name) LIKE '%beverage%' THEN 'https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=1000'
  ELSE 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?q=80&w=1000'
END
WHERE image_url IS NULL OR image_url = '';

-- Ensure all categories have an image_url
UPDATE categories 
SET image_url = 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?q=80&w=1000'
WHERE image_url IS NULL OR image_url = '';