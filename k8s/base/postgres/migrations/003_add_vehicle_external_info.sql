CREATE TABLE IF NOT EXISTS vehicle_external_info (
  id SERIAL PRIMARY KEY,
  car_number VARCHAR(20) NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  source VARCHAR(50) NOT NULL DEFAULT 'car365',
  fetched_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT vehicle_external_info_car_number_source_key UNIQUE (car_number, source)
);

CREATE INDEX IF NOT EXISTS idx_vehicles_car_number ON vehicles(car_number);
