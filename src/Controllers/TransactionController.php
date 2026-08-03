<?php

namespace App\Controllers;

use App\Core\Session;
use App\Models\Repositories\TemplateRepository;
use App\Models\Repositories\TransactionRepository;

class TransactionController extends Controller {
    public function find() {
        $this->requireAuth();

        $id = (int) ($_GET['id'] ?? 0);
        $repository = new TransactionRepository;

        $transaction = $repository->find([
            'id' => $id,
            'user_id' => Session::get('user_id')
        ]);

        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($transaction);
    }

    public function store() {
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
            redirect();
            exit;
        }

        $this->requireAuth();

        $data = $this->normalizeData($_POST);
        $repository = new TransactionRepository;

        // Verifica se um template previsto ja foi convertido nesta data
        if (empty($data['id']) && !empty($data['template_id']) && !empty($data['occurrence_date'])) {
            // Carrega a transacao existente para evitar duplicidade de previsoes salvas
            $existing = $repository->find([
                'user_id' => Session::get('user_id'),
                'template_id' => $data['template_id'],
                'occurrence_date' => $data['occurrence_date']
            ]);

            // Verifica se a previsao ja possui uma transacao real
            if ($existing) {
                // Define a transacao existente como alvo da gravacao
                $data['id'] = (int) $existing['id'];
            }
        }

        $repository->save($data);

        redirect();
        exit;
    }

    /**
     * Exclui uma transação pertencente ao usuário autenticado.
     */
    public function delete() {
        // Verifica se a exclusão foi solicitada por POST
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
            // Interrompe requisições feitas por outros métodos
            redirect();
            exit;
        }

        // Verifica se o usuário possui uma sessão autenticada
        $this->requireAuth();

        // Define o identificador recebido pelo formulário
        $id = (int) ($_POST['id'] ?? 0);

        // Verifica se o identificador é válido
        if ($id > 0) {
            // Exclui somente a transação pertencente ao usuário atual
            (new TransactionRepository)->delete($id, [
                'user_id' => Session::get('user_id')
            ]);
        }

        redirect();
        exit;
    }

    protected function normalizeData(array $data) {
        $paid = !empty($data['paid']);
        $templateId = empty($data['template_id']) ? null : (int) $data['template_id'];
        $title = trim($data['title'] ?? '');
        $template = null;

        if ($templateId) {
            $template = (new TemplateRepository)->find([
                'id' => $templateId,
                'user_id' => Session::get('user_id')
            ]);
        }

        if ($title === '' && $template) {
            $title = trim($template['title'] ?? '');
        }

        $occurrenceDate = $data['occurrence_date'] ?? null;

        if (empty($occurrenceDate) && !empty($template['month_day'])) {
            $occurrenceDate = $this->nextDateFromMonthDay((int) $template['month_day']);
        }

        return [
            'id' => empty($data['id']) ? null : (int) $data['id'],
            'user_id' => Session::get('user_id'),
            'wallet_id' => empty($data['wallet_id']) ? null : (int) $data['wallet_id'],
            'type' => in_array($data['type'] ?? null, ['I', 'E'], true) ? $data['type'] : null,
            'category_id' => empty($data['category_id']) ? null : (int) $data['category_id'],
            'entity_id' => empty($data['entity_id']) ? null : (int) $data['entity_id'],
            'template_id' => $templateId,
            'payment_method_id' => empty($data['payment_method_id']) ? null : (int) $data['payment_method_id'],
            'title' => $title,
            'paid' => $paid ? 1 : 0,
            'defines_cycle' => !empty($data['defines_cycle']) ? 1 : 0,
            'amount' => moneyToFloat($data['amount'] ?? '0'),
            'occurrence_date' => $occurrenceDate,
            'due_date' => empty($data['due_date']) ? null : $data['due_date'],
            'paid_at' => !$paid || empty($data['paid_at']) ? null : $data['paid_at'],
        ];
    }

    private function nextDateFromMonthDay(int $monthDay): string {
        $today = new \DateTimeImmutable('today');
        $day = max(1, min($monthDay, 31));
        $date = $this->dateInMonth($today, $day);

        if ($date < $today) {
            $date = $this->dateInMonth($today->modify('first day of next month'), $day);
        }

        return $date->format('Y-m-d');
    }

    private function dateInMonth(\DateTimeImmutable $baseDate, int $day): \DateTimeImmutable {
        $lastDay = (int) $baseDate->format('t');
        $safeDay = min($day, $lastDay);

        return $baseDate->setDate((int) $baseDate->format('Y'), (int) $baseDate->format('m'), $safeDay);
    }
}
