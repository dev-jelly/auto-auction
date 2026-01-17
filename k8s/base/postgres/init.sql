-- Auto Auction Database Schema

CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    mgmt_number VARCHAR(50) UNIQUE NOT NULL,
    car_number VARCHAR(20),
    manufacturer VARCHAR(50),
    model_name VARCHAR(100),
    fuel_type VARCHAR(20),
    transmission VARCHAR(20),
    year INTEGER,
    mileage INTEGER,
    price BIGINT,
    min_bid_price BIGINT,
    location VARCHAR(100),
    organization VARCHAR(100),
    due_date TIMESTAMP,
    auction_count INTEGER,
    status VARCHAR(20) DEFAULT '입찰중',
    image_urls TEXT[],
    detail_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_year ON vehicles(year);
CREATE INDEX IF NOT EXISTS idx_vehicles_price ON vehicles(price);
CREATE INDEX IF NOT EXISTS idx_vehicles_due_date ON vehicles(due_date);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_manufacturer ON vehicles(manufacturer);
CREATE INDEX IF NOT EXISTS idx_vehicles_model ON vehicles(model_name);
CREATE INDEX IF NOT EXISTS idx_vehicles_fuel_type ON vehicles(fuel_type);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
