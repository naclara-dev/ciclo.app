<?php

namespace App\Models\Repositories;

use App\Models\Entities\Transaction;

class TransactionRepository extends Repository
{
    protected $table = 'transactions';
    protected $entityClass = Transaction::class;

    public function sumPaidAmountFromUser(int $userId): float
    {
        $query = "SELECT COALESCE(SUM(CASE WHEN type = 'I' THEN amount ELSE -amount END), 0) FROM $this->table WHERE user_id = :user_id AND paid = 1";
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':user_id', $userId, \PDO::PARAM_INT);
        $stmt->execute();

        return (float) $stmt->fetchColumn();
    }

    public function findPreviousIncomeDate(int $userId, string $date, bool $includeDate = false): ?string
    {
        $operator = $includeDate ? '<=' : '<';
        // Carrega apenas entradas que definem fronteiras do ciclo financeiro
        $query = "SELECT MAX(occurrence_date) FROM $this->table WHERE user_id = :user_id AND type = 'I' AND defines_cycle = 1 AND occurrence_date $operator :date";
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':date', $date);
        $stmt->execute();

        $result = $stmt->fetchColumn();

        return $result ?: null;
    }

    public function findNextIncome(int $userId, string $date): ?array
    {
        // Carrega a proxima entrada que define uma fronteira do ciclo financeiro
        $query = "SELECT * FROM $this->table WHERE user_id = :user_id AND type = 'I' AND defines_cycle = 1 AND occurrence_date >= :date ORDER BY occurrence_date ASC LIMIT 1";
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':date', $date);
        $stmt->execute();

        $result = $stmt->fetch();

        return $result ?: null;
    }

    public function findNextIncomeAfter(int $userId, string $date): ?array
    {
        // Carrega a proxima entrada ancora posterior a data informada
        $query = "SELECT * FROM $this->table WHERE user_id = :user_id AND type = 'I' AND defines_cycle = 1 AND occurrence_date > :date ORDER BY occurrence_date ASC LIMIT 1";
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':date', $date);
        $stmt->execute();

        $result = $stmt->fetch();

        return $result ?: null;
    }

    public function existsFromTemplateOnDate(int $userId, int $templateId, string $occurrenceDate): bool
    {
        // Verifica se o template ja gerou uma transacao na data prevista
        $query = "SELECT COUNT(id) FROM $this->table WHERE user_id = :user_id AND template_id = :template_id AND occurrence_date = :occurrence_date";
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':template_id', $templateId, \PDO::PARAM_INT);
        $stmt->bindValue(':occurrence_date', $occurrenceDate);
        $stmt->execute();

        return (int) $stmt->fetchColumn() > 0;
    }

    public function unlinkTemplateFromUser(int $userId, int $templateId): bool {
        // Define as transacoes geradas pelo template como lancamentos independentes
        $query = "UPDATE $this->table SET template_id = NULL WHERE user_id = :user_id AND template_id = :template_id";
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':template_id', $templateId, \PDO::PARAM_INT);

        return $stmt->execute();
    }

    public function sumAmountInCycle(int $userId, string $startDate, string $endDate): float
    {
        $query = "SELECT COALESCE(SUM(CASE WHEN type = 'I' THEN amount ELSE -amount END), 0) FROM $this->table WHERE user_id = :user_id AND occurrence_date >= :start_date AND occurrence_date < :end_date";
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':start_date', $startDate);
        $stmt->bindValue(':end_date', $endDate);
        $stmt->execute();

        return (float) $stmt->fetchColumn();
    }

    public function sumIncomeInCycle(int $userId, string $startDate, string $endDate): float
    {
        $query = "SELECT COALESCE(SUM(amount), 0) FROM $this->table WHERE user_id = :user_id AND type = 'I' AND occurrence_date >= :start_date AND occurrence_date < :end_date";
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':start_date', $startDate);
        $stmt->bindValue(':end_date', $endDate);
        $stmt->execute();

        return (float) $stmt->fetchColumn();
    }

    public function sumExpenseInCycle(int $userId, string $startDate, string $endDate): float
    {
        $query = "SELECT COALESCE(SUM(amount), 0) FROM $this->table WHERE user_id = :user_id AND type = 'E' AND occurrence_date >= :start_date AND occurrence_date < :end_date";
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':start_date', $startDate);
        $stmt->bindValue(':end_date', $endDate);
        $stmt->execute();

        return (float) $stmt->fetchColumn();
    }

    public function sumCommittedUntil(int $userId, string $startDate, string $endDate): float
    {
        $query = "SELECT COALESCE(SUM(amount), 0) FROM $this->table WHERE user_id = :user_id AND type = 'E' AND paid = 0 AND COALESCE(due_date, occurrence_date) >= :start_date AND COALESCE(due_date, occurrence_date) < :end_date";
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':start_date', $startDate);
        $stmt->bindValue(':end_date', $endDate);
        $stmt->execute();

        return (float) $stmt->fetchColumn();
    }

    public function markCycleAsPaid(int $userId, string $startDate, string $endDate, string $paidAt): int
    {
        // Define todas as transacoes pendentes do ciclo como pagas
        $query = "
            UPDATE $this->table
            SET paid = 1,
                paid_at = :paid_at
            WHERE user_id = :user_id
                AND occurrence_date >= :start_date
                AND occurrence_date < :end_date
                AND paid = 0
        ";
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':paid_at', $paidAt);
        $stmt->bindValue(':user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':start_date', $startDate);
        $stmt->bindValue(':end_date', $endDate);
        $stmt->execute();

        return $stmt->rowCount();
    }

    public function allInCycleFromUser(int $userId, string $startDate, string $endDate): array
    {
        $query = "
            SELECT
                transactions.*,
                categories.name AS category_name,
                categories.color AS category_color,
                categories.icon AS category_icon,
                wallets.name AS wallet_name,
                entities.name AS entity_name,
                templates.title AS template_title,
                payment_methods.name AS payment_method_name
            FROM $this->table
            LEFT JOIN categories ON categories.id = transactions.category_id
            LEFT JOIN wallets ON wallets.id = transactions.wallet_id
            LEFT JOIN entities ON entities.id = transactions.entity_id
            LEFT JOIN templates ON templates.id = transactions.template_id
            LEFT JOIN payment_methods ON payment_methods.id = transactions.payment_method_id
            WHERE transactions.user_id = :user_id
                AND transactions.occurrence_date >= :start_date
                AND transactions.occurrence_date < :end_date
            ORDER BY transactions.occurrence_date ASC, transactions.id ASC
        ";
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':start_date', $startDate);
        $stmt->bindValue(':end_date', $endDate);
        $stmt->execute();

        return $stmt->fetchAll();
    }
}
