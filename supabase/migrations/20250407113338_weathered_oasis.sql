/*
  # Add Delivery Addresses Support

  1. New Tables
    - `delivery_addresses`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `name` (text) - Address label (e.g., "Home", "Office")
      - `recipient_name` (text)
      - `street` (text)
      - `apartment` (text, nullable) - Apartment/Suite number
      - `floor` (text, nullable)
      - `building_code` (text, nullable)
      - `city` (text)
      - `postal_code` (text)
      - `phone` (text)
      - `instructions` (text, nullable) - Delivery instructions
      - `is_default` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for users to manage their addresses
*/

-- Create delivery_addresses table
CREATE TABLE delivery_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  recipient_name text NOT NULL,
  street text NOT NULL,
  apartment text,
  floor text,
  building_code text,
  city text NOT NULL,
  postal_code text NOT NULL,
  phone text NOT NULL,
  instructions text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE delivery_addresses ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER update_delivery_addresses_updated_at
  BEFORE UPDATE ON delivery_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_delivery_addresses_user_id ON delivery_addresses(user_id);

-- Create policies
CREATE POLICY "Users can view their own addresses"
  ON delivery_addresses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own addresses"
  ON delivery_addresses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own addresses"
  ON delivery_addresses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own addresses"
  ON delivery_addresses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to handle default address
CREATE OR REPLACE FUNCTION handle_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default THEN
    -- Set is_default to false for all other addresses of the same user
    UPDATE delivery_addresses
    SET is_default = false
    WHERE user_id = NEW.user_id
    AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for default address handling
CREATE TRIGGER set_default_address
  BEFORE INSERT OR UPDATE ON delivery_addresses
  FOR EACH ROW
  EXECUTE FUNCTION handle_default_address();