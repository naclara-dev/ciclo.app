(function () {
    const card = document.querySelector('[data-cycle-card]');
    const previousButton = document.querySelector('[data-cycle-previous]');
    const nextButton = document.querySelector('[data-cycle-next]');
    const refreshButton = document.querySelector('[data-refresh-home]');
    // Carrega os controles usados para filtrar os lançamentos do ciclo
    const entityFilter = document.querySelector('[data-cycle-filter-entity]');
    const typeFilter = document.querySelector('[data-cycle-filter-type]');
    const typeFilterOptions = Array.from(document.querySelectorAll('[data-cycle-filter-type-option]'));
    const statusFilter = document.querySelector('[data-cycle-filter-status]');
    const statusFilterOptions = Array.from(document.querySelectorAll('[data-cycle-filter-status-option]'));
    const clearFiltersButtons = Array.from(document.querySelectorAll('[data-cycle-filter-clear]'));
    const initialTransactionsSource = document.querySelector('[data-cycle-initial-transactions]');
    const filterToggle = document.querySelector('[data-cycle-filter-toggle]');
    const filterContent = document.querySelector('[data-cycle-filter-content]');
    const filterIcon = document.querySelector('[data-cycle-filter-icon]');
    // Carrega o botão responsável pela impressão do ciclo
    const printButton = document.querySelector('[data-print-cycle]');
    const cache = new Map();
    // Inicializa o estado dos filtros mantidos entre trocas de ciclo
    const transactionFilters = {
        entityId: '',
        type: {
            I: true,
            E: true
        },
        status: {
            paid: true,
            pending: true
        }
    };
    // Inicializa as transações do ciclo apresentado no carregamento da tela
    let currentTransactions = readInitialTransactions();
    let activeSwipe = null;

    if (refreshButton) {
        refreshButton.addEventListener('click', function () {
            const icon = refreshButton.querySelector('i');

            if (icon) {
                icon.classList.add('animate-spin');
            }

            window.location.reload();
        });
    }

    if (!card) {
        return;
    }

    const toggle = card.querySelector('[data-cycle-toggle]');
    const content = card.querySelector('[data-cycle-content]');
    const icon = card.querySelector('[data-cycle-icon]');
    const cycleUrl = card.dataset.cycleUrl;
    let previousReference = subtractDay(card.dataset.cycleStart);
    let nextReference = card.dataset.cycleEnd;

    initializeCollapse();
    initializeFilterCollapse();
    initializeFilters();
    initializeSwipeActions();

    // Verifica se o botão de impressão está disponível
    if (printButton) {
        // Abre a versão de impressão do ciclo atualmente exibido
        printButton.addEventListener('click', printCycle);
    }

    if (!previousButton || !nextButton || !cycleUrl) {
        return;
    }

    previousButton.addEventListener('click', function () {
        loadCycle(previousReference);
    });

    nextButton.addEventListener('click', function () {
        loadCycle(nextReference);
    });

    function loadCycle(referenceDate) {
        if (!referenceDate) {
            return;
        }

        setLoading(true);

        if (cache.has(referenceDate)) {
            renderCycle(cache.get(referenceDate));
            setLoading(false);
            return;
        }

        fetch(cycleUrl + '?date=' + encodeURIComponent(referenceDate), {
            headers: {
                'Accept': 'application/json'
            }
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('cycle not found');
                }

                return response.json();
            })
            .then(function (cycle) {
                rememberCycle(referenceDate, cycle);
                renderCycle(cycle);
            })
            .catch(function () {
                window.location.reload();
            })
            .finally(function () {
                setLoading(false);
            });
    }

    function renderCycle(cycle) {
        card.dataset.cycleStart = cycle.start;
        card.dataset.cycleEnd = cycle.end;
        previousReference = cycle.previousReference;
        nextReference = cycle.nextReference;

        setText('[data-cycle-start-day]', cycle.startDayLabel);
        setText('[data-cycle-label]', cycle.label);
        setText('[data-cycle-description]', cycle.description);
        setText('[data-cycle-income]', cycle.incomeLabel);
        setText('[data-cycle-expenses]', cycle.expensesLabel);
        setText('[data-cycle-balance]', cycle.balanceLabel);
        setText('[data-viewed-cycle-balance]', cycle.balanceLabel);
        setText('[data-viewed-cycle-progress-label]', cycle.label);
        setText('[data-viewed-cycle-progress-value]', cycle.progress + '%');

        const progressBar = document.querySelector('[data-viewed-cycle-progress-bar]');

        if (progressBar) {
            progressBar.style.width = cycle.progress + '%';
        }

        // Atualiza as transações e os resumos do ciclo selecionado
        // Define as transações usadas pelos filtros do ciclo selecionado
        currentTransactions = cycle.transactions || [];

        // Atualiza as transações filtradas do ciclo selecionado
        updateEntityFilterOptions(currentTransactions);
        applyTransactionFilters();
        renderSummary('[data-entity-summary]', cycle.entitySummary || []);
        renderSummary('[data-category-summary]', cycle.categorySummary || []);

        // Verifica se o conteúdo do ciclo está expandido
        if (toggle && toggle.getAttribute('aria-expanded') === 'true') {
            // Atualiza a altura do conteúdo após a troca de ciclo
            requestAnimationFrame(function () {
                content.style.maxHeight = getExpandedContentHeight();
            });
        }
    }

    // Inicializa os eventos e opções dos filtros de lançamentos
    function initializeFilterCollapse() {
        // Verifica se os elementos do collapse de filtros existem
        if (!filterToggle || !filterContent || !filterIcon) {
            // Interrompe quando o layout nao possui filtros colapsaveis
            return;
        }

        // Inicializa o conteudo aberto no mobile e livre no desktop
        setFilterContentExpanded(true);

        // Alterna os filtros quando o botao mobile e acionado
        filterToggle.addEventListener('click', function () {
            // Verifica se os filtros estao abertos
            const isExpanded = filterToggle.getAttribute('aria-expanded') === 'true';

            // Define o proximo estado visual
            setFilterContentExpanded(!isExpanded);
        });

        // Recalcula a altura quando o viewport muda
        window.addEventListener('resize', function () {
            // Verifica se os filtros estao abertos
            if (filterToggle.getAttribute('aria-expanded') === 'true') {
                // Atualiza a altura do conteudo aberto
                setFilterContentExpanded(true);
            }
        });
    }

    function setFilterContentExpanded(isExpanded) {
        // Atualiza o estado acessivel do botao
        filterToggle.setAttribute('aria-expanded', String(isExpanded));

        // Alterna a direcao do icone
        filterIcon.classList.toggle('rotate-180', !isExpanded);

        // Verifica se o desktop deve manter o fluxo natural
        if (!isMobileLayout()) {
            // Remove restricoes fora do mobile
            filterContent.style.maxHeight = '';
            filterContent.style.overflow = '';
            filterContent.classList.add('p-3');
            filterContent.classList.remove('p-0');
            return;
        }

        // Define o overflow necessario para animar o conteudo mobile
        filterContent.style.overflow = 'hidden';

        // Verifica se os filtros devem abrir
        if (isExpanded) {
            // Restaura o espacamento interno do conteudo
            filterContent.classList.add('p-3');
            filterContent.classList.remove('p-0');

            // Calcula a altura aberta para animar o painel
            filterContent.style.maxHeight = filterContent.scrollHeight + 'px';

            // Libera o overflow apos a animacao para nao cortar dropdowns
            window.setTimeout(function () {
                // Verifica se o painel continua aberto
                if (filterToggle.getAttribute('aria-expanded') === 'true' && isMobileLayout()) {
                    // Remove a restricao de altura do painel aberto
                    filterContent.style.maxHeight = '';
                    filterContent.style.overflow = '';
                }
            }, 320);
            return;
        }

        // Remove o espacamento interno do conteudo recolhido
        filterContent.classList.remove('p-3');
        filterContent.classList.add('p-0');

        // Define a altura recolhida do conteudo mobile
        filterContent.style.maxHeight = '0px';
    }

    function initializeFilters() {
        // Atualiza as opções iniciais do filtro por entidade
        updateEntityFilterOptions(currentTransactions);

        // Verifica se o filtro por entidade está disponível
        if (entityFilter) {
            // Aplica o filtro quando uma entidade é selecionada
            entityFilter.addEventListener('ciclo:select-change', function (event) {
                transactionFilters.entityId = event.detail.value;
                applyTransactionFilters();
            });
        }

        // Verifica se o filtro por tipo está disponível
        if (typeFilter) {
            // Inicializa as badges do filtro por tipo
            initializeTypeFilters();
        }

        // Verifica se o filtro por status está disponível
        if (statusFilter) {
            // Inicializa as badges do filtro por status
            initializeStatusFilters();
        }

        // Verifica se existem botoes de limpeza disponiveis
        if (clearFiltersButtons.length > 0) {
            // Percorre os botoes de limpeza do layout responsivo
            clearFiltersButtons.forEach(function (clearFiltersButton) {
                // Restaura todos os filtros para a opcao padrao
                clearFiltersButton.addEventListener('click', function () {
                    resetTransactionFilters();
                    applyTransactionFilters();
                });
            });
        }
    }

    // Inicializa os eventos das badges de tipo
    function initializeTypeFilters() {
        // Atualiza o estado visual inicial das badges
        updateTypeFilterBadges();

        // Percorre as opções de tipo disponíveis
        typeFilterOptions.forEach(function (option) {
            // Alterna o tipo quando a badge é acionada
            option.addEventListener('click', function () {
                toggleTypeFilter(option.dataset.type);
            });
        });
    }

    // Alterna uma opção do filtro por tipo
    function toggleTypeFilter(type) {
        // Verifica se o tipo informado existe no filtro
        if (!Object.prototype.hasOwnProperty.call(transactionFilters.type, type)) {
            // Interrompe a alteração quando o tipo é desconhecido
            return;
        }

        // Calcula o próximo estado do tipo acionado
        const nextValue = !transactionFilters.type[type];

        // Define o novo estado do tipo acionado
        transactionFilters.type[type] = nextValue;

        // Atualiza a aparência das badges
        updateTypeFilterBadges();

        // Aplica os filtros sobre as transações exibidas
        applyTransactionFilters();
    }

    // Atualiza a aparência das badges de tipo
    function updateTypeFilterBadges() {
        // Percorre todas as badges de tipo
        typeFilterOptions.forEach(function (option) {
            // Define se a badge atual está selecionada
            const isSelected = Boolean(transactionFilters.type[option.dataset.type]);

            // Atualiza o estado acessível da badge
            option.setAttribute('aria-pressed', String(isSelected));

            // Carrega o ícone de confirmação da badge atual
            const icon = option.querySelector('[data-cycle-filter-type-icon]');

            // Verifica se o ícone existe na badge
            if (icon) {
                // Exibe o check somente quando a badge está selecionada
                icon.style.display = isSelected ? '' : 'none';
            }
        });
    }

    // Calcula quantas badges de tipo estão selecionadas
    function countSelectedTypes() {
        // Retorna o total de opções ativas no estado atual
        return Object.keys(transactionFilters.type).filter(function (type) {
            // Verifica se o tipo atual está selecionado
            return transactionFilters.type[type];
        }).length;
    }

    // Inicializa os eventos das badges de status
    function initializeStatusFilters() {
        // Atualiza o estado visual inicial das badges
        updateStatusFilterBadges();

        // Percorre as opções de status disponíveis
        statusFilterOptions.forEach(function (option) {
            // Alterna o status quando a badge é acionada
            option.addEventListener('click', function () {
                toggleStatusFilter(option.dataset.status);
            });
        });
    }

    // Alterna uma opção do filtro por status
    function toggleStatusFilter(status) {
        // Verifica se o status informado existe no filtro
        if (!Object.prototype.hasOwnProperty.call(transactionFilters.status, status)) {
            // Interrompe a alteração quando o status é desconhecido
            return;
        }

        // Calcula o próximo estado do status acionado
        const nextValue = !transactionFilters.status[status];

        // Define o novo estado do status acionado
        transactionFilters.status[status] = nextValue;

        // Atualiza a aparência das badges
        updateStatusFilterBadges();

        // Aplica os filtros sobre as transações exibidas
        applyTransactionFilters();
    }

    // Atualiza a aparência das badges de status
    function updateStatusFilterBadges() {
        // Percorre todas as badges de status
        statusFilterOptions.forEach(function (option) {
            // Define se a badge atual está selecionada
            const isSelected = Boolean(transactionFilters.status[option.dataset.status]);

            // Atualiza o estado acessível da badge
            option.setAttribute('aria-pressed', String(isSelected));

            // Carrega o ícone de confirmação da badge atual
            const icon = option.querySelector('[data-cycle-filter-status-icon]');

            // Verifica se o ícone existe na badge
            if (icon) {
                // Exibe o check somente quando a badge está selecionada
                icon.style.display = isSelected ? '' : 'none';
            }
        });
    }

    // Calcula quantas badges de status estão selecionadas
    function countSelectedStatuses() {
        // Retorna o total de opções ativas no estado atual
        return Object.keys(transactionFilters.status).filter(function (status) {
            // Verifica se o status atual está selecionado
            return transactionFilters.status[status];
        }).length;
    }

    // Atualiza as opções de entidade com base no ciclo exibido
    function updateEntityFilterOptions(transactions) {
        // Verifica se o filtro por entidade existe na tela
        if (!entityFilter) {
            // Interrompe a atualização quando o filtro não existe
            return;
        }

        // Carrega o menu customizado de opções do filtro
        const menu = entityFilter.querySelector('[data-select-menu]');

        // Verifica se o menu customizado existe na tela
        if (!menu) {
            // Interrompe a atualização quando o menu não existe
            return;
        }

        // Inicializa o mapa de entidades encontradas nas transações do ciclo
        const entities = new Map();

        // Percorre as transações do ciclo para localizar entidades distintas
        transactions.forEach(function (transaction) {
            // Carrega a entidade vinculada à transação atual
            const entity = transaction.entity || {};

            // Verifica se a transação possui entidade vinculada
            if (!entity.id) {
                // Interrompe a inclusão de transações sem entidade
                return;
            }

            // Define a entidade disponível no filtro
            entities.set(String(entity.id), entity.name || 'sem nome');
        });

        // Define o valor selecionado antes de recriar as opções
        const selectedEntity = transactionFilters.entityId;

        // Limpa as opções anteriores do filtro
        menu.replaceChildren();

        // Inicializa a opção padrão do filtro por entidade
        menu.appendChild(createFilterOption('', 'todas'));

        // Percorre as entidades ordenadas pelo nome apresentado
        Array.from(entities.entries())
            .sort(function (first, second) {
                // Ordena as entidades alfabeticamente
                return first[1].localeCompare(second[1], 'pt-BR');
            })
            .forEach(function (item) {
                // Salva a entidade como opção do filtro
                menu.appendChild(createFilterOption(item[0], item[1]));
            });

        // Carrega o controlador do combobox customizado
        const controller = getFilterController(entityFilter);

        // Verifica se a entidade selecionada existe no ciclo exibido
        if (selectedEntity && entities.has(selectedEntity)) {
            // Mantém a seleção quando a entidade também existe no novo ciclo
            if (controller) {
                controller.set(selectedEntity, '', false);
            }

            return;
        }

        // Define o filtro como todas quando a entidade selecionada não existe no ciclo atual
        transactionFilters.entityId = '';

        // Atualiza o texto visível do combobox para a opção padrão
        if (controller) {
            controller.set('', 'todas', false);
        }
    }

    // Aplica os filtros ativos e redesenha apenas a lista de transações
    function applyTransactionFilters() {
        // Inicializa a lista filtrada a partir das transações do ciclo atual
        const filteredTransactions = currentTransactions.filter(function (transaction) {
            // Verifica se a transação corresponde aos filtros ativos
            return matchesEntityFilter(transaction) && matchesTypeFilter(transaction) && matchesStatusFilter(transaction);
        });

        // Renderiza a lista filtrada de lançamentos
        renderTransactions(filteredTransactions);

        // Atualiza a altura do conteúdo quando a lista muda
        refreshExpandedContentHeight();
    }

    // Verifica se a transação pertence à entidade filtrada
    function matchesEntityFilter(transaction) {
        // Verifica se não existe filtro por entidade ativo
        if (!transactionFilters.entityId) {
            // Retorna verdadeiro quando todas as entidades devem ser exibidas
            return true;
        }

        // Carrega a entidade da transação
        const entity = transaction.entity || {};

        // Retorna se a entidade da transação corresponde ao filtro
        return String(entity.id || '') === transactionFilters.entityId;
    }

    // Verifica se a transação corresponde ao tipo filtrado
    function matchesTypeFilter(transaction) {
        // Define o tipo normalizado da transação
        const type = transaction.type || '';

        // Retorna se o tipo da transação está selecionado
        return Boolean(transactionFilters.type[type]);
    }

    // Verifica se a transação corresponde ao status filtrado
    function matchesStatusFilter(transaction) {
        // Define o status normalizado da transação
        const status = isTransactionPaid(transaction) ? 'paid' : 'pending';

        // Retorna se o status da transação está selecionado
        return Boolean(transactionFilters.status[status]);
    }

    // Restaura os controles e o estado interno dos filtros
    function resetTransactionFilters() {
        // Define o estado padrão dos filtros
        transactionFilters.entityId = '';
        transactionFilters.type.I = true;
        transactionFilters.type.E = true;
        transactionFilters.status.paid = true;
        transactionFilters.status.pending = true;

        // Verifica se o filtro por entidade existe na tela
        if (entityFilter) {
            // Define a opção padrão de entidade
            setFilterValue(entityFilter, '', 'todas');
        }

        // Atualiza a aparência padrão das badges de tipo e status
        updateTypeFilterBadges();
        updateStatusFilterBadges();
    }

    // Inicializa uma opção de filtro customizado
    function createFilterOption(value, label) {
        // Inicializa a opção exibida no combobox
        const option = document.createElement('button');

        // Define o tipo para impedir submissões acidentais
        option.type = 'button';

        // Define a aparência compartilhada das opções customizadas
        option.className = 'flex w-full items-center rounded px-3 py-2 text-left text-sm transition hover:bg-[var(--secondary)] hover:text-primary';

        // Marca o elemento como opção do utilitário de combobox
        option.setAttribute('data-select-option', '');

        // Define o valor selecionado pela opção
        option.dataset.value = value;

        // Define o texto usado pelo rótulo do combobox
        option.dataset.valueLabel = label;

        // Define o estado acessível inicial da opção
        option.setAttribute('aria-selected', value ? 'false' : 'true');

        // Define o texto visível da opção
        option.textContent = label;

        // Retorna a opção configurada
        return option;
    }

    // Define o valor de um filtro usando o controlador customizado
    function setFilterValue(filter, value, label) {
        // Carrega o controlador do combobox
        const controller = getFilterController(filter);

        // Verifica se o controlador está disponível
        if (controller) {
            // Define o valor sem disparar novamente os filtros
            controller.set(value, label, false);
        }
    }

    // Carrega o controlador de um filtro customizado
    function getFilterController(filter) {
        // Verifica se a API de comboboxes está disponível
        if (!window.CicloSelect) {
            // Interrompe quando o utilitário não foi carregado
            return null;
        }

        // Retorna o controlador associado ao filtro
        return window.CicloSelect.get(filter);
    }

    // Carrega as transações iniciais serializadas pela view
    function readInitialTransactions() {
        // Verifica se a fonte de dados inicial existe
        if (!initialTransactionsSource) {
            // Retorna lista vazia quando a view não enviou transações
            return [];
        }

        try {
            // Retorna as transações decodificadas do JSON embutido
            return JSON.parse(initialTransactionsSource.textContent || '[]');
        } catch (error) {
            // Retorna lista vazia quando o JSON inicial está inválido
            return [];
        }
    }

    // Renderiza o resumo de despesas agrupadas
    function renderSummary(selector, items) {
        // Carrega o container correspondente ao tipo de resumo
        const container = document.querySelector(selector);

        // Verifica se o container existe na tela
        if (!container) {
            // Interrompe a renderização quando o container não existe
            return;
        }

        // Limpa os dados do ciclo exibido anteriormente
        container.replaceChildren();

        // Verifica se o ciclo não possui despesas agrupadas
        if (items.length === 0) {
            // Inicializa a mensagem de estado vazio
            const empty = document.createElement('p');
            empty.className = 'text-sm text-secondary';
            empty.textContent = 'nenhuma saída neste ciclo.';

            // Salva a mensagem no container do resumo
            container.appendChild(empty);
            return;
        }

        // Percorre os grupos de despesas do ciclo
        items.forEach(function (item) {
            // Inicializa a linha do resumo
            const wrapper = document.createElement('div');

            // Inicializa a linha com o nome e o valor do grupo
            const row = document.createElement('div');
            row.className = 'flex items-center justify-between gap-4 text-sm';

            // Define o nome do grupo
            const label = document.createElement('span');
            label.className = 'truncate';
            label.textContent = item.label;

            // Define o valor total do grupo
            const amount = document.createElement('strong');
            amount.textContent = item.amountLabel;

            // Inicializa o fundo da barra percentual
            const track = document.createElement('div');
            track.className = 'mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--secondary)]';

            // Define o preenchimento percentual da barra
            const fill = document.createElement('div');
            fill.className = 'h-full rounded-full bg-[var(--primary)] transition-all duration-300';
            fill.style.width = item.percentage + '%';

            // Salva os elementos da linha no container
            row.append(label, amount);
            track.appendChild(fill);
            wrapper.append(row, track);
            container.appendChild(wrapper);
        });
    }

    function renderTransactions(transactions) {
        content.replaceChildren();

        if (transactions.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'rounded border border-[var(--secondary)] bg-[var(--light)] p-4 text-sm text-secondary';
            empty.textContent = hasActiveTransactionFilter()
                ? 'nenhum lançamento encontrado para os filtros selecionados.'
                : 'nenhum lançamento neste ciclo.';
            content.appendChild(empty);
            return;
        }

        transactions.forEach(function (transaction) {
            content.appendChild(createTransactionButton(transaction));
        });
    }

    // Verifica se algum filtro de transação está ativo
    function hasActiveTransactionFilter() {
        // Retorna se existe filtro por entidade, tipo ou status
        return Boolean(transactionFilters.entityId || hasActiveTypeFilter() || hasActiveStatusFilter());
    }

    // Verifica se o filtro por tipo restringe algum resultado
    function hasActiveTypeFilter() {
        // Retorna se apenas uma das opções de tipo está selecionada
        return countSelectedTypes() !== Object.keys(transactionFilters.type).length;
    }

    // Verifica se o filtro por status restringe algum resultado
    function hasActiveStatusFilter() {
        // Retorna se apenas uma das opções de status está selecionada
        return countSelectedStatuses() !== Object.keys(transactionFilters.status).length;
    }

    // Verifica se a transação está marcada como paga
    function isTransactionPaid(transaction) {
        // Retorna se o campo pago equivale ao valor persistido como verdadeiro
        return String(transaction.paid || '') === '1' || transaction.paid === true;
    }

    // Abre a página preparada para imprimir o ciclo visualizado
    function printCycle() {
        // Verifica se a rota de impressão foi informada
        if (!printButton.dataset.printUrl) {
            // Interrompe quando não existe uma rota configurada
            return;
        }

        // Inicializa os parametros usados pela impressao filtrada
        const params = new URLSearchParams();

        // Define a data inicial do ciclo atual
        params.set('date', card.dataset.cycleStart);

        // Verifica se existe filtro por entidade ativo
        if (transactionFilters.entityId) {
            // Define a entidade filtrada para a impressao
            params.set('entity_id', transactionFilters.entityId);
        }

        // Define os tipos selecionados para a impressao
        params.set('types', getSelectedFilterKeys(transactionFilters.type).join(','));

        // Define os status selecionados para a impressao
        params.set('statuses', getSelectedFilterKeys(transactionFilters.status).join(','));

        // Define a URL com os filtros do ciclo atual
        const printUrl = printButton.dataset.printUrl + '?' + params.toString();

        // Abre a pré-visualização em uma nova aba
        window.open(printUrl, '_blank', 'noopener');
    }

    // Carrega as chaves selecionadas de um filtro baseado em badges
    function getSelectedFilterKeys(filter) {
        // Retorna apenas as chaves marcadas no estado do filtro
        return Object.keys(filter).filter(function (key) {
            // Verifica se a chave atual esta selecionada
            return filter[key];
        });
    }

    function createTransactionButton(transaction) {
        // Inicializa a linha que separa acao lateral e edicao
        const wrapper = document.createElement('div');
        wrapper.className = 'group relative flex items-center gap-2 overflow-hidden rounded md:block md:overflow-visible';

        // Verifica se o lancamento real deve aceitar gesto de arrastar
        if (!transaction.is_virtual) {
            // Define o wrapper como alvo do swipe de exclusao no mobile
            wrapper.setAttribute('data-swipe-transaction', '');
        }

        // Inicializa o fundo revelado pelo gesto de arrastar
        const swipeAction = createSwipeAction(transaction);

        // Inicializa a acao lateral do lancamento
        const sideAction = createTransactionSideAction(transaction);

        // Inicializa o card clicavel usado para edicao
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'relative z-10 grid min-w-0 flex-1 touch-pan-y gap-3 rounded border border-[var(--secondary)] bg-[var(--light)] p-3 text-left transition-transform md:w-full sm:grid-cols-[1fr_auto] sm:items-center';
        button.setAttribute('data-edit-transaction', '');
        button.setAttribute('data-swipe-card', '');

        // Verifica se a transacao deve receber destaque visual de pagamento
        if (isTransactionPaid(transaction)) {
            button.classList.add('opacity-80');
        }

        setTransactionData(button, transaction);

        const identity = document.createElement('div');
        identity.className = 'flex items-center gap-3';

        const categoryIcon = document.createElement('div');
        categoryIcon.className = 'flex h-10 w-10 items-center justify-center rounded-full text-light';
        categoryIcon.style.backgroundColor = transaction.category.color;

        const iconElement = document.createElement('i');
        String(transaction.category.icon || 'fa-solid fa-tag').split(' ').forEach(function (className) {
            if (className) {
                iconElement.classList.add(className);
            }
        });
        categoryIcon.appendChild(iconElement);

        const text = document.createElement('div');
        const title = document.createElement('h3');
        title.className = 'font-medium';
        title.textContent = transaction.title;

        const meta = document.createElement('p');
        meta.className = 'text-xs text-secondary';
        meta.textContent = transaction.meta_label;
        text.append(title, meta);
        identity.append(categoryIcon, text);

        const summary = document.createElement('div');
        summary.className = 'flex items-center justify-between gap-4 sm:block sm:text-right';

        const date = document.createElement('span');
        date.className = 'text-xs text-secondary';
        date.textContent = transaction.date_label;

        const amount = document.createElement('strong');
        amount.className = 'block text-sm';
        amount.classList.add(transaction.type === 'I' ? 'text-primary' : 'text-[var(--dark)]');
        amount.textContent = transaction.amount_label;

        const status = document.createElement('span');
        status.className = 'badge';
        if (transaction.is_virtual) {
            status.classList.add('badge-scheduled');
        }
        status.textContent = transaction.status_label;
        summary.append(date, amount, status);

        button.append(identity, summary);
        wrapper.append(swipeAction, sideAction, button);

        return wrapper;
    }

    function createSwipeAction(transaction) {
        // Inicializa o fundo de exclusao revelado no mobile
        const swipeAction = document.createElement('div');

        // Verifica se lancamentos previstos nao podem ser excluidos por swipe
        if (transaction.is_virtual) {
            // Retorna um fragmento vazio para manter a montagem uniforme
            return document.createDocumentFragment();
        }

        // Define a aparencia do fundo de exclusao
        swipeAction.className = 'absolute inset-y-0 right-0 flex w-24 items-center justify-end rounded border border-[var(--secondary)] bg-[var(--secondary-dark)] pr-5 text-[var(--primary)] md:hidden';
        swipeAction.setAttribute('aria-hidden', 'true');

        // Define o icone exibido durante o arraste
        const icon = document.createElement('i');
        icon.className = 'fa-regular fa-trash-can';
        swipeAction.appendChild(icon);

        return swipeAction;
    }

    function createTransactionSideAction(transaction) {
        // Verifica se o lancamento previsto deve esconder a lixeira
        if (transaction.is_virtual) {
            // Reserva o espaco visual usado pela acao lateral dos lancamentos reais
            const placeholder = document.createElement('span');
            placeholder.className = 'hidden h-9 w-9 shrink-0 md:absolute md:-left-12 md:top-1/2 md:block md:-translate-y-1/2';

            return placeholder;
        }

        // Inicializa o formulario usado pelo modal de confirmacao
        const deleteForm = document.createElement('form');
        deleteForm.method = 'post';
        deleteForm.action = card.dataset.transactionDeleteUrl || '';
        deleteForm.className = 'hidden shrink-0 md:absolute md:-left-12 md:top-1/2 md:flex md:-translate-y-1/2';

        // Define o identificador enviado para exclusao
        const deleteInput = document.createElement('input');
        deleteInput.type = 'hidden';
        deleteInput.name = 'id';
        deleteInput.value = transaction.id || '';

        // Inicializa o botao de exclusao da transacao
        const deleteButton = document.createElement('button');
        deleteButton.type = 'submit';
        deleteButton.className = 'flex h-9 w-9 cursor-pointer items-center justify-center rounded text-secondary transition hover:bg-[var(--secondary)] hover:text-primary';
        deleteButton.setAttribute('data-delete-button', '');
        deleteButton.setAttribute('aria-label', 'Excluir transacao');
        deleteButton.title = 'Excluir transacao';

        // Define o icone da acao de exclusao
        const deleteIcon = document.createElement('i');
        deleteIcon.className = 'fa-regular fa-trash-can';
        deleteButton.appendChild(deleteIcon);
        deleteForm.append(deleteInput, deleteButton);

        return deleteForm;
    }

    function setTransactionData(button, transaction) {
        // Define o identificador da transacao real quando existir
        button.dataset.transactionId = transaction.id || '';

        // Verifica se o lancamento veio de um template previsto
        if (transaction.is_virtual) {
            // Define os dados usados para abrir o modal sem buscar uma transacao real
            button.dataset.transactionPayload = JSON.stringify(transaction);
        }
    }
    function initializeSwipeActions() {
        // Verifica se o conteudo do ciclo esta disponivel
        if (!content) {
            // Interrompe a inicializacao sem lista de lancamentos
            return;
        }

        // Inicializa o gesto de arraste no inicio do toque
        content.addEventListener('pointerdown', startSwipeAction);

        // Atualiza o deslocamento enquanto o usuario arrasta
        content.addEventListener('pointermove', moveSwipeAction);

        // Finaliza o gesto ao soltar o toque
        content.addEventListener('pointerup', finishSwipeAction);

        // Cancela o gesto quando o navegador interrompe o ponteiro
        content.addEventListener('pointercancel', cancelSwipeAction);

        // Evita abrir o modal de edicao logo apos um swipe
        content.addEventListener('click', suppressClickAfterSwipe, true);
    }

    function startSwipeAction(event) {
        // Verifica se o layout atual permite swipe
        if (!isMobileLayout()) {
            // Interrompe o swipe fora do mobile
            return;
        }

        // Verifica se o gesto principal foi iniciado
        if (event.button !== 0) {
            // Interrompe botoes secundarios do ponteiro
            return;
        }

        // Carrega o card que pode ser arrastado
        const cardButton = event.target.closest('[data-swipe-card]');

        // Carrega o wrapper que representa uma transacao real
        const wrapper = event.target.closest('[data-swipe-transaction]');

        // Verifica se existe um card arrastavel
        if (!cardButton || !wrapper || !content.contains(wrapper)) {
            // Interrompe toques fora das transacoes reais
            return;
        }

        // Define o estado inicial do gesto
        activeSwipe = {
            wrapper: wrapper,
            card: cardButton,
            startX: event.clientX,
            startY: event.clientY,
            currentX: 0,
            dragging: false
        };

        // Remove transicoes durante o arraste manual
        cardButton.style.transition = 'none';

        // Verifica se o navegador permite capturar o ponteiro durante o gesto
        if (cardButton.setPointerCapture) {
            // Define que o card continua recebendo os eventos ate o fim do toque
            cardButton.setPointerCapture(event.pointerId);
        }
    }

    function moveSwipeAction(event) {
        // Verifica se existe um gesto em andamento
        if (!activeSwipe) {
            // Interrompe movimentos sem swipe ativo
            return;
        }

        // Calcula o deslocamento horizontal e vertical
        const deltaX = event.clientX - activeSwipe.startX;
        const deltaY = event.clientY - activeSwipe.startY;

        // Verifica se o movimento vertical deve continuar como rolagem normal
        if (!activeSwipe.dragging && Math.abs(deltaY) > 10 && Math.abs(deltaY) > Math.abs(deltaX)) {
            // Cancela o swipe para preservar a rolagem da pagina
            cancelSwipeAction();
            return;
        }

        // Verifica se ainda nao houve deslocamento suficiente para iniciar o swipe
        if (!activeSwipe.dragging && Math.abs(deltaX) < 6) {
            // Aguarda um movimento horizontal mais claro
            return;
        }

        // Verifica se o usuario arrastou para a esquerda
        if (deltaX >= 0) {
            // Mantem o card no lugar ao arrastar para a direita
            setSwipeOffset(0);
            return;
        }

        // Define que o gesto virou um arraste horizontal
        activeSwipe.dragging = true;

        // Evita selecao/click enquanto o card esta sendo arrastado
        event.preventDefault();

        // Calcula o deslocamento limitado do card
        const offset = Math.max(deltaX, -96);
        activeSwipe.currentX = offset;
        setSwipeOffset(offset);
    }

    function finishSwipeAction() {
        // Verifica se existe um gesto em andamento
        if (!activeSwipe) {
            // Interrompe finalizacao sem swipe ativo
            return;
        }

        // Define se o arraste passou do limite de exclusao
        const shouldConfirmDelete = activeSwipe.currentX <= -72;
        const state = activeSwipe;

        // Marca o clique seguinte para nao abrir a edicao
        if (state.dragging) {
            // Define a supressao do clique gerado apos o pointerup
            state.card.dataset.swipeSuppressClick = '1';
        }

        // Restaura a transicao visual do card
        state.card.style.transition = '';

        // Verifica se deve abrir o modal de confirmacao
        if (shouldConfirmDelete) {
            // Mantem o card deslocado enquanto a confirmacao abre
            state.card.style.transform = 'translateX(-96px)';
            triggerSwipeDelete(state.wrapper);

            // Retorna o card para a posicao inicial se a exclusao for cancelada
            window.setTimeout(function () {
                // Define a posicao original do card apos abrir a confirmacao
                state.card.style.transform = '';
            }, 180);
        } else {
            // Retorna o card para a posicao inicial
            state.card.style.transform = '';
        }

        // Limpa o gesto ativo
        activeSwipe = null;
    }

    function cancelSwipeAction() {
        // Verifica se existe swipe para cancelar
        if (!activeSwipe) {
            // Interrompe cancelamentos sem gesto ativo
            return;
        }

        // Restaura o card para a posicao inicial
        activeSwipe.card.style.transition = '';
        activeSwipe.card.style.transform = '';
        activeSwipe = null;
    }

    function suppressClickAfterSwipe(event) {
        // Carrega o card que recebeu o clique apos o gesto
        const cardButton = event.target.closest('[data-swipe-card]');

        // Verifica se o clique deve ser ignorado
        if (!cardButton || cardButton.dataset.swipeSuppressClick !== '1') {
            // Permite cliques normais
            return;
        }

        // Remove a marcacao para permitir cliques futuros
        delete cardButton.dataset.swipeSuppressClick;

        // Interrompe o clique gerado pelo fim do arraste
        event.preventDefault();
        event.stopPropagation();
    }

    function setSwipeOffset(offset) {
        // Verifica se existe um card ativo para deslocar
        if (!activeSwipe) {
            // Interrompe sem gesto ativo
            return;
        }

        // Aplica o deslocamento horizontal do card
        activeSwipe.card.style.transform = offset === 0 ? '' : 'translateX(' + offset + 'px)';
    }

    function triggerSwipeDelete(wrapper) {
        // Carrega o botao de exclusao usado pelo modal compartilhado
        const deleteButton = wrapper.querySelector('[data-delete-button]');

        // Verifica se existe um botao confirmavel
        if (!deleteButton) {
            // Interrompe quando nao existe acao de exclusao
            return;
        }

        // Aciona o fluxo de confirmacao existente
        deleteButton.click();
    }

    function isMobileLayout() {
        // Retorna se o viewport esta abaixo do breakpoint md
        return window.matchMedia('(max-width: 767px)').matches;
    }
    function initializeCollapse() {
        if (!toggle || !content || !icon) {
            return;
        }

        content.style.overflow = 'hidden';
        content.style.maxHeight = getExpandedContentHeight();

        toggle.addEventListener('click', function () {
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true';

            toggle.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
            content.style.maxHeight = isExpanded ? '0px' : getExpandedContentHeight();
            content.classList.toggle('mt-5', !isExpanded);
            icon.classList.toggle('rotate-180', isExpanded);
        });

        window.addEventListener('resize', function () {
            if (toggle.getAttribute('aria-expanded') === 'true') {
                content.style.maxHeight = getExpandedContentHeight();
            }
        });
    }

    // Calcula a altura expandida com folga para bordas e sombras
    function getExpandedContentHeight() {
        // Calcula alguns pixels adicionais além do conteúdo real
        const visualSpacing = 8;

        return content.scrollHeight + visualSpacing + 'px';
    }

    // Atualiza a altura do conteúdo quando o painel está expandido
    function refreshExpandedContentHeight() {
        // Verifica se o conteúdo do ciclo está expandido
        if (toggle && content && toggle.getAttribute('aria-expanded') === 'true') {
            // Recalcula a altura depois da renderização da lista
            requestAnimationFrame(function () {
                content.style.maxHeight = getExpandedContentHeight();
            });
        }
    }

    function setText(selector, value) {
        const element = document.querySelector(selector);

        if (element) {
            element.textContent = value;
        }
    }

    function setLoading(isLoading) {
        previousButton.disabled = isLoading;
        nextButton.disabled = isLoading;
        card.classList.toggle('opacity-60', isLoading);
    }

    function rememberCycle(referenceDate, cycle) {
        if (cache.size >= 3) {
            cache.delete(cache.keys().next().value);
        }

        cache.set(referenceDate, cycle);
    }

    function subtractDay(date) {
        if (!date) {
            return '';
        }

        const value = new Date(date + 'T12:00:00');
        value.setDate(value.getDate() - 1);

        return [
            value.getFullYear(),
            String(value.getMonth() + 1).padStart(2, '0'),
            String(value.getDate()).padStart(2, '0')
        ].join('-');
    }
})();
