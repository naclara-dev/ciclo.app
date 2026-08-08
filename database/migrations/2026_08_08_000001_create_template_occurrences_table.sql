-- up
CREATE TABLE template_occurrences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    template_id INT NOT NULL,
    transaction_id INT NULL,
    occurrence_date DATE NOT NULL,
    status ENUM('scheduled', 'converted', 'dismissed') NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY uq_template_occurrences_user_template_date (user_id, template_id, occurrence_date),
    INDEX idx_template_occurrences_transaction (transaction_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
);
INSERT INTO template_occurrences (
    user_id,
    template_id,
    transaction_id,
    occurrence_date,
    status
)
SELECT
    user_id,
    template_id,
    id,
    occurrence_date,
    'converted'
FROM transactions
WHERE template_id IS NOT NULL;
-- down
DROP TABLE IF EXISTS template_occurrences;