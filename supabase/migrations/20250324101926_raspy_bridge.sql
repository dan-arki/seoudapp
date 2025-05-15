/*
  # Add Triggers for Shared Orders

  1. Changes
    - Add updated_at triggers for shared_orders and shared_order_items tables
    - Skip policy creation since they already exist
*/

-- Create updated_at triggers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_shared_orders_updated_at'
  ) THEN
    CREATE TRIGGER update_shared_orders_updated_at
      BEFORE UPDATE ON shared_orders
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_shared_order_items_updated_at'
  ) THEN
    CREATE TRIGGER update_shared_order_items_updated_at
      BEFORE UPDATE ON shared_order_items
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;