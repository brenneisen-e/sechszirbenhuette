-- Migration: Add is_hero column to images table
-- Run with: wrangler d1 execute natbergerhuette-db --file=./migrations/001_add_is_hero.sql

-- Add is_hero column (0 = not hero, 1 = hero)
ALTER TABLE images ADD COLUMN is_hero INTEGER DEFAULT 0;

-- Create index for hero images
CREATE INDEX IF NOT EXISTS idx_images_is_hero ON images(is_hero);
