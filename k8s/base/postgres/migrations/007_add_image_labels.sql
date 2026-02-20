-- Add image_labels column to vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS image_labels TEXT[];
