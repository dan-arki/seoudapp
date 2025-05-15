/*
  # Add Favorite Orders Support

  1. New Tables
    - `favorite_orders`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text) - Custom name for the favorite order
      - `items` (jsonb) - Stored cart items
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for users to manage their favorite orders
*/

-- Create favorite_orders table
CREATE TABLE favorite_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  items jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE favorite_orders ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER update_favorite_orders_updated_at
  BEFORE UPDATE ON favorite_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_favorite_orders_user_id ON favorite_orders(user_id);

-- Create policies
CREATE POLICY "Users can view their own favorite orders"
  ON favorite_orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create favorite orders"
  ON favorite_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorite orders"
  ON favorite_orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorite orders"
  ON favorite_orders
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);