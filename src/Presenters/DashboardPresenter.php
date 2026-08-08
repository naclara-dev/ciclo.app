<?php

namespace App\Presenters;

use App\DTOs\Dashboard\Cycle;
use App\DTOs\Dashboard\Dashboard;

class DashboardPresenter {
    private $dashboard;

    public function __construct(?Dashboard $dashboard = null) {
        $this->dashboard = $dashboard;
    }

    public function present(): array {
        return [
            'balance' => $this->presentBalance(),
            'currentCycle' => $this->presentCycle($this->dashboard->currentCycle, false),
            'nextCycle' => $this->presentCycle($this->dashboard->nextCycle, true),
            'nextIncome' => $this->presentNextIncome(),
            'milestones' => $this->presentMilestones(),
        ];
    }

    private function presentBalance(): array {
        return [
            'current' => $this->dashboard->balance->current,
            'commited' => $this->dashboard->balance->commited,
            'spendable' => $this->dashboard->balance->spendable,
            'currentLabel' => $this->formatMoney($this->dashboard->balance->current),
            'commitedLabel' => $this->formatMoney($this->dashboard->balance->commited),
            'spendableLabel' => $this->formatMoney($this->dashboard->balance->spendable),
        ];
    }

    public function presentCycle(Cycle $cycle, bool $withHighlights = false): array {
        $transactions = $this->presentTransactions($cycle->transactions);

        return [
            'start' => $cycle->start,
            'end' => $cycle->end,
            'income' => $cycle->income,
            'expenses' => $cycle->expenses,
            'balance' => $cycle->balance,
            'progress' => $cycle->progress,
            'label' => $this->formatCycleLabel($cycle->start, $cycle->end),
            'startDayLabel' => (new \DateTimeImmutable($cycle->start))->format('d'),
            'incomeLabel' => '+' . $this->formatMoney($cycle->income),
            'expensesLabel' => '-' . $this->formatMoney($cycle->expenses),
            'balanceLabel' => $this->formatMoney($cycle->balance),
            'transactions' => $transactions,
            'entitySummary' => $this->summarizeExpenses($transactions, 'entity', 'name', 'sem entidade'),
            'categorySummary' => $this->summarizeExpenses($transactions, 'category', 'name', 'sem categoria'),
            'largestExpense' => $withHighlights ? $this->getLargestExpenseHighlight($transactions) : [],
            'attention' => $withHighlights ? $this->getAttentionHighlight($transactions, $cycle->openingBalance) : [],
        ];
    }

    private function summarizeExpenses(array $transactions, string $group, string $labelField, string $fallbackLabel): array {
        // Inicializa os totais agrupados das despesas
        $totals = [];

        // Percorre as transações apresentadas no ciclo
        foreach ($transactions as $transaction) {
            // Verifica se a transação não representa uma saída
            if (($transaction['type'] ?? null) !== 'E') {
                // Interrompe o processamento da transação atual
                continue;
            }

            // Define o valor da despesa (sempre positivo)
            $amount = (float) $transaction['amount'];

            // Define o nome utilizado para agrupar a despesa
            $label = $transaction[$group][$labelField] ?? $fallbackLabel;
            $label = $label ?: $fallbackLabel;

            // Calcula o total acumulado do grupo
            $totals[$label] = ($totals[$label] ?? 0) + $amount;
        }

        // Ordena os grupos do maior para o menor valor
        arsort($totals);

        // Calcula o total de despesas usado como base percentual
        $totalAmount = array_sum($totals);

        // Inicializa o resumo apresentado na dashboard
        $summary = [];

        // Percorre os totais para montar as linhas do resumo
        foreach ($totals as $label => $amount) {
            // Define os valores e a participação percentual do grupo
            $summary[] = [
                'label' => $label,
                'amount' => $amount,
                'amountLabel' => $this->formatMoney($amount),
                'percentage' => $totalAmount > 0
                    ? (int) round(($amount / $totalAmount) * 100)
                    : 0,
            ];
        }

        // Retorna o resumo ordenado das despesas
        return $summary;
    }

    private function presentNextIncome(): array {
        return [
            'date' => $this->dashboard->nextIncome->date,
            'amount' => $this->dashboard->nextIncome->amount,
            'dateLabel' => $this->formatShortDate($this->dashboard->nextIncome->date),
            'amountLabel' => $this->formatMoneyWithExplicitSignal($this->dashboard->nextIncome->amount),
        ];
    }

    private function presentMilestones(): array {
        return array_map(function ($milestone) {
            // Aplica o sinal apenas para fins de exibição mantendo o valor armazenado positivo
            $signedAmount = $milestone->type === 'I' ? $milestone->amount : -$milestone->amount;

            return [
                'title' => $milestone->title,
                'date' => $milestone->date,
                'amount' => $milestone->amount,
                'type' => $milestone->type,
                'dateLabel' => $this->formatShortDate($milestone->date),
                'amountLabel' => $this->formatMoneyWithExplicitSignal($signedAmount),
            ];
        }, $this->dashboard->milestones);
    }

    private function presentTransactions(array $transactions): array {
        return array_map(function ($transaction) {
            $amount = (float) $transaction['amount'];
            $type = $transaction['type'] ?? null;
            // Aplica o sinal apenas para a exibição mantendo o valor armazenado positivo
            $signedAmount = $type === 'I' ? $amount : -$amount;
            $categoryName = $transaction['category_name'] ?: 'sem categoria';
            $walletName = $transaction['wallet_name'] ?: 'sem wallet';
            $entityName = $transaction['entity_name'] ?: '';
            $templateName = $transaction['template_title'] ?: 'sem template';
            $paymentMethodName = $transaction['payment_method_name'] ?: 'escolha uma forma';

            $transaction['amount_label'] = $this->formatMoneyWithExplicitSignal($signedAmount);
            $transaction['form_amount_label'] = number_format($amount, 2, ',', '.');
            $transaction['date_label'] = $this->formatShortDate($transaction['occurrence_date']);
            // Define o status visual diferenciando lancamentos previstos dos reais
            $transaction['status_label'] = !empty($transaction['is_virtual'])
                ? 'previsto'
                : (!empty($transaction['paid']) ? 'pago' : 'pendente');
            $transaction['category'] = [
                'id' => $transaction['category_id'] ?: '',
                'name' => $categoryName,
                'color' => $transaction['category_color'] ?: 'var(--category-default)',
                'icon' => $transaction['category_icon'] ?: 'fa-solid fa-tag',
            ];
            $transaction['wallet'] = [
                'id' => $transaction['wallet_id'] ?: '',
                'name' => $walletName,
            ];
            $transaction['entity'] = [
                'id' => $transaction['entity_id'] ?: '',
                'name' => $entityName ?: 'escolha uma entidade',
            ];
            $transaction['template'] = [
                'id' => $transaction['template_id'] ?: '',
                'title' => $templateName,
            ];
            $transaction['payment_method'] = [
                'id' => $transaction['payment_method_id'] ?: '',
                'name' => $paymentMethodName,
            ];
            $transaction['meta_label'] = $entityName
                ? $categoryName . ' - ' . $entityName . ' - ' . $walletName
                : $categoryName . ' - ' . $walletName;
            // Define a origem visual usada pela dashboard e pelo modal
            $transaction['source'] = !empty($transaction['source']) ? $transaction['source'] : 'transaction';
            $transaction['is_virtual'] = !empty($transaction['is_virtual']);

            return $transaction;
        }, $transactions);
    }

    private function getLargestExpenseHighlight(array $transactions): array {
        $largestExpense = null;

        foreach ($transactions as $transaction) {
            if (($transaction['type'] ?? null) !== 'E') {
                continue;
            }

            if (!$largestExpense || (float) $transaction['amount'] > (float) $largestExpense['amount']) {
                $largestExpense = $transaction;
            }
        }

        if (!$largestExpense) {
            return [
                'title' => 'sem despesas previstas',
                'description' => 'nenhuma saida encontrada neste ciclo.',
            ];
        }

        $status = !empty($largestExpense['paid']) ? 'pagos' : 'previstos';

        return [
            'title' => $largestExpense['title'],
            'description' => $this->formatMoney((float) $largestExpense['amount']) . ' ' . $status . ' para ' . $largestExpense['date_label'] . '.',
        ];
    }

    private function getAttentionHighlight(array $transactions, float $openingBalance): array {
        if (empty($transactions)) {
            return [
                'title' => 'sem ponto de atencao',
                'description' => 'nao ha lancamentos suficientes para projetar aperto neste ciclo.',
            ];
        }

        $runningBalance = $openingBalance;
        $lowestBalance = $openingBalance;
        $lowestDate = $transactions[0]['date_label'];

        foreach ($transactions as $transaction) {
            // Entrada acrescenta ao saldo; saída debita
            $amount = (float) $transaction['amount'];
            $runningBalance += ($transaction['type'] ?? null) === 'I' ? $amount : -$amount;

            if ($runningBalance < $lowestBalance) {
                $lowestBalance = $runningBalance;
                $lowestDate = $transaction['date_label'];
            }
        }

        if ($lowestBalance < 0) {
            return [
                'title' => 'saldo fica negativo em ' . $lowestDate,
                'description' => 'Faltam ' . $this->formatMoney(abs($lowestBalance)) . ' para cobrir os lancamentos previstos.',
            ];
        }

        return [
            'title' => 'menor folga em ' . $lowestDate,
            'description' => 'evite gastos acima de ' . $this->formatMoney($lowestBalance) . ' antes desse marco.',
        ];
    }

    private function formatMoney(float $value): string {
        $signal = $value < 0 ? '-' : '';

        return $signal . 'R$ ' . number_format(abs($value), 2, ',', '.');
    }

    private function formatMoneyWithExplicitSignal(float $value): string {
        $signal = $value < 0 ? '-' : '+';

        return $signal . 'R$ ' . number_format(abs($value), 2, ',', '.');
    }

    private function formatCycleLabel(string $start, string $end): string {
        return $this->formatShortDate($start) . ' - ' . $this->formatShortDate($end);
    }

    private function formatShortDate(?string $date): string {
        if (empty($date)) {
            return '--';
        }

        $months = [
            '01' => 'jan',
            '02' => 'fev',
            '03' => 'mar',
            '04' => 'abr',
            '05' => 'mai',
            '06' => 'jun',
            '07' => 'jul',
            '08' => 'ago',
            '09' => 'set',
            '10' => 'out',
            '11' => 'nov',
            '12' => 'dez',
        ];

        $dateTime = new \DateTimeImmutable($date);

        return $dateTime->format('d') . ' ' . $months[$dateTime->format('m')];
    }
}
