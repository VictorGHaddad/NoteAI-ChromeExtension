-- Add tags column to transcriptions table
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS tags TEXT;
