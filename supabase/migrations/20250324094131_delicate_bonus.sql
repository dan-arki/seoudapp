/*
  # Initial Schema Setup for SeoudaApp

  1. New Tables
    - categories
      - id (UUID, primary key)
      - name (text)
      - description (text, nullable)
      - display_order (integer)
      - is_active (boolean)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - products
      - id (UUID, primary key)
      - name (text)
      - description (text, nullable)
      - price (decimal)
      - category_id (UUID, foreign key to categories)
      - image_url (text, nullable)
      - stock (integer, nullable)
      - is_active (boolean)
      - created_at (timestamp)
      - updated_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read active products and categories
*/

-- Create categories table
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  category_id uuid REFERENCES categories(id),
  image_url text,
  stock integer,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policies for categories
CREATE POLICY "Anyone can read active categories"
  ON categories
  FOR SELECT
  USING (is_active = true);

-- Create policies for products
CREATE POLICY "Anyone can read active products"
  ON products
  FOR SELECT
  USING (is_active = true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data
INSERT INTO categories (name, description, display_order) VALUES
  ('Fruits', 'Fresh seasonal fruits', 1),
  ('Vegetables', 'Fresh organic vegetables', 2),
  ('Bakery', 'Freshly baked goods', 3),
  ('Dairy', 'Fresh dairy products', 4);

INSERT INTO products (name, description, price, category_id, image_url, stock) 
SELECT 
  'Fresh Apples',
  'Crisp and sweet apples from local orchards',
  4.99,
  id,
  'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6',
  100
FROM categories WHERE name = 'Fruits';

INSERT INTO products (name, description, price, category_id, image_url, stock) 
SELECT 
  'Organic Carrots',
  'Fresh organic carrots, perfect for salads and cooking',
  2.99,
  id,
  'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37',
  150
FROM categories WHERE name = 'Vegetables';

INSERT INTO products (name, description, price, category_id, image_url, stock) 
SELECT 
  'Sourdough Bread',
  'Artisanal sourdough bread baked fresh daily',
  6.99,
  id,
  'https://images.unsplash.com/photo-1585478259715-876acc5be8eb',
  50
FROM categories WHERE name = 'Bakery';

INSERT INTO products (name, description, price, category_id, image_url, stock) 
SELECT 
  'Fresh Milk',
  'Local farm fresh whole milk',
  3.99,
  id,
  'https://images.unsplash.com/photo-1550583724-b2692b85b150',
  200
FROM categories WHERE name = 'Dairy';