-- Migration: Add users table and update transcriptions
-- Date: 2025-10-09
-- Description: Add user authentication and multi-tenancy support

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    openai_api_key TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add user_id column to transcriptions table
ALTER TABLE transcriptions 
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id ON transcriptions(user_id);

-- Note: For existing transcriptions, you'll need to create a default user
-- or manually assign them to users. Example:
-- INSERT INTO users (email, name, hashed_password, is_active) 
-- VALUES ('admin@example.com', 'Admin', 'hashed_password_here', TRUE);
-- UPDATE transcriptions SET user_id = 1 WHERE user_id IS NULL;