<?php

namespace App\Models\Repositories;

use App\Models\Entities\Frequency;

class FrequencyRepository extends Repository
{
    protected $table = 'frequencies';
    protected $entityClass = Frequency::class;

    public function findMonthly(): ?array {
        // Carrega a frequencia mensal usada pelos templates recorrentes
        $query = "SELECT * FROM $this->table WHERE unit = 'MONTH' LIMIT 1";
        $stmt = $this->db->prepare($query);
        $stmt->execute();

        $frequency = $stmt->fetch();

        return $frequency ?: null;
    }
}
