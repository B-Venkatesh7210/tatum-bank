-- Password-based auth (bcrypt hash)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

UPDATE users SET password_hash = '' WHERE password_hash IS NULL;
