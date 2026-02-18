-- Migration 001: Add source tracking and auction history
-- Safe to run multiple times (IF NOT EXISTS / IF EXISTS guards)

BEGIN;

-- 1. Add source tracking columns to vehicles table
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS source VARCHAR(30) DEFAULT 'automart',
  ADD COLUMN IF NOT EXISTS source_id VARCHAR(100);

-- 2. Backfill source_id for existing records
UPDATE vehicles SET source_id = CONCAT('automart:', mgmt_number) WHERE source_id IS NULL;

-- 3. Make source_id NOT NULL after backfill
ALTER TABLE vehicles ALTER COLUMN source_id SET NOT NULL;
ALTER TABLE vehicles ALTER COLUMN source SET NOT NULL;

-- 4. Add auction result fields
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS final_price BIGINT,
  ADD COLUMN IF NOT EXISTS result_status VARCHAR(30),
  ADD COLUMN IF NOT EXISTS result_date TIMESTAMP;

-- 5. Add court-auction specific fields (nullable)
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS case_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS court_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS property_type VARCHAR(30);

-- 6. Change unique constraint: (source, source_id) instead of mgmt_number
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_mgmt_number_key;
ALTER TABLE vehicles ADD CONSTRAINT vehicles_source_source_id_key
  UNIQUE (source, source_id);

-- 7. Create auction_history table
CREATE TABLE IF NOT EXISTS auction_history (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  auction_round INTEGER,
  listed_price BIGINT,
  min_bid_price BIGINT,
  final_price BIGINT,
  status VARCHAR(30) NOT NULL,
  bid_deadline TIMESTAMP,
  result_date TIMESTAMP,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_auction_history_vehicle_id ON auction_history(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_auction_history_status ON auction_history(status);
CREATE INDEX IF NOT EXISTS idx_auction_history_result_date ON auction_history(result_date);
CREATE INDEX IF NOT EXISTS idx_vehicles_source ON vehicles(source);
CREATE INDEX IF NOT EXISTS idx_vehicles_source_id ON vehicles(source_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_result_status ON vehicles(result_status);
CREATE INDEX IF NOT EXISTS idx_vehicles_case_number ON vehicles(case_number);

COMMIT;
