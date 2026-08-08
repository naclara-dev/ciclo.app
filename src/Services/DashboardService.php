<?php

namespace App\Services;

use App\Core\Session;
use App\DTOs\Dashboard\Balance;
use App\DTOs\Dashboard\Cycle;
use App\DTOs\Dashboard\Dashboard;
use App\DTOs\Dashboard\Milestone;
use App\DTOs\Dashboard\NextIncome;
use App\Models\Repositories\SettingRepository;
use App\Models\Repositories\TransactionRepository;
use App\Models\Repositories\TemplateRepository;
use App\Models\Repositories\TemplateOccurrenceRepository;
use App\Models\Repositories\WalletRepository;

class DashboardService {
    private $userID;
    private $transactions;
    private $templates;
    private $templateOccurrences;
    private $wallets;
    private $settings;

    public function __construct() {
        $this->userID = (int) Session::get('user_id');
        $this->transactions = new TransactionRepository;
        $this->templates = new TemplateRepository;
        $this->templateOccurrences = new TemplateOccurrenceRepository;
        $this->wallets = new WalletRepository;
        $this->settings = (new SettingRepository)->firstFromUser($this->userID);
    }

    /**
     * Monta o DTO principal da dashboard, agrupando cada area da tela.
     * @return \App\DTOs\Dashboard\Dashboard
     */
    public function build(): Dashboard {
        $balance = $this->getBalance();
        $currentCycle = $this->getCurrentCycle();
        $nextCycle = $this->getNextCycle();
        $nextIncome = $this->getNextIncome();
        $milestones = $this->getMilestones();

        return new Dashboard(
            $balance,
            $currentCycle,
            $nextCycle,
            $nextIncome,
            $milestones
        );
    }

    /**
     * Obtem um resumo do estado atual do fluxo de caixa.
     * @return \App\DTOs\Dashboard\Balance
     */
    public function getBalance(): Balance {
        // Carrega o proximo ciclo para calcular as despesas ja comprometidas nele
        $nextCycle = $this->getNextCycle();

        // Saldo atual: saldo inicial da wallet + total de transacoes efetuadas.
        $current = $this->getCurrentBalance();

        // Comprometido: despesas pendentes e templates ativos previstos para o proximo ciclo.
        $commited = $this->getNextCycleCommitted($nextCycle);

        // Disponivel: saldo atual - valor comprometido.
        $spendable = max(0, $current - $commited);

        return new Balance($current, $commited, $spendable);
    }

    /**
     * Obtem o valor comprometido no proximo ciclo financeiro.
     * @return float
     */
    private function getNextCycleCommitted(Cycle $nextCycle): float {
        // Calcula as despesas pendentes ja inseridas no periodo do proximo ciclo
        $transactionsTotal = $this->transactions->sumPendingExpensesInCycle(
            $this->userID,
            $nextCycle->start,
            $nextCycle->end
        );

        // Calcula as despesas previstas por templates ativos no mesmo periodo
        $templatesTotal = $this->sumTemplateExpensesInCycle($nextCycle->start, $nextCycle->end);

        return $transactionsTotal + $templatesTotal;
    }

    /**
     * Soma templates ativos de despesa cujo dia do mes cai dentro do ciclo informado.
     * @return float
     */
    private function sumTemplateExpensesInCycle(string $start, string $end): float {
        // Carrega templates ativos de despesa do usuario atual
        $templates = $this->templates->allActiveExpensesFromUser($this->userID);

        // Inicializa o total de templates comprometidos no ciclo
        $total = 0;

        // Percorre todos os templates para localizar ocorrencias dentro do ciclo
        foreach ($templates as $template) {
            // Percorre as possiveis datas mensais do template dentro do ciclo
            foreach ($this->getTemplateDatesInCycle((int) ($template['month_day'] ?? 1), $start, $end) as $date) {
                // Verifica se o template esta vigente na data calculada
                if (!$this->templateRunsOnDate($template, $date)) {
                    // Interrompe a soma desta ocorrencia fora da vigencia
                    continue;
                }

                // Verifica se a ocorrencia ja foi convertida ou descartada pelo usuario
                if ($this->templateOccurrences->existsHandledFromTemplateOnDate($this->userID, (int) $template['id'], $date)) {
                    // Interrompe a soma desta ocorrencia para evitar duplicidade ou retorno visual
                    continue;
                }

                // Calcula o total comprometido pelos templates ainda nao lancados
                $total += (float) ($template['amount'] ?? 0);
            }
        }

        // Retorna o total previsto pelos templates
        return $total;
    }

    /**
     * Indica se o template esta vigente para a data informada.
     * @return bool
     */
    private function templateRunsOnDate(array $template, string $date): bool {
        // Verifica se a data esta antes do inicio do template
        if (!empty($template['start_date']) && $date < $template['start_date']) {
            // Interrompe templates que ainda nao iniciaram
            return false;
        }

        // Verifica se a data esta depois do fim do template
        if (!empty($template['end_date']) && $date > $template['end_date']) {
            // Interrompe templates que ja encerraram
            return false;
        }

        // Retorna que o template esta vigente para a data informada
        return true;
    }

    /**
     * Obtem o ciclo financeiro em andamento.
     * @return \App\DTOs\Dashboard\Cycle
     */
    public function getCurrentCycle(): Cycle {
        return $this->getCycleAt($this->getTodayDate());
    }

    /**
     * Obtem o ciclo financeiro que contem uma data de referencia.
     * @return \App\DTOs\Dashboard\Cycle
     */
    public function getCycleAt(string $referenceDate): Cycle {
        if ($this->cycleStartsAfterIncome()) {
            // Neste modo, o recebimento fecha o ciclo e o seguinte comeca um dia depois.
            $previousIncomeDate = $this->transactions->findPreviousIncomeDate(
                $this->userID,
                $referenceDate
            );
            $nextIncome = $this->transactions->findNextIncome(
                $this->userID,
                $referenceDate
            );
        } else {
            // No modo convencional, o recebimento abre imediatamente um novo ciclo.
            $previousIncomeDate = $this->transactions->findPreviousIncomeDate(
                $this->userID,
                $referenceDate,
                true
            );
            $nextIncome = $previousIncomeDate
                ? $this->transactions->findNextIncomeAfter($this->userID, $previousIncomeDate)
                : $this->transactions->findNextIncome($this->userID, $referenceDate);
        }

        $start = $previousIncomeDate
            ? $this->getCycleStartFromIncomeDate($previousIncomeDate)
            : $referenceDate;

        $end = !empty($nextIncome['occurrence_date'])
            ? $this->getCycleEndFromIncomeDate($nextIncome['occurrence_date'])
            : $this->addDays($start, 30);

        // Evita ciclos vazios quando ainda nao existem recebimentos suficientes.
        if ($end <= $start) {
            $end = $this->addDays($start, 1);
        }

        $progress = $this->getCycleProgress($start, $end, $this->getTodayDate());

        return $this->buildCycle($start, $end, $progress, $this->getCurrentBalance());
    }

    /**
     * Obtem o proximo ciclo financeiro projetado.
     * @return \App\DTOs\Dashboard\Cycle
     */
    public function getNextCycle(): Cycle {
        // Obtem o ciclo em andamento.
        $currentCycle = $this->getCurrentCycle();

        // Data Inicial: data final do ciclo atual.
        $start = $currentCycle->end;

        // Obtem a primeira entrada apos a data inicial.
        $nextIncome = $this->transactions->findNextIncomeAfter($this->userID, $start);

        // Data Final: fronteira gerada pela proxima entrada apos a data inicial.
        $end = !empty($nextIncome['occurrence_date'])
            ? $this->getCycleEndFromIncomeDate($nextIncome['occurrence_date'])
            : $this->addDays($start, 30);

        // Se a data final for menor ou igual a data inicial, forca o fim para o dia seguinte, evitando ciclos com 0 dias.
        if ($end <= $start) {
            $end = $this->addDays($start, 1);
        }

        // Saldo projetado no inicio do proximo ciclo.
        $openingBalance = $this->getCurrentBalance()
            + $this->transactions->sumAmountInCycle($this->userID, $this->getTodayDate(), $start);

        // Progresso: sempre zerado, visto que o ciclo ainda nao comecou.
        return $this->buildCycle($start, $end, 0, $openingBalance);
    }

    /**
     * Obtem a proxima entrada prevista.
     * @return \App\DTOs\Dashboard\NextIncome
     */
    public function getNextIncome(): NextIncome {
        // Busca a proxima entrada a partir da data de hoje.
        $nextIncome = $this->transactions->findNextIncome($this->userID, $this->getTodayDate());

        return new NextIncome(
            $nextIncome['occurrence_date'] ?? null,
            (float) ($nextIncome['amount'] ?? 0)
        );
    }

    /**
     * Obtem os proximos marcos do fluxo.
     * @return array
     */
    public function getMilestones(): array {
        // Obtem o proximo ciclo.
        $nextCycle = $this->getNextCycle();

        // Obtem as transacoes registradas a partir de hoje ate o fim do proximo ciclo.
        $transactions = $this->transactions->allInCycleFromUser(
            $this->userID,
            $this->getTodayDate(),
            $nextCycle->end
        );

        $milestones = [];
        $limit = 3;

        // Limita os marcos a quantidade definida para o bloco lateral da home.
        foreach (array_slice($transactions, 0, $limit) as $transaction) {
            $milestones[] = new Milestone(
                $transaction['title'],
                $transaction['occurrence_date'],
                (float) $transaction['amount'],
                $transaction['type'] ?? null
            );
        }

        return $milestones;
    }

    /**
     * Monta um ciclo com totais e transacoes cruas.
     * @return \App\DTOs\Dashboard\Cycle
     */
    private function buildCycle(string $start, string $end, int $progress, float $openingBalance): Cycle {
        // Transacoes cruas do ciclo. A preparacao visual fica no presenter.
        $cycleTransactions = $this->transactions->allInCycleFromUser($this->userID, $start, $end);

        // Templates previstos do ciclo exibidos como lancamentos virtuais.
        $scheduledTransactions = $this->getScheduledTemplateTransactionsInCycle($start, $end);

        // Junta lancamentos reais e previstos para montar a visao projetada do ciclo.
        $cycleTransactions = $this->sortTransactionsByDate(array_merge($cycleTransactions, $scheduledTransactions));

        // Entradas: todas as entradas registradas ou previstas no ciclo.
        $income = $this->sumTransactionsByType($cycleTransactions, 'I');

        // Gastos: todas as saidas registradas ou previstas no ciclo.
        $expenses = $this->sumTransactionsByType($cycleTransactions, 'E');

        // Saldo: entradas - gastos.
        $balance = $income - $expenses;

        return new Cycle(
            $start,
            $end,
            $income,
            $expenses,
            $balance,
            $progress,
            $cycleTransactions,
            $openingBalance
        );
    }

    /**
     * Obtem templates ativos como lancamentos virtuais dentro do ciclo.
     * @return array
     */
    private function getScheduledTemplateTransactionsInCycle(string $start, string $end): array {
        // Carrega templates ativos do usuario atual
        $templates = $this->templates->allActiveScheduledFromUser($this->userID);
        $transactions = [];

        // Percorre todos os templates para criar as ocorrencias previstas
        foreach ($templates as $template) {
            // Percorre as datas mensais do template dentro do ciclo
            foreach ($this->getTemplateDatesInCycle((int) ($template['month_day'] ?? 1), $start, $end) as $date) {
                // Verifica se o template esta vigente na data calculada
                if (!$this->templateRunsOnDate($template, $date)) {
                    // Interrompe a criacao desta ocorrencia fora da vigencia
                    continue;
                }

                // Verifica se a ocorrencia ja foi convertida ou descartada pelo usuario
                if ($this->templateOccurrences->existsHandledFromTemplateOnDate($this->userID, (int) $template['id'], $date)) {
                    // Interrompe a criacao para evitar duplicidade visual ou retorno apos exclusao
                    continue;
                }

                // Define uma transacao virtual baseada no template
                $transactions[] = $this->templateToScheduledTransaction($template, $date);
            }
        }

        // Retorna as transacoes virtuais do ciclo
        return $transactions;
    }

    /**
     * Transforma um template ativo em lancamento previsto para a dashboard.
     * @return array
     */
    private function templateToScheduledTransaction(array $template, string $date): array {
        // Retorna a estrutura esperada pelo presenter de transacoes
        return [
            'id' => null,
            'user_id' => $this->userID,
            'wallet_id' => $template['wallet_id'] ?? null,
            'type' => $template['type'] ?? null,
            'category_id' => $template['category_id'] ?? null,
            'entity_id' => $template['entity_id'] ?? null,
            'template_id' => $template['id'] ?? null,
            'payment_method_id' => null,
            'title' => $template['title'] ?? '',
            'paid' => 0,
            'defines_cycle' => !empty($template['defines_cycle']) ? 1 : 0,
            'amount' => (float) ($template['amount'] ?? 0),
            'occurrence_date' => $date,
            'due_date' => $date,
            'paid_at' => null,
            'category_name' => $template['category_name'] ?? null,
            'category_color' => $template['category_color'] ?? null,
            'category_icon' => $template['category_icon'] ?? null,
            'wallet_name' => $template['wallet_name'] ?? null,
            'entity_name' => $template['entity_name'] ?? null,
            'template_title' => $template['title'] ?? '',
            'payment_method_name' => null,
            'source' => 'template',
            'is_virtual' => true,
        ];
    }

    /**
     * Soma lancamentos de um tipo especifico.
     * @return float
     */
    private function sumTransactionsByType(array $transactions, string $type): float {
        // Inicializa o total do tipo solicitado
        $total = 0;

        // Percorre os lancamentos do ciclo
        foreach ($transactions as $transaction) {
            // Verifica se o lancamento pertence ao tipo solicitado
            if (($transaction['type'] ?? null) !== $type) {
                // Interrompe a soma do lancamento atual
                continue;
            }

            // Calcula o total acumulado do tipo
            $total += (float) ($transaction['amount'] ?? 0);
        }

        // Retorna o total calculado
        return $total;
    }

    /**
     * Ordena lancamentos pela data do ciclo.
     * @return array
     */
    private function sortTransactionsByDate(array $transactions): array {
        // Ordena lancamentos por data e identificador
        usort($transactions, function ($first, $second) {
            // Define a data da primeira transacao
            $firstDate = $first['occurrence_date'] ?? '';

            // Define a data da segunda transacao
            $secondDate = $second['occurrence_date'] ?? '';

            // Verifica se as datas sao iguais
            if ($firstDate === $secondDate) {
                // Calcula a ordem por identificador, mantendo previstos depois dos reais
                return (int) ($first['id'] ?? PHP_INT_MAX) <=> (int) ($second['id'] ?? PHP_INT_MAX);
            }

            // Retorna a ordem cronologica
            return strcmp($firstDate, $secondDate);
        });

        // Retorna a lista ordenada
        return $transactions;
    }

    /**
     * Obtem o saldo atual.
     * @return float
     */
    private function getCurrentBalance(): float {
        // Saldo Inicial: soma do saldo inicial de todas as wallets.
        $initialBalance = $this->wallets->sumInitialBalanceFromUser($this->userID);

        // Transacoes Pagas: todas as transacoes registradas como pagas.
        $paidTransactions = $this->transactions->sumPaidAmountFromUser($this->userID);

        return $initialBalance + $paidTransactions;
    }

    /**
     * Obtem o percentual de andamento do ciclo.
     * @return int
     */
    private function getCycleProgress(string $start, string $end, string $current): int {
        // Data Inicial.
        $startDate = new \DateTimeImmutable($start);

        // Data Final.
        $endDate = new \DateTimeImmutable($end);

        // Data Atual.
        $currentDate = new \DateTimeImmutable($current);

        // Total de Dias: diferenca de dias entre o comeco e o fim do ciclo.
        $totalDays = max(1, (int) $startDate->diff($endDate)->format('%a'));

        // Dias Decorridos: diferenca de dias entre o comeco do ciclo e o dia atual.
        $elapsedDays = (int) $startDate->diff($currentDate)->format('%r%a');

        // Progresso: razao entre os dias ja decorridos e o total de dias do ciclo.
        $progress = (int) round(($elapsedDays / $totalDays) * 100);

        return max(0, min($progress, 100));
    }

    /**
     * Obtem as datas mensais de um template dentro de um ciclo.
     * @return array
     */
    private function getTemplateDatesInCycle(int $monthDay, string $start, string $end): array {
        // Inicializa as fronteiras do ciclo
        $startDate = new \DateTimeImmutable($start);
        $endDate = new \DateTimeImmutable($end);

        // Define o dia valido para gerar as datas mensais
        $day = max(1, min($monthDay, 31));

        // Inicializa a busca no primeiro mes do ciclo
        $cursor = $startDate->modify('first day of this month');

        // Inicializa as datas encontradas dentro do ciclo
        $dates = [];

        // Percorre todos os meses tocados pelo ciclo
        while ($cursor < $endDate) {
            // Calcula a data do template no mes atual
            $date = $this->dateInMonth($cursor, $day);

            // Verifica se a data calculada pertence ao intervalo do ciclo
            if ($date >= $startDate && $date < $endDate) {
                // Define a ocorrencia do template dentro do ciclo
                $dates[] = $date->format('Y-m-d');
            }

            // Define o proximo mes a ser avaliado
            $cursor = $cursor->modify('first day of next month');
        }

        // Retorna as datas mensais localizadas dentro do ciclo
        return $dates;
    }

    /**
     * Obtem a data de hoje.
     * @return \DateTimeImmutable
     */
    private function getToday(): \DateTimeImmutable {
        return new \DateTimeImmutable('today');
    }

    /**
     * Obtem a data de hoje em formato yyyy-mm-dd.
     * @return string
     */
    private function getTodayDate(): string {
        return $this->getToday()->format('Y-m-d');
    }

    /**
     * Transforma a data do recebimento na data inicial do ciclo.
     * @return string
     */
    private function getCycleStartFromIncomeDate(string $incomeDate): string {
        return $this->cycleStartsAfterIncome()
            ? $this->addDays($incomeDate, 1)
            : $incomeDate;
    }

    /**
     * Transforma a data do recebimento na data final do ciclo.
     * @return string
     */
    private function getCycleEndFromIncomeDate(string $incomeDate): string {
        return $this->cycleStartsAfterIncome()
            ? $this->addDays($incomeDate, 1)
            : $incomeDate;
    }

    /**
     * Indica se o recebimento fecha o ciclo atual.
     * @return bool
     */
    private function cycleStartsAfterIncome(): bool {
        return !empty($this->settings['cycle_starts_after_income']);
    }

    /**
     * Soma dias a uma data em formato yyyy-mm-dd.
     * @return string
     */
    private function addDays(string $date, int $days): string {
        return (new \DateTimeImmutable($date))->modify("+$days days")->format('Y-m-d');
    }

    /**
     * Obtem uma data segura dentro do mes informado.
     * @return \DateTimeImmutable
     */
    private function dateInMonth(\DateTimeImmutable $baseDate, int $day): \DateTimeImmutable {
        // Calcula o ultimo dia valido do mes
        $lastDay = (int) $baseDate->format('t');

        // Define o dia sem ultrapassar o limite do mes
        $safeDay = min($day, $lastDay);

        // Retorna a data ajustada para o dia valido do mes
        return $baseDate->setDate((int) $baseDate->format('Y'), (int) $baseDate->format('m'), $safeDay);
    }
}
