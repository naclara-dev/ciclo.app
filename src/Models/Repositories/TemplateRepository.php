<?php

namespace App\Models\Repositories;

use App\Core\Session;
use App\Models\Entities\Template;

class TemplateRepository extends Repository {
    protected $entityClass = Template::class;
    protected $table = 'templates';

    protected $joins = [
        "LEFT JOIN wallets w ON w.id = templates.wallet_id",
        "LEFT JOIN categories c ON c.id = templates.category_id",
        "LEFT JOIN entities e ON e.id = templates.entity_id"
    ];

    protected $columns = "
        templates.*,
        w.id AS wallet_id,
        w.name AS wallet_name,
        w.type_id AS wallet_type_id,
        w.initial_balance AS wallet_initial_balance,
        w.active AS wallet_active,
        c.id AS category_id,
        c.name AS category_name,
        c.color AS category_color,
        c.icon AS category_icon,
        e.id AS entity_id,
        e.name AS entity_name,
        e.type_id AS entity_type_id
    ";

    public function allFromUser(): array {
        $filters = ['templates.user_id' => Session::get('user_id')];
        $rows = $this->all($filters, $this->joins, $this->columns);

        return array_map(function ($row) {
            $row = $this->withWallet($row);
            $row = $this->withCategory($row);
            $row = $this->withEntity($row);

            return $row;
        }, $rows);
    }

    public function allDueInCycleFromUser(int $userId, string $startDate, string $endDate): array {
        // Carrega templates ativos com proxima execucao dentro do ciclo atual
        $query = "
            SELECT
                templates.*,
                frequencies.unit AS frequency_unit
            FROM $this->table
            INNER JOIN frequencies ON frequencies.id = templates.frequency_id
            WHERE templates.user_id = :user_id
                AND templates.active = 1
                AND templates.next_run_date >= :start_date
                AND templates.next_run_date < :end_date
                AND (
                    templates.end_date IS NULL
                    OR templates.next_run_date <= templates.end_date
                )
            ORDER BY templates.next_run_date ASC, templates.id ASC
        ";

        // Inicializa a consulta dos templates pendentes
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':start_date', $startDate);
        $stmt->bindValue(':end_date', $endDate);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function allActiveExpensesFromUser(int $userId): array {
        // Carrega templates ativos de despesa para compor previsoes futuras
        $query = "
            SELECT *
            FROM $this->table
            WHERE user_id = :user_id
                AND active = 1
                AND type = 'E'
            ORDER BY month_day ASC, id ASC
        ";

        // Inicializa a consulta dos templates de despesa
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':user_id', $userId, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function allActiveScheduledFromUser(int $userId): array {
        // Carrega templates ativos com os relacionamentos usados na dashboard
        $query = "
            SELECT
                templates.*,
                w.name AS wallet_name,
                c.name AS category_name,
                c.color AS category_color,
                c.icon AS category_icon,
                e.name AS entity_name
            FROM $this->table
            LEFT JOIN wallets w ON w.id = templates.wallet_id
            LEFT JOIN categories c ON c.id = templates.category_id
            LEFT JOIN entities e ON e.id = templates.entity_id
            WHERE templates.user_id = :user_id
                AND templates.active = 1
            ORDER BY templates.month_day ASC, templates.id ASC
        ";

        // Inicializa a consulta dos templates previstos
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':user_id', $userId, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function updateNextRunDate(int $id, int $userId, string $nextRunDate): bool {
        // Salva a proxima data de execucao do template informado
        $query = "UPDATE $this->table SET next_run_date = :next_run_date WHERE id = :id AND user_id = :user_id";
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':next_run_date', $nextRunDate);
        $stmt->bindValue(':id', $id, \PDO::PARAM_INT);
        $stmt->bindValue(':user_id', $userId, \PDO::PARAM_INT);

        return $stmt->execute();
    }

    private function withWallet(array $row): array {
        $row["wallet"] = [
            "id" => $row["wallet_id"],
            "name" => $row["wallet_name"],
            "type_id" => $row["wallet_type_id"],
            "initial_balance" => $row["wallet_initial_balance"],
            "active" => $row["wallet_active"]
        ];

        unset(
            $row["wallet_id"],
            $row["wallet_name"],
            $row["wallet_type_id"],
            $row["wallet_initial_balance"],
            $row["wallet_active"]
        );

        return $row;
    }

    private function withCategory(array $row): array {
        $row["category"] = [
            "id" => $row["category_id"],
            "name" => $row["category_name"],
            "color" => $row["category_color"],
            "icon" => $row["category_icon"]
        ];

        unset(
            $row["category_id"],
            $row["category_name"],
            $row["category_color"],
            $row["category_icon"]
        );

        return $row;
    }

    private function withEntity(array $row): array {
        $row["entity"] = [
            "id" => $row["entity_id"],
            "name" => $row["entity_name"],
            "type_id" => $row["entity_type_id"]
        ];

        unset(
            $row["entity_id"],
            $row["entity_name"],
            $row["entity_type_id"]
        );

        return $row;
    }
}
