-- Migration: Add custom macro targets to health_goals
-- Run this to add editable macro target columns

ALTER TABLE health_goals ADD COLUMN IF NOT EXISTS target_calories INTEGER;
ALTER TABLE health_goals ADD COLUMN IF NOT EXISTS target_protein INTEGER;
ALTER TABLE health_goals ADD COLUMN IF NOT EXISTS target_carbs INTEGER;
ALTER TABLE health_goals ADD COLUMN IF NOT EXISTS target_fat INTEGER;
