<?php

namespace App\Models\Repositories;

class TemplateOccurrenceRepository extends Repository {
    protected $table = 'template_occurrences';

    public function existsHandledFromTemplateOnDate(int $userId, int $templateId, string $occurrenceDate): bool {
        // Verifica se a ocorrencia do template ja foi convertida ou descartada
        $query = "
            SELECT COUNT(id)
            FROM $this->table
            WHERE user_id = :user_id
                AND template_id = :template_id
                AND occurrence_date = :occurrence_date
                AND status IN ('converted', 'dismissed')
        ";
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':template_id', $templateId, \PDO::PARAM_INT);
        $stmt->bindValue(':occurrence_date', $occurrenceDate);
        $stmt->execute();

        return (int) $stmt->fetchColumn() > 0;
    }

    public function markConverted(int $userId, int $templateId, string $occurrenceDate, int $transactionId): bool {
        // Salva a ocorrencia como convertida em transacao real
        return $this->saveStatus($userId, $templateId, $occurrenceDate, 'converted', $transactionId);
    }

    public function markDismissed(int $userId, int $templateId, string $occurrenceDate, ?int $transactionId = null): bool {
        // Salva a ocorrencia como descartada pelo usuario
        return $this->saveStatus($userId, $templateId, $occurrenceDate, 'dismissed', $transactionId);
    }

    private function saveStatus(int $userId, int $templateId, string $occurrenceDate, string $status, ?int $transactionId): bool {
        // Define a ocorrencia unica do template para a data informada
        $query = "
            INSERT INTO $this->table (
                user_id,
                template_id,
                transaction_id,
                occurrence_date,
                status
            ) VALUES (
                :user_id,
                :template_id,
                :transaction_id,
                :occurrence_date,
                :status
            )
            ON DUPLICATE KEY UPDATE
                transaction_id = VALUES(transaction_id),
                status = VALUES(status),
                updated_at = CURRENT_TIMESTAMP
        ";
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':template_id', $templateId, \PDO::PARAM_INT);
        $stmt->bindValue(':occurrence_date', $occurrenceDate);
        $stmt->bindValue(':status', $status);

        // Verifica se existe uma transacao relacionada a ocorrencia
        if ($transactionId === null) {
            // Define a relacao como nula quando a transacao nao existe mais
            $stmt->bindValue(':transaction_id', null, \PDO::PARAM_NULL);
        } else {
            // Define a transacao real vinculada a ocorrencia
            $stmt->bindValue(':transaction_id', $transactionId, \PDO::PARAM_INT);
        }

        return $stmt->execute();
    }
}