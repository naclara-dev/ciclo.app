<?php 

namespace App\Controllers;

use App\Core\Session;
use App\Models\Repositories\EntityRepository;
use App\Models\Repositories\PaymentMethodRepository;
use App\Models\Repositories\SettingRepository;
use App\Models\Repositories\UserRepository;
use App\Models\Repositories\WalletRepository;

class SettingsController extends Controller {
    public function index() {
        $this->requireAuth();

        // Define o usuário autenticado e carrega o feedback temporário da conta
        $userId = (int) Session::get('user_id');
        $accountFeedback = Session::get('account_feedback');

        // Remove o feedback após disponibilizá-lo para a próxima renderização
        Session::remove('account_feedback');

        $this->view('settings.twig', [
            'settings' => (new SettingRepository)->firstFromUser($userId),
            'payment_methods' => (new PaymentMethodRepository)->all(),
            'wallets' => (new WalletRepository)->allFromUser(),
            'entities' => (new EntityRepository)->allFromUser(),
            'user' => (new UserRepository)->find([
                'id' => $userId
            ]),
            'account_feedback' => $accountFeedback,
        ]);
    }

    public function store() {
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
            redirect('settings');
            exit;
        }

        $this->requireAuth();

        $data = $this->normalizeData($_POST);
        $repository = new SettingRepository;
        $repository->save($data);

        redirect('settings');
        exit;
    }

    protected function normalizeData(array $data) {
        $repository = new SettingRepository;
        $current = $repository->firstFromUser((int) Session::get('user_id'));

        return [
            'id' => empty($data['id']) ? null : (int) $data['id'],
            'user_id' => Session::get('user_id'),
            'default_payment_method_id' => $this->normalizeOptionalInteger($data, $current, 'default_payment_method_id'),
            'default_wallet_id' => $this->normalizeOptionalInteger($data, $current, 'default_wallet_id'),
            'default_entity_id' => $this->normalizeOptionalInteger($data, $current, 'default_entity_id'),
            'default_type' => $this->normalizeOptionalEnum($data, $current, 'default_type', ['I', 'E']),
            'cycle_starts_after_income' => array_key_exists('cycle_starts_after_income', $data)
                ? (!empty($data['cycle_starts_after_income']) ? 1 : 0)
                : (int) ($current['cycle_starts_after_income'] ?? 1),
            'dark_theme' => array_key_exists('dark_theme', $data)
                ? (!empty($data['dark_theme']) ? 1 : 0)
                : (int) ($current['dark_theme'] ?? 0),
        ];
    }

    private function normalizeOptionalInteger(array $data, array $current, string $field) {
        if (!array_key_exists($field, $data)) {
            return $current[$field] ?? null;
        }

        return empty($data[$field]) ? null : (int) $data[$field];
    }

    private function normalizeOptionalEnum(array $data, array $current, string $field, array $allowed) {
        if (!array_key_exists($field, $data)) {
            return $current[$field] ?? null;
        }

        return in_array($data[$field], $allowed, true) ? $data[$field] : null;
    }
}
