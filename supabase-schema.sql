-- ============================================
-- Mirpurkhas Gaming Zone - Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Equipment table (dynamic, scalable)
CREATE TABLE equipment (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ps5', 'steering_wheel', 'custom')),
  base_slot_minutes INTEGER NOT NULL DEFAULT 60,
  max_slot_multiplier INTEGER NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Equipment prices
CREATE TABLE equipment_prices (
  id SERIAL PRIMARY KEY,
  equipment_type TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  actual_price INTEGER NOT NULL DEFAULT 0,
  week_discount_price INTEGER NOT NULL DEFAULT 0,
  month_discount_price INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(equipment_type, duration_minutes)
);

-- Soft drinks menu
CREATE TABLE soft_drinks (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  size TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chips menu
CREATE TABLE chips (
  id SERIAL PRIMARY KEY,
  brand TEXT NOT NULL,
  variant TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bookings
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  cell_no TEXT NOT NULL,
  equipment_id INTEGER NOT NULL REFERENCES equipment(id),
  slot_date DATE NOT NULL,
  slot_start_time TIME NOT NULL,
  slot_end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price_tier TEXT NOT NULL DEFAULT 'actual' CHECK (price_tier IN ('actual', 'week_discount', 'month_discount')),
  equipment_price INTEGER NOT NULL DEFAULT 0,
  addons_total INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0,
  advance_amount INTEGER NOT NULL DEFAULT 0,
  remaining_amount INTEGER NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'in_progress', 'completed', 'cancelled')),
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  whatsapp_sent BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Booking add-ons
CREATE TABLE booking_addons (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  addon_type TEXT NOT NULL CHECK (addon_type IN ('soft_drink', 'chips')),
  addon_name TEXT NOT NULL,
  addon_detail TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL DEFAULT 0,
  total_price INTEGER NOT NULL DEFAULT 0
);

-- App settings (key-value)
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX idx_bookings_date ON bookings(slot_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_equipment ON bookings(equipment_id);
CREATE INDEX idx_bookings_date_equipment ON bookings(slot_date, equipment_id);
CREATE INDEX idx_booking_addons_booking ON booking_addons(booking_id);

-- ============================================
-- SEED DATA
-- ============================================

-- Equipment
INSERT INTO equipment (name, type, base_slot_minutes, max_slot_multiplier, sort_order) VALUES
  ('PS5 #1', 'ps5', 60, 2, 1),
  ('PS5 #2', 'ps5', 60, 2, 2),
  ('Steering Wheel', 'steering_wheel', 30, 2, 3);

-- Equipment Prices
INSERT INTO equipment_prices (equipment_type, duration_minutes, actual_price, week_discount_price, month_discount_price) VALUES
  ('ps5', 60, 700, 350, 490),
  ('ps5', 120, 1200, 600, 840),
  ('steering_wheel', 30, 400, 200, 280),
  ('steering_wheel', 60, 700, 350, 490);

-- Soft Drinks
INSERT INTO soft_drinks (name, size, price) VALUES
  ('Coca-Cola', '250ml', 50),
  ('Coca-Cola', '500ml', 100),
  ('Coca-Cola', '1 Liter', 150),
  ('Sprite', '250ml', 50),
  ('Sprite', '500ml', 100),
  ('Sprite', '1 Liter', 150),
  ('Sting', '250ml', 60),
  ('Sting', '500ml', 100);

-- Chips
INSERT INTO chips (brand, variant, price) VALUES
  ('Lays', 'Small', 20),
  ('Lays', 'Medium', 50),
  ('Lays', 'Large', 70),
  ('Kurkure', 'Small', 30),
  ('Kurkure', 'Medium', 50),
  ('Kurkure', 'Large', 100);

-- Default app settings
INSERT INTO app_settings (key, value) VALUES
  ('owner_phone', '"03063455727"'),
  ('owner_name', '"Roman Ali"'),
  ('business_name', '"Mirpurkhas Gaming Zone"'),
  ('opening_hour', '14'),
  ('closing_hour', '2'),
  ('week_discount_percent', '50'),
  ('month_discount_percent', '30');

-- ============================================
-- ROW LEVEL SECURITY (disable for simplicity)
-- ============================================
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE soft_drinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chips ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations (single-owner app, secured by PIN)
CREATE POLICY "Allow all" ON equipment FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON equipment_prices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON soft_drinks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON chips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON booking_addons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON app_settings FOR ALL USING (true) WITH CHECK (true);
