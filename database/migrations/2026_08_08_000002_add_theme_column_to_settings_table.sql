-- up
ALTER TABLE settings
ADD COLUMN dark_theme BOOLEAN DEFAULT 0;

-- down
ALTER TABLE settings DROP COLUMN dark_theme;