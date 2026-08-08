-- up
ALTER TABLE settings
ADD COLUMN language VARCHAR(10) DEFAULT 'pt-br';

-- down
ALTER TABLE settings DROP COLUMN language;