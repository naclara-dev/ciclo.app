<?php

namespace App\Models\Repositories;

use App\Models\Entities\Setting;

class SettingRepository extends Repository
{
    protected $table = 'settings';
    protected $entityClass = Setting::class;

    public function firstFromUser(int $userId): array
    {
        $settings = $this->find([
            'user_id' => $userId
        ]);

        if ($settings) {
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
        ];
    }
}
