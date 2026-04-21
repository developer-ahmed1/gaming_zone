-- ============================================
-- Mirpurkhas Gaming Zone - Migration: Day Closings
-- Run this in Supabase SQL Editor (AFTER the initial schema)
-- This ONLY ADDS a new table, does NOT modify existing tables
-- ============================================

-- Day closings table (financial snapshots)
CREATE TABLE IF NOT EXISTS day_closings (
  id SERIAL PRIMARY KEY,
  business_date DATE NOT NULL UNIQUE,
  total_bookings INTEGER NOT NULL DEFAULT 0,
  equipment_revenue INTEGER NOT NULL DEFAULT 0,
  addons_revenue INTEGER NOT NULL DEFAULT 0,
  advance_collected INTEGER NOT NULL DEFAULT 0,
  balance_collected INTEGER NOT NULL DEFAULT 0,
  total_collected INTEGER NOT NULL DEFAULT 0,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_by TEXT DEFAULT 'owner'
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_day_closings_date ON day_closings(business_date);

-- Enable RLS (same pattern as other tables)
ALTER TABLE day_closings ENABLE ROW LEVEL SECURITY;

-- Allow all operations (single-owner app, secured by PIN)
CREATE POLICY "Allow all" ON day_closings FOR ALL USING (true) WITH CHECK (true);
