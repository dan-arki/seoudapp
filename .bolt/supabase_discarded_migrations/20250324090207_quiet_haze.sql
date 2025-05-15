/*
  # Initial Schema for SeoudaApp

  1. New Tables
    - users (extends auth.users)
    - categories
    - products
    - packs
    - pack_products
    - orders
    - order_lines
    - payments
    - promo_codes

  2. Security
    - Enable RLS on all tables
    - Add policies for user access
    - Add policies for admin access

  3. Triggers
    - Stock management
    - Payment status updates
    - Promo code usage tracking
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  name text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Categories table
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(150) NOT NULL,
  description text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Products table
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(150) NOT NULL,
  description text,
  price decimal(10,2) NOT NULL CHECK (price >= 0),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  image_url text,
  stock int,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT positive_stock CHECK (stock IS NULL OR stock >= 0)
);

-- Packs table
CREATE TABLE packs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(150) NOT NULL,
  description text,
  price decimal(10,2) NOT NULL CHECK (price >= 0),
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Pack Products junction table
CREATE TABLE pack_products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pack_id uuid REFERENCES packs(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity int NOT NULL CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE(pack_id, product_id)
);

-- Orders table
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  order_date timestamptz DEFAULT now(),
  status varchar(50) NOT NULL CHECK (
    status IN (
      'pending_payment',
      'confirmed',
      'preparing',
      'shipped',
      'delivered',
      'cancelled'
    )
  ) DEFAULT 'pending_payment',
  order_type varchar(20) NOT NULL CHECK (
    order_type IN ('standard', 'shared')
  ) DEFAULT 'standard',
  total_amount decimal(10,2) NOT NULL CHECK (total_amount >= 0),
  delivery_address text NOT NULL,
  payment_method text,
  promo_code varchar(50),
  discount_amount decimal(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
  comments text,
  share_code uuid UNIQUE DEFAULT CASE WHEN order_type = 'shared' THEN uuid_generate_v4() ELSE NULL END,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order Lines table
CREATE TABLE order_lines (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  pack_id uuid REFERENCES packs(id) ON DELETE SET NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL CHECK (unit_price >= 0),
  created_at timestamptz DEFAULT now(),
  CHECK (
    (product_id IS NOT NULL AND pack_id IS NULL) OR
    (pack_id IS NOT NULL AND product_id IS NULL)
  )
);

-- Payments table
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  amount decimal(10,2) NOT NULL CHECK (amount > 0),
  payment_method varchar(50) NOT NULL,
  payment_date timestamptz DEFAULT now(),
  status varchar(20) NOT NULL CHECK (
    status IN ('pending', 'completed', 'failed', 'refunded')
  ) DEFAULT 'pending',
  transaction_id text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Promo Codes table
CREATE TABLE promo_codes (
  code varchar(50) PRIMARY KEY,
  discount_type varchar(10) NOT NULL CHECK (
    discount_type IN ('percentage', 'fixed_amount')
  ),
  discount_value decimal(10,2) NOT NULL CHECK (discount_value > 0),
  scope varchar(20) NOT NULL CHECK (
    scope IN ('global', 'category', 'product')
  ),
  target_category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  target_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  valid_from date NOT NULL,
  valid_to date NOT NULL,
  max_uses int,
  times_used int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (valid_from <= valid_to),
  CHECK (
    (scope = 'global' AND target_category_id IS NULL AND target_product_id IS NULL) OR
    (scope = 'category' AND target_category_id IS NOT NULL AND target_product_id IS NULL) OR
    (scope = 'product' AND target_product_id IS NOT NULL AND target_category_id IS NULL)
  )
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Create admin role
CREATE ROLE admin;

-- RLS Policies

-- Users policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Categories policies
CREATE POLICY "Anyone can read active categories"
  ON categories
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Products policies
CREATE POLICY "Anyone can read active products"
  ON products
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Packs policies
CREATE POLICY "Anyone can read active packs"
  ON packs
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Pack Products policies
CREATE POLICY "Anyone can read pack products"
  ON pack_products
  FOR SELECT
  TO authenticated
  USING (true);

-- Orders policies
CREATE POLICY "Users can read own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    id IN (
      SELECT order_id 
      FROM payments 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Order Lines policies
CREATE POLICY "Users can read own order lines"
  ON order_lines
  FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id 
      FROM orders 
      WHERE user_id = auth.uid()
    )
  );

-- Payments policies
CREATE POLICY "Users can read own payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create payments"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Promo Codes policies
CREATE POLICY "Anyone can read active promo codes"
  ON promo_codes
  FOR SELECT
  TO authenticated
  USING (
    is_active = true AND
    valid_from <= CURRENT_DATE AND
    valid_to >= CURRENT_DATE AND
    (max_uses IS NULL OR times_used < max_uses)
  );

-- Functions and Triggers

-- Function to update stock after order
CREATE OR REPLACE FUNCTION update_stock_after_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Update product stock if it's a product order
  IF NEW.product_id IS NOT NULL THEN
    UPDATE products
    SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id
    AND stock IS NOT NULL;
  END IF;
  
  -- Update pack products stock if it's a pack order
  IF NEW.pack_id IS NOT NULL THEN
    UPDATE products p
    SET stock = stock - (pp.quantity * NEW.quantity)
    FROM pack_products pp
    WHERE pp.pack_id = NEW.pack_id
    AND p.id = pp.product_id
    AND p.stock IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stock after order
CREATE TRIGGER update_stock_after_order
AFTER INSERT ON order_lines
FOR EACH ROW
EXECUTE FUNCTION update_stock_after_order();

-- Function to update order status based on payments
CREATE OR REPLACE FUNCTION update_order_status_after_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total paid amount for the order
  WITH total_paid AS (
    SELECT SUM(amount) as paid_amount
    FROM payments
    WHERE order_id = NEW.order_id
    AND status = 'completed'
  )
  UPDATE orders o
  SET status = CASE
    WHEN tp.paid_amount >= o.total_amount THEN 'confirmed'
    ELSE o.status
  END
  FROM total_paid tp
  WHERE o.id = NEW.order_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update order status after payment
CREATE TRIGGER update_order_status_after_payment
AFTER INSERT OR UPDATE OF status ON payments
FOR EACH ROW
EXECUTE FUNCTION update_order_status_after_payment();

-- Function to increment promo code usage
CREATE OR REPLACE FUNCTION increment_promo_code_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.promo_code IS NOT NULL THEN
    UPDATE promo_codes
    SET times_used = times_used + 1
    WHERE code = NEW.promo_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment promo code usage after order
CREATE TRIGGER increment_promo_code_usage
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION increment_promo_code_usage();

-- Function to validate stock before order
CREATE OR REPLACE FUNCTION validate_stock_before_order()
RETURNS TRIGGER AS $$
DECLARE
  available_stock INT;
  required_quantity INT;
  product_name TEXT;
BEGIN
  -- Check product stock if it's a product order
  IF NEW.product_id IS NOT NULL THEN
    SELECT stock, name INTO available_stock, product_name
    FROM products
    WHERE id = NEW.product_id;
    
    IF available_stock IS NOT NULL AND available_stock < NEW.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %: % available, % requested',
        product_name, available_stock, NEW.quantity;
    END IF;
  END IF;
  
  -- Check pack products stock if it's a pack order
  IF NEW.pack_id IS NOT NULL THEN
    FOR product_name, available_stock, required_quantity IN
      SELECT p.name, p.stock, (pp.quantity * NEW.quantity) as required
      FROM products p
      JOIN pack_products pp ON pp.product_id = p.id
      WHERE pp.pack_id = NEW.pack_id
      AND p.stock IS NOT NULL
    LOOP
      IF available_stock < required_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product % in pack: % available, % required',
          product_name, available_stock, required_quantity;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate stock before order
CREATE TRIGGER validate_stock_before_order
BEFORE INSERT ON order_lines
FOR EACH ROW
EXECUTE FUNCTION validate_stock_before_order();

-- Admin policies for full access
CREATE POLICY "Admin has full access to users"
  ON users
  TO admin
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin has full access to categories"
  ON categories
  TO admin
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin has full access to products"
  ON products
  TO admin
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin has full access to packs"
  ON packs
  TO admin
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin has full access to pack_products"
  ON pack_products
  TO admin
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin has full access to orders"
  ON orders
  TO admin
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin has full access to order_lines"
  ON order_lines
  TO admin
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin has full access to payments"
  ON payments
  TO admin
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin has full access to promo_codes"
  ON promo_codes
  TO admin
  USING (true)
  WITH CHECK (true);