(function () {
    // Carrega os elementos principais do formulário de transação
    const modal = document.querySelector('[data-transaction-modal]');
    const form = document.querySelector('[data-transaction-form]');
    const openButtons = document.querySelectorAll('.modal-toggle[data-modal-target="#transaction-modal"]');
    const paidInput = document.querySelector('[data-transaction-paid-input]');
    const definesCycleInput = document.querySelector('[data-transaction-defines-cycle-input]');
    const modalTitle = document.querySelector('[data-transaction-modal-title]');

    // Carrega o controlador compartilhado do modal
    const transactionModal = window.CicloModal ? window.CicloModal.get(modal) : null;

    // Define a URL usada para carregar os dados da edição
    const findUrl = modal ? modal.dataset.transactionFindUrl : '';

    // Controla a requisição de edição em andamento para evitar respostas obsoletas
    let activeFetchController = null;

    // Carrega os comboboxes compartilhados do formulário
    const selects = {
        type: getSelect('type'),
        wallet: getSelect('wallet'),
        category: getSelect('category'),
        entity: getSelect('entity'),
        template: getSelect('template'),
        'payment-method': getSelect('payment-method')
    };

    // Verifica se a estrutura obrigatória está disponível
    if (!transactionModal || !form || !paidInput || !definesCycleInput || Object.values(selects).some(function (select) {
        return !select;
    })) {
        // Interrompe a inicialização quando a tela está incompleta
        return;
    }

    // Percorre os toggles usados para criar uma transação
    openButtons.forEach(function (button) {
        // Prepara o formulário antes da abertura declarativa
        button.addEventListener('click', function () {
            // Aborta edição em andamento para evitar que a resposta tardia sobrescreva o formulário vazio
            if (activeFetchController) {
                activeFetchController.abort();
                activeFetchController = null;
            }

            resetForm();
        });
    });

    // Intercepta cliques nos lancamentos editaveis
    document.addEventListener('click', function (event) {
        // Carrega o botao de edicao mais proximo do clique
        const button = event.target.closest('[data-edit-transaction]');

        // Verifica se o clique ocorreu em um lancamento editavel
        if (!button) {
            // Interrompe quando nao existe um lancamento para editar
            return;
        }

        // Verifica se o lancamento previsto possui dados embutidos
        if (button.dataset.transactionPayload) {
            // Aborta edicao real em andamento antes de abrir uma previsao
            if (activeFetchController) {
                // Interrompe a requisicao pendente para evitar sobrescrita tardia
                activeFetchController.abort();
                activeFetchController = null;
            }

            // Preenche o modal com a previsao sem buscar uma transacao real
            fillScheduledTransaction(button.dataset.transactionPayload);
            return;
        }

        // Verifica se existe uma transacao real para carregar
        if (!button.dataset.transactionId) {
            // Interrompe quando nao existe uma transacao para editar
            return;
        }

        // Carrega a transacao real pelo endpoint JSON
        fetchTransaction(button.dataset.transactionId);
    });
    // Aplica os dados relacionados quando o usuário escolhe um template
    selects.template.element.addEventListener('ciclo:select-change', function (event) {
        // Verifica se a opção selecionada possui dados de template
        if (!event.detail.option) {
            // Interrompe quando o template foi limpo
            return;
        }

        applyTemplate(event.detail.option);
    });

    // Restaura os valores iniciais do formulário
    function resetForm() {
        form.reset();
        form.elements.amount.value = '0,00';
        form.elements.occurrence_date.value = new Date().toISOString().slice(0, 10);
        paidInput.checked = false;
        definesCycleInput.checked = false;
        setModalTitle(window.CicloTranslate('transactions.new_record', 'novo registro'));

        // Percorre os comboboxes para restaurar seus placeholders
        Object.values(selects).forEach(function (select) {
            select.reset();
        });

        applyDefaults();
    }

    // Carrega uma transação pelo endpoint JSON e preenche o formulário
    function fetchTransaction(id) {
        // Verifica se a rota de busca foi configurada
        if (!findUrl) {
            return;
        }

        // Aborta requisição anterior em andamento para descartar respostas obsoletas
        if (activeFetchController) {
            activeFetchController.abort();
        }

        const controller = new AbortController();
        activeFetchController = controller;

        // Prepara o formulário e abre o modal antes da resposta para mascarar a latência
        resetForm();
        setModalTitle(window.CicloTranslate('transactions.loading', 'carregando...'));
        transactionModal.open();

        fetch(findUrl + '?id=' + encodeURIComponent(id), {
            headers: {
                'Accept': 'application/json'
            },
            signal: controller.signal
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('transaction not found');
                }

                return response.json();
            })
            .then(function (transaction) {
                // Verifica se a transação foi encontrada
                if (!transaction) {
                    transactionModal.close();
                    return;
                }

                fillForm(transaction);
            })
            .catch(function (error) {
                // Ignora cancelamentos explícitos de requisições obsoletas
                if (error && error.name === 'AbortError') {
                    return;
                }

                transactionModal.close();
            });
    }

    // Preenche o formulário com os dados da transação
    function fillForm(transaction) {
        form.elements.id.value = transaction.id || '';
        form.elements.title.value = transaction.title || '';
        form.elements.amount.value = formatMoney(transaction.amount);
        form.elements.occurrence_date.value = transaction.occurrence_date || '';
        form.elements.due_date.value = transaction.due_date || '';
        form.elements.paid_at.value = transaction.paid_at || '';
        paidInput.checked = !!Number(transaction.paid);
        definesCycleInput.checked = !!Number(transaction.defines_cycle);
        setModalTitle(window.CicloTranslate('transactions.edit', 'editar registro'));

        // Define os relacionamentos selecionados; o label resolve a partir do data-value-label das opções
        selects.type.set(transaction.type, '', false);
        selects.wallet.set(transaction.wallet_id, '', false);
        selects.category.set(transaction.category_id, '', false);
        selects.entity.set(transaction.entity_id, '', false);
        selects.template.set(transaction.template_id, '', false);
        selects['payment-method'].set(transaction.payment_method_id, '', false);
    }

    // Preenche o formulario com uma previsao criada a partir de template
    function fillScheduledTransaction(payload) {
        try {
            // Carrega os dados serializados no botao da dashboard
            const transaction = JSON.parse(payload || '{}');

            // Prepara o formulario como uma nova transacao real
            resetForm();
            fillForm(transaction);
            form.elements.id.value = '';
            setModalTitle(window.CicloTranslate('transactions.confirm_forecast', 'confirmar previsao'));
            transactionModal.open();
        } catch (error) {
            // Interrompe a abertura quando os dados da previsao estao invalidos
            transactionModal.close();
        }
    }
    // Define o título exibido no modal
    function setModalTitle(title) {
        // Verifica se o título está disponível
        if (modalTitle) {
            modalTitle.textContent = title;
        }
    }

    // Carrega um combobox do formulário pelo nome
    function getSelect(name) {
        // Verifica se a API compartilhada e o modal estão disponíveis
        if (!window.CicloSelect || !modal) {
            // Interrompe a busca sem a estrutura compartilhada
            return null;
        }

        return window.CicloSelect.get(modal.querySelector('[data-select-name="' + name + '"]'));
    }

    // Aplica as configurações padrão do usuário
    function applyDefaults() {
        applyDefaultSelect('type', modal.dataset.defaultType);
        applyDefaultSelect('wallet', modal.dataset.defaultWalletId);
        applyDefaultSelect('entity', modal.dataset.defaultEntityId);
        applyDefaultSelect('payment-method', modal.dataset.defaultPaymentMethodId);
    }

    // Define o valor padrão de um combobox
    function applyDefaultSelect(name, id) {
        // Verifica se existe um valor configurado
        if (!id) {
            // Interrompe quando não existe configuração padrão
            return;
        }

        selects[name].set(id, '', false);
    }

    // Preenche os campos relacionados ao template selecionado
    function applyTemplate(option) {
        form.elements.title.value = option.dataset.valueLabel || '';
        form.elements.amount.value = formatMoney(option.dataset.templateAmount);
        form.elements.occurrence_date.value = getNextDateFromMonthDay(option.dataset.templateMonthDay);
        definesCycleInput.checked = !!Number(option.dataset.templateDefinesCycle);
        selects.type.set(option.dataset.templateType, '', false);
        selects.wallet.set(option.dataset.templateWalletId, option.dataset.templateWalletName, false);
        selects.category.set(option.dataset.templateCategoryId, option.dataset.templateCategoryName, false);
        selects.entity.set(option.dataset.templateEntityId, option.dataset.templateEntityName, false);
    }

    // Calcula a próxima ocorrência para o dia mensal do template
    function getNextDateFromMonthDay(monthDay) {
        // Inicializa a data atual e limita o dia informado
        const today = new Date();
        const day = Math.min(Math.max(Number(monthDay || 1), 1), 31);
        const year = today.getFullYear();
        let month = today.getMonth();
        let date = createDate(year, month, day);

        // Verifica se a ocorrência deste mês já passou
        if (date < startOfDay(today)) {
            // Define a ocorrência para o próximo mês
            month += 1;
            date = createDate(year, month, day);
        }

        return formatDate(date);
    }

    // Cria uma data respeitando o último dia do mês
    function createDate(year, month, day) {
        // Calcula o último dia disponível no mês
        const lastDay = new Date(year, month + 1, 0).getDate();

        return new Date(year, month, Math.min(day, lastDay));
    }

    // Remove o horário de uma data
    function startOfDay(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    // Formata uma data para o valor aceito pelo input
    function formatDate(date) {
        // Define as partes normalizadas da data
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return year + '-' + month + '-' + day;
    }

    // Formata um valor para o padrão monetário do formulário
    function formatMoney(value) {
        // Define o valor numérico recebido
        const number = Number(String(value || '0').replace(',', '.'));

        // Verifica se o valor recebido é inválido
        if (Number.isNaN(number)) {
            // Retorna o valor monetário vazio
            return '0,00';
        }

        return number.toFixed(2).replace('.', ',');
    }
})();
