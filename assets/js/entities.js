(function () {
    // Carrega os elementos principais do formulário de entidade
    const modal = document.querySelector('[data-entity-modal]');
    const form = document.querySelector('[data-entity-form]');
    const openButton = document.querySelector('.modal-toggle[data-modal-target="#entity-modal"]');
    const editButtons = document.querySelectorAll('[data-edit-entity]');
    const idInput = document.querySelector('[data-entity-id-input]');
    const nameInput = document.querySelector('[data-entity-name-input]');
    const modalTitle = document.querySelector('[data-entity-modal-title]');

    // Carrega os controladores compartilhados do modal e do combobox
    const entityModal = window.CicloModal ? window.CicloModal.get(modal) : null;
    const typeSelect = window.CicloSelect && modal
        ? window.CicloSelect.get(modal.querySelector('[data-select]'))
        : null;

    // Define a URL usada para carregar os dados da edição
    const findUrl = modal ? modal.dataset.entityFindUrl : '';

    // Verifica se a estrutura obrigatória está disponível
    if (!entityModal || !form || !openButton || !idInput || !nameInput || !typeSelect || !modalTitle || !findUrl) {
        // Interrompe a inicialização quando a tela está incompleta
        return;
    }

    // Prepara o formulário antes de abrir uma nova entidade
    openButton.addEventListener('click', function () {
        resetForm();
    });

    // Percorre os botões de edição existentes na página
    editButtons.forEach(function (button) {
        // Carrega a entidade correspondente ao botão
        button.addEventListener('click', function () {
            fetchEntity(button.dataset.entityId);
        });
    });

    // Restaura os valores iniciais do formulário
    function resetForm() {
        form.reset();
        idInput.value = '';
        typeSelect.reset();
        modalTitle.textContent = 'nova entidade';
    }

    // Preenche o formulário com os dados da entidade
    function fillForm(entity) {
        idInput.value = entity.id;
        nameInput.value = entity.name;
        modalTitle.textContent = 'editar entidade';
        typeSelect.set(entity.type_id, '', false);
    }

    // Carrega uma entidade pelo endpoint JSON
    function fetchEntity(id) {
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
                    throw new Error('entity not found');
                }

                return response.json();
            })
            .then(function (entity) {
                // Verifica se a entidade foi encontrada
                if (!entity) {
                    // Interrompe o preenchimento sem dados
                    return;
                }

                fillForm(entity);
                entityModal.open();
            });
    }
})();
