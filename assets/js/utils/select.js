(function () {
    // Inicializa o registro compartilhado de comboboxes
    const controllers = new WeakMap();

    // Inicializa um combobox declarado na página
    function create(select) {
        // Verifica se o container foi informado
        if (!select) {
            // Interrompe a criação quando o combobox não existe
            return null;
        }

        // Carrega o controlador criado anteriormente
        const existingController = controllers.get(select);

        // Verifica se o combobox já foi inicializado
        if (existingController) {
            // Retorna o controlador existente
            return existingController;
        }

        // Carrega os elementos internos do combobox
        const input = select.querySelector('[data-select-input]');
        const toggle = select.querySelector('[data-select-toggle]');
        const label = select.querySelector('[data-select-label]');
        const menu = select.querySelector('[data-select-menu]');

        // Verifica se a estrutura obrigatória está completa
        if (!input || !toggle || !label || !menu) {
            // Interrompe a criação de uma estrutura incompleta
            return null;
        }

        // Define o texto exibido quando nenhum valor está selecionado
        const placeholder = select.dataset.selectPlaceholder || label.textContent.trim();

        // Abre o menu do combobox
        function open() {
            // Fecha os demais menus antes de abrir o atual
            closeAll(select);

            // Define o estado visual aberto
            menu.classList.remove('max-h-0', 'border-transparent', 'opacity-0', 'overflow-hidden');
            menu.classList.add('max-h-56', 'border-[var(--secondary)]', 'opacity-100', 'overflow-y-auto');
            toggle.setAttribute('aria-expanded', 'true');
        }

        // Fecha o menu do combobox
        function close() {
            // Define o estado visual fechado
            menu.classList.remove('max-h-56', 'border-[var(--secondary)]', 'opacity-100', 'overflow-y-auto');
            menu.classList.add('max-h-0', 'border-transparent', 'opacity-0', 'overflow-hidden');
            toggle.setAttribute('aria-expanded', 'false');
        }

        // Alterna a visibilidade do menu
        function toggleMenu() {
            // Verifica se o menu está fechado
            if (menu.classList.contains('max-h-0')) {
                open();
                return;
            }

            close();
        }

        // Define uma opção como selecionada
        function set(value, optionLabel, emitChange) {
            // Carrega a opção correspondente ao valor informado
            const option = findOption(select, value);

            // Define o valor real salvo no formulário
            input.value = value || '';

            // Define o texto visível da opção
            label.textContent = optionLabel
                || (option ? option.dataset.valueLabel : '')
                || placeholder;

            // Atualiza o estado acessível das opções
            getOptions(select).forEach(function (item) {
                // Verifica se a opção atual corresponde ao valor selecionado
                item.setAttribute('aria-selected', String(item === option));
            });

            // Verifica se o evento de mudança deve ser emitido
            if (emitChange !== false) {
                // Emite os dados selecionados para regras específicas da tela
                select.dispatchEvent(new CustomEvent('ciclo:select-change', {
                    detail: {
                        value: input.value,
                        label: label.textContent,
                        option: option
                    }
                }));
            }
        }

        // Restaura o estado vazio do combobox
        function reset() {
            // Define o valor vazio sem disparar regras específicas
            set('', placeholder, false);
            close();
        }

        // Sincroniza o texto com o valor inicial recebido do backend
        function sync() {
            // Verifica se existe um valor inicial
            if (input.value) {
                set(input.value, '', false);
                return;
            }

            reset();
        }

        // Define o controlador público do combobox
        const controller = {
            open: open,
            close: close,
            toggle: toggleMenu,
            set: set,
            reset: reset,
            sync: sync,
            element: select
        };

        // Salva o controlador para reutilização
        controllers.set(select, controller);

        // Sincroniza o estado inicial do combobox
        sync();

        return controller;
    }

    // Carrega um combobox por seletor ou elemento
    function get(target) {
        // Define o container correspondente ao destino informado
        const select = typeof target === 'string'
            ? document.querySelector(target)
            : target;

        return create(select);
    }

    // Carrega todas as opções de um combobox
    function getOptions(select) {
        return Array.from(select.querySelectorAll('[data-select-option]'));
    }

    // Localiza uma opção pelo valor
    function findOption(select, value) {
        return getOptions(select).find(function (option) {
            // Verifica se o valor da opção corresponde ao valor procurado
            return option.dataset.value === String(value);
        });
    }

    // Fecha todos os comboboxes, exceto o informado
    function closeAll(except) {
        // Percorre todos os comboboxes declarados na página
        document.querySelectorAll('[data-select]').forEach(function (select) {
            // Verifica se o combobox atual deve permanecer aberto
            if (select === except) {
                return;
            }

            // Carrega e fecha o controlador atual
            const controller = create(select);

            if (controller) {
                controller.close();
            }
        });
    }

    // Percorre os comboboxes existentes no carregamento da página
    document.querySelectorAll('[data-select]').forEach(function (select) {
        // Inicializa o combobox atual
        create(select);
    });

    // Intercepta as interações dos comboboxes de forma centralizada
    document.addEventListener('click', function (event) {
        // Carrega o toggle mais próximo do clique
        const toggle = event.target.closest('[data-select-toggle]');

        // Verifica se o usuário clicou em um toggle
        if (toggle) {
            // Carrega o combobox correspondente
            const controller = get(toggle.closest('[data-select]'));

            if (controller) {
                controller.toggle();
            }

            return;
        }

        // Carrega a opção mais próxima do clique
        const option = event.target.closest('[data-select-option]');

        // Verifica se o usuário clicou em uma opção
        if (option) {
            // Carrega o combobox correspondente
            const controller = get(option.closest('[data-select]'));

            if (controller) {
                controller.set(option.dataset.value, option.dataset.valueLabel);
                controller.close();
            }

            return;
        }

        // Fecha os menus quando o clique ocorre fora de um combobox
        if (!event.target.closest('[data-select]')) {
            closeAll();
        }
    });

    // Expõe a API compartilhada para regras específicas das páginas
    window.CicloSelect = {
        create: create,
        get: get,
        closeAll: closeAll
    };
})();
