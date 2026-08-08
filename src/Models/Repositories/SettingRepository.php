<?php

namespace App\Models\Repositories;

use App\Models\Entities\Setting;

class SettingRepository extends Repository
{
    protected $table = 'settings';
    protected $entityClass = Setting::class;

    public function firstFromUser(int $userId): array
    {
        // Carrega a configuração mais recente para evitar linhas antigas do mesmo usuário
        $stmt = $this->db->prepare("SELECT * FROM $this->table WHERE user_id = :user_id ORDER BY id DESC LIMIT 1");
        $stmt->bindValue(':user_id', $userId);
        $stmt->execute();

        // Define as configurações encontradas para o usuário autenticado
        $settings = $stmt->fetch();

        if ($settings) {
            // Retorna a configuração persistida no banco
            return $settings;
        }

        return [
            'id' => null,
            'user_id' => $userId,
            'default_payment_method_id' => null,
            'default_wallet_id' => null,
            'default_entity_id' => null,
            'default_type' => null,
            'cycle_starts_after_income' => 1,
            'dark_theme' => 0,
            'language' => 'pt-br',
        ];
    }
}
