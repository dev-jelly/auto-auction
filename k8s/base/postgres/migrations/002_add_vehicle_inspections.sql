-- Migration 002: Add vehicle inspections table
-- Safe to run multiple times (IF NOT EXISTS / IF EXISTS guards)

BEGIN;

-- 1. Create vehicle_inspections table
CREATE TABLE IF NOT EXISTS vehicle_inspections (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    inspection_date DATE,
    vin VARCHAR(30),
    displacement INTEGER,
    mileage_at_inspection INTEGER,
    color VARCHAR(30),
    drive_type VARCHAR(20),
    report_data JSONB NOT NULL,
    report_url TEXT,
    scraped_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT vehicle_inspections_vehicle_id_key UNIQUE (vehicle_id)
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_vehicle_id
    ON vehicle_inspections(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_report_data
    ON vehicle_inspections USING GIN (report_data);

-- 3. Trigger for updated_at (reuses existing function from init.sql)
DROP TRIGGER IF EXISTS update_vehicle_inspections_updated_at ON vehicle_inspections;
CREATE TRIGGER update_vehicle_inspections_updated_at
    BEFORE UPDATE ON vehicle_inspections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
