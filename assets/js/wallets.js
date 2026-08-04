(function () {
    // Carrega os elementos principais do formulário de wallet
    const modal = document.querySelector('[data-wallet-modal]');
    const form = document.querySelector('[data-wallet-form]');
    const openButton = document.querySelector('.modal-toggle[data-modal-target="#wallet-modal"]');
    const editButtons = document.querySelectorAll('[data-edit-wallet]');
    const idInput = document.querySelector('[data-wallet-id-input]');
    const nameInput = document.querySelector('[data-wallet-name-input]');
    const balanceInput = document.querySelector('[data-wallet-balance-input]');
    const activeInput = document.querySelector('[data-wallet-active-input]');
    const modalTitle = document.querySelector('[data-wallet-modal-title]');

    // Carrega os controladores compartilhados do modal e do combobox
    const walletModal = window.CicloModal ? window.CicloModal.get(modal) : null;
    const typeSelect = window.CicloSelect && modal
        ? window.CicloSelect.get(modal.querySelector('[data-select]'))
        : null;

    // Define a URL usada para carregar os dados da edição
    const findUrl = modal ? modal.dataset.walletFindUrl : '';

    // Verifica se a estrutura obrigatória está disponível
    if (!walletModal || !form || !openButton || !idInput || !nameInput || !typeSelect || !balanceInput || !activeInput || !modalTitle || !findUrl) {
        // Interrompe a inicialização quando a tela está incompleta
        return;
    }

    // Prepara o formulário antes de abrir uma nova wallet
    openButton.addEventListener('click', function () {
        resetForm();
    });

    // Percorre os botões de edição existentes na página
    editButtons.forEach(function (button) {
        // Carrega a wallet correspondente ao botão
        button.addEventListener('click', function () {
            fetchWallet(button.dataset.walletId);
        });
    });

    // Restaura os valores iniciais do formulário
    function resetForm() {
        form.reset();
        idInput.value = '';
        typeSelect.reset();
        balanceInput.value = '0,00';
        activeInput.checked = true;
        modalTitle.textContent = 'nova wallet';
    }

    // Preenche o formulário com os dados da wallet
    function fillForm(wallet) {
        idInput.value = wallet.id;
        nameInput.value = wallet.name;
        balanceInput.value = formatBalance(wallet.initial_balance);
        activeInput.checked = wallet.active === true || wallet.active === 1 || wallet.active === '1';
        modalTitle.textContent = 'editar wallet';
        typeSelect.set(wallet.type_id, '', false);
    }

    // Carrega uma wallet pelo endpoint JSON
    function fetchWallet(id) {
        // Verifica se o identificador foi informado
        if (!id) {
            // Interrompe a busca sem identificador
            return;
        }

        fetch(findUrl + '?id=' + encodeURIComponent(id), {
            headers: {
                'Accept': 'application/json'
            }
        })
            .then(function (response) {
                // Verifica se a resposta foi concluída com sucesso
                if (!response.ok) {
                    throw new Error('wallet not found');
                }

                return response.json();
            })
            .then(function (wallet) {
                // Verifica se a wallet foi encontrada
                if (!wallet) {
                    // Interrompe o preenchimento sem dados
                    return;
                }

                fillForm(wallet);
                walletModal.open();
            });
    }

    // Formata o saldo para o padrão monetário do formulário
    function formatBalance(value) {
        // Define o valor numérico recebido do backend
        const number = Number(String(value).replace(',', '.'));

        // Verifica se o saldo recebido é inválido
        if (Number.isNaN(number)) {
            // Retorna o saldo inicial vazio
            return '0,00';
        }

        return number.toFixed(2).replace('.', ',');
    }
})();
