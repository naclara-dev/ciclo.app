<?php

namespace App\Controllers;

use App\Core\Session;
use App\Models\Repositories\TemplateRepository;
use App\Models\Repositories\TransactionRepository;

class TemplateController extends Controller {
    public function find() {
        $this->requireAuth();

        $id = (int) ($_GET["id"] ?? 0);
        $repository = new TemplateRepository;

        $template = $repository->find([
            "id" => $id,
            "user_id" => Session::get('user_id')
        ]);

        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($template);
    }

    public function store() {
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
            redirect('manage/templates');
            exit;
        }

        $this->requireAuth();

        $data = $this->normalizeData($_POST);
        $repository = new TemplateRepository;
        $repository->save($data);

        redirect('manage/templates');
        exit;
    }

    public function delete() {
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
            redirect('manage/templates');
            exit;
        }
        
        $this->requireAuth();

        $id = (int) $_POST["id"];
        $userID = Session::get('user_id');
        $transactionRepository = new TransactionRepository;
        $transactionRepository->unlinkTemplateFromUser($userID, $id);

        $repository = new TemplateRepository;
        $repository->delete($id, [
            'user_id' => $userID
        ]);

        redirect('manage/templates');
        exit;
    }

    protected function normalizeData(array $data) {
        return [
            'id' => empty($data['id']) ? null : (int) $data['id'],
            'user_id' => Session::get('user_id'),
            'wallet_id' => empty($data['wallet_id']) ? null : (int) $data['wallet_id'],
            'category_id' => empty($data['category_id']) ? null : (int) $data['category_id'],
            'entity_id' => empty($data['entity_id']) ? null : (int) $data['entity_id'],
            'type' => in_array($data['type'] ?? null, ['I', 'E'], true) ? $data['type'] : null,
            'title' => trim($data['title'] ?? ''),
            'amount' => moneyToFloat($data['amount'] ?? '0'),
            'interval_value' => empty($data['interval_value']) ? 1 : (int) $data['interval_value'],
            'frequency_id' => empty($data['frequency_id']) ? null : (int) $data['frequency_id'],
            'month_day' => empty($data['month_day']) ? 1 : (int) $data['month_day'],
            'start_date' => $data['start_date'] ?? null,
            'end_date' => empty($data['end_date']) ? null : $data['end_date'],
            'next_run_date' => empty($data['next_run_date']) ? ($data['start_date'] ?? null) : $data['next_run_date'],
            'active' => !empty($data['active']) ? 1 : 0,
            'defines_cycle' => !empty($data['defines_cycle']) ? 1 : 0,
        ];
    }
}
