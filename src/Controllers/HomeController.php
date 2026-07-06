<?php 

namespace App\Controllers;

use App\Core\Session;
use App\Models\Repositories\TransactionRepository;
use App\Models\Repositories\UserRepository;
use App\Presenters\DashboardPresenter;
use App\Services\DashboardService;
use App\Services\PeriodicTransactionService;

class HomeController extends Controller {
    public function index() {  
        $this->requireAuth();

        // Define o usuario autenticado e carrega o feedback temporario da dashboard
        $user_id = (int) Session::get('user_id');
        $dashboardFeedback = Session::get('dashboard_feedback');

        // Remove o feedback apos disponibiliza-lo para a proxima renderizacao
        Session::remove('dashboard_feedback');

        // Carrega os dados consolidados da dashboard
        $dashboard = (new DashboardService)->build();
        $dashboardView = (new DashboardPresenter($dashboard))->present();

        $this->view('home.twig', [
            'dashboard' => $dashboardView,
            'user' => (new UserRepository)->find(["id" => $user_id]),
            'dashboard_feedback' => $dashboardFeedback
        ]);
    }

    public function generatePeriodicTransactions() {
        // Verifica se a geracao foi solicitada por POST
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
            // Interrompe requisicoes feitas por outros metodos
            redirect();
            exit;
        }

        // Verifica se o usuario possui uma sessao autenticada
        $this->requireAuth();

        // Define o usuario autenticado e o ciclo financeiro atual
        $userId = (int) Session::get('user_id');
        $dashboardService = new DashboardService;
        $currentCycle = $dashboardService->getCurrentCycle();

        // Cria as transacoes periodicas previstas para o ciclo atual
        $created = (new PeriodicTransactionService)->generateForCycle(
            $userId,
            $currentCycle->start,
            $currentCycle->end
        );

        // Define a mensagem exibida apos o redirecionamento
        $message = 'Nenhuma previsão pendente foi encontrada para o ciclo atual.';

        // Verifica se apenas uma previsao foi criada
        if ($created === 1) {
            // Define o texto singular para o feedback
            $message = '1 previsão foi inserida no ciclo atual.';
        }

        // Verifica se mais de uma previsao foi criada
        if ($created > 1) {
            // Define o texto plural para o feedback
            $message = "$created previsões foram inseridas no ciclo atual.";
        }

        // Salva o feedback exibido apos o redirecionamento
        Session::set('dashboard_feedback', [
            'type' => 'success',
            'message' => $message
        ]);

        redirect();
        exit;
    }

    public function closeCurrentCycle() {
        // Verifica se o encerramento foi solicitado por POST
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
            // Interrompe requisicoes feitas por outros metodos
            redirect();
            exit;
        }

        // Verifica se o usuario possui uma sessao autenticada
        $this->requireAuth();

        // Define o usuario autenticado e o ciclo financeiro atual
        $userId = (int) Session::get('user_id');
        $dashboardService = new DashboardService;
        $currentCycle = $dashboardService->getCurrentCycle();

        // Marca as transacoes pendentes do ciclo atual como pagas
        $updated = (new TransactionRepository)->markCycleAsPaid(
            $userId,
            $currentCycle->start,
            $currentCycle->end,
            (new \DateTimeImmutable('today'))->format('Y-m-d')
        );

        // Define a mensagem exibida apos o redirecionamento
        $message = 'Nenhuma transação pendente foi encontrada no ciclo atual.';

        // Verifica se apenas uma transacao foi atualizada
        if ($updated === 1) {
            // Define o texto singular para o feedback
            $message = '1 transação foi marcada como paga no ciclo atual.';
        }

        // Verifica se mais de uma transacao foi atualizada
        if ($updated > 1) {
            // Define o texto plural para o feedback
            $message = "$updated transações foram marcadas como pagas no ciclo atual.";
        }

        // Salva o feedback exibido apos o redirecionamento
        Session::set('dashboard_feedback', [
            'type' => 'success',
            'message' => $message
        ]);

        redirect();
        exit;
    }

    public function cycle() {
        $this->requireAuth();

        $referenceDate = $_GET['date'] ?? '';

        if (!$this->isValidDate($referenceDate)) {
            http_response_code(422);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'error' => 'Data de referencia invalida.'
            ]);
            return;
        }

        $service = new DashboardService;
        $cycle = $service->getCycleAt($referenceDate);
        $presenter = new DashboardPresenter;
        $cycleView = $presenter->presentCycle($cycle);

        $today = new \DateTimeImmutable('today');
        $start = new \DateTimeImmutable($cycle->start);
        $end = new \DateTimeImmutable($cycle->end);

        if ($today < $start) {
            $cycleView['description'] = 'ciclo futuro projetado';
        } elseif ($today >= $end) {
            $cycleView['description'] = 'ciclo encerrado';
        } else {
            $cycleView['description'] = 'ciclo atual ate o proximo recebimento';
        }

        $cycleView['previousReference'] = $start->modify('-1 day')->format('Y-m-d');
        $cycleView['nextReference'] = $end->format('Y-m-d');

        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($cycleView);
    }

    /**
     * Exibe todas as transações de um ciclo em uma página preparada para impressão.
     */
    public function printCycle() {
        // Verifica se o usuário possui uma sessão autenticada
        $this->requireAuth();

        // Define a data usada para localizar o ciclo solicitado
        $referenceDate = $_GET['date'] ?? '';

        // Verifica se a data recebida possui o formato esperado
        if (!$this->isValidDate($referenceDate)) {
            // Interrompe a impressão quando a referência é inválida
            http_response_code(422);
            echo 'Data de referência inválida.';
            return;
        }

        // Carrega e prepara o ciclo para a view de impressão
        $cycle = (new DashboardService)->getCycleAt($referenceDate);
        $cycleView = (new DashboardPresenter)->presentCycle($cycle);

        // Define os filtros enviados pela dashboard
        $filters = $this->getPrintCycleFilters();

        // Define apenas as transacoes que devem aparecer na impressao
        $cycleView['transactions'] = $this->filterPrintTransactions($cycleView['transactions'], $filters);

        // Exibe a página independente usada pelo navegador para gerar o PDF
        $this->view('dashboard/cycle-print.twig', [
            'cycle' => $cycleView
        ]);
    }

    private function getPrintCycleFilters(): array {
        // Define os filtros recebidos pela URL de impressao
        return [
            'entity_id' => trim((string) ($_GET['entity_id'] ?? '')),
            'types' => $this->getCsvFilter('types', ['I', 'E']),
            'statuses' => $this->getCsvFilter('statuses', ['paid', 'pending']),
        ];
    }

    private function getCsvFilter(string $key, array $default): array {
        // Verifica se o filtro foi enviado na URL
        if (!array_key_exists($key, $_GET)) {
            // Retorna o valor padrao quando o filtro nao foi informado
            return $default;
        }

        // Define o texto bruto recebido pelo filtro
        $raw = (string) $_GET[$key];

        // Verifica se o filtro foi enviado vazio
        if ($raw === '') {
            // Retorna lista vazia para nao exibir nenhum item daquele grupo
            return [];
        }

        // Define os valores separados por virgula
        $values = array_filter(array_map('trim', explode(',', $raw)), function ($value) {
            // Verifica se o valor atual nao esta vazio
            return $value !== '';
        });

        // Retorna os valores unicos do filtro
        return array_values(array_unique($values));
    }

    private function filterPrintTransactions(array $transactions, array $filters): array {
        // Define as transacoes compatíveis com os filtros da impressao
        $filtered = array_filter($transactions, function ($transaction) use ($filters) {
            // Retorna se a transacao corresponde a todos os filtros
            return $this->matchesPrintEntityFilter($transaction, $filters)
                && $this->matchesPrintTypeFilter($transaction, $filters)
                && $this->matchesPrintStatusFilter($transaction, $filters);
        });

        // Retorna a lista reindexada para a view
        return array_values($filtered);
    }

    private function matchesPrintEntityFilter(array $transaction, array $filters): bool {
        // Verifica se nao existe entidade filtrada
        if ($filters['entity_id'] === '') {
            // Retorna verdadeiro quando todas as entidades devem ser exibidas
            return true;
        }

        // Define a entidade da transacao atual
        $entityId = (string) ($transaction['entity']['id'] ?? '');

        // Retorna se a entidade corresponde ao filtro
        return $entityId === $filters['entity_id'];
    }

    private function matchesPrintTypeFilter(array $transaction, array $filters): bool {
        // Define o tipo da transacao atual
        $type = (string) ($transaction['type'] ?? '');

        // Retorna se o tipo esta selecionado
        return in_array($type, $filters['types'], true);
    }

    private function matchesPrintStatusFilter(array $transaction, array $filters): bool {
        // Define o status normalizado da transacao atual
        $status = !empty($transaction['paid']) ? 'paid' : 'pending';

        // Retorna se o status esta selecionado
        return in_array($status, $filters['statuses'], true);
    }

    private function isValidDate(string $date): bool {
        $parsed = \DateTimeImmutable::createFromFormat('!Y-m-d', $date);

        return $parsed && $parsed->format('Y-m-d') === $date;
    }
}
