(function () {
    // Inicializa o registro compartilhado de modais
    const controllers = new WeakMap();

    function create(modal, options) {
        // Define as configurações opcionais do modal
        const settings = {
            onClose: null
        };

        // Define as configurações recebidas durante a criação
        Object.assign(settings, options || {});

        // Verifica se o elemento informado é um dialog válido
        if (!modal) {
            // Interrompe a criação quando o modal não existe
            return null;
        }

        // Carrega o controlador criado anteriormente para o mesmo modal
        const existingController = controllers.get(modal);

        // Verifica se o modal já foi inicializado
        if (existingController) {
            // Verifica se foram recebidas novas configurações
            if (options) {
                // Define o callback atualizado para o fechamento
                existingController.configure(options);
            }

            return existingController;
        }

        // Fecha o modal quando o usuário clica no backdrop
        modal.addEventListener('click', function (event) {
            // Verifica se o clique ocorreu fora do conteúdo
            if (event.target === modal) {
                close();
            }
        });

        // Intercepta o Escape para preservar a animação de saída
        modal.addEventListener('cancel', function (event) {
            // Impede o fechamento nativo imediato
            event.preventDefault();
            close();
        });

        // Abre o dialog e inicia a animação de entrada
        function open() {
            // Verifica se o modal já está aberto
            if (modal.open) {
                // Interrompe uma segunda abertura do mesmo modal
                return;
            }

            modal.showModal();

            // Remove o estado visual inicial no próximo frame
            requestAnimationFrame(function () {
                modal.classList.remove('scale-95', 'opacity-0');
                modal.classList.add('scale-100', 'opacity-100');
            });
        }

        // Fecha o dialog após a animação de saída
        function close() {
            // Verifica se o modal está fechado
            if (!modal.open) {
                // Interrompe um fechamento desnecessário
                return;
            }

            modal.classList.remove('scale-100', 'opacity-100');
            modal.classList.add('scale-95', 'opacity-0');

            // Aguarda a transição visual antes de fechar o dialog
            setTimeout(function () {
                modal.close();

                // Percorre os comboboxes internos para fechar menus abertos
                modal.querySelectorAll('[data-select]').forEach(function (select) {
                    // Verifica se o controlador compartilhado está disponível
                    if (window.CicloSelect) {
                        window.CicloSelect.get(select).close();
                    }
                });

                // Verifica se existe uma rotina específica de fechamento
                if (typeof settings.onClose === 'function') {
                    settings.onClose();
                }
            }, 180);
        }

        // Define o controlador público do modal
        const controller = {
            open: open,
            close: close,
            configure: function (newSettings) {
                // Define as novas configurações sem recriar o modal
                Object.assign(settings, newSettings || {});
            }
        };

        // Salva o controlador para reutilização
        controllers.set(modal, controller);

        return controller;
    }

    // Carrega o modal indicado por um seletor ou elemento
    function get(target) {
        // Define o elemento correspondente ao destino informado
        const modal = typeof target === 'string'
            ? document.querySelector(target)
            : target;

        return create(modal);
    }

    // Percorre todos os modais declarados na página
    document.querySelectorAll('dialog.modal').forEach(function (modal) {
        // Inicializa o controlador do modal atual
        create(modal);
    });

    // Intercepta toggles e botões de fechamento de forma centralizada
    document.addEventListener('click', function (event) {
        // Carrega o toggle de modal mais próximo do clique
        const toggle = event.target.closest('.modal-toggle[data-modal-target]');

        // Verifica se o clique ocorreu em um toggle
        if (toggle) {
            // Carrega e abre o modal correspondente ao atributo do toggle
            const controller = get(toggle.dataset.modalTarget);

            // Verifica se o modal de destino foi encontrado
            if (controller) {
                controller.open();
            }

            return;
        }

        // Carrega o botão de fechamento mais próximo do clique
        const closeButton = event.target.closest('.modal-close');

        // Verifica se o clique ocorreu em um botão de fechamento
        if (!closeButton) {
            // Interrompe quando o clique não possui ação de modal
            return;
        }

        // Carrega o dialog que contém o botão
        const modal = closeButton.closest('dialog.modal');
        const controller = get(modal);

        // Verifica se o controlador foi encontrado
        if (controller) {
            controller.close();
        }
    });

    window.CicloModal = {
        create: create,
        get: get
    };
})();
