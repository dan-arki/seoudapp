/*
  # Create Test Shared Order

  1. Changes
    - Insert a test shared order
    - Add test participants
    - Add test items
*/

-- Insert test shared order
INSERT INTO shared_orders (
  id,
  name,
  created_by,
  status,
  expires_at
) VALUES (
  '12345678-1234-5678-1234-567812345678',
  'Test Shared Order',
  (SELECT id FROM users LIMIT 1),
  'active',
  (now() + interval '24 hours')
);

-- Add creator as participant
INSERT INTO shared_order_participants (
  shared_order_id,
  user_id,
  role
) VALUES (
  '12345678-1234-5678-1234-567812345678',
  (SELECT id FROM users LIMIT 1),
  'owner'
);

-- Add some test items
INSERT INTO shared_order_items (
  shared_order_id,
  product_id,
  user_id,
  quantity
) VALUES (
  '12345678-1234-5678-1234-567812345678',
  (SELECT id FROM products LIMIT 1),
  (SELECT id FROM users LIMIT 1),
  2
);