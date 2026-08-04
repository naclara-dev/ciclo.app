const confirmModalElement = document.querySelector('[data-confirm-modal]');
// Carrega o controlador compartilhado do modal de confirmacao
const confirmModal = window.CicloModal ? window.CicloModal.get(confirmModalElement) : null;
const confirmDeleteButton = confirmModalElement ? confirmModalElement.querySelector('[data-confirm-delete]') : null;
const confirmTitle = confirmModalElement ? confirmModalElement.querySelector('[data-confirm-title]') : null;
const confirmMessage = confirmModalElement ? confirmModalElement.querySelector('[data-confirm-message]') : null;
const confirmIcon = confirmModalElement ? confirmModalElement.querySelector('[data-confirm-icon]') : null;
const confirmLabel = confirmModalElement ? confirmModalElement.querySelector('[data-confirm-label]') : null;
const infoHintWrappers = document.querySelectorAll('[data-info-hint]');
let pendingConfirmForm = null;

// Define os textos originais do modal compartilhado
const defaultConfirmContent = {
    title: confirmTitle ? confirmTitle.textContent : 'excluir registro?',
    message: confirmMessage ? confirmMessage.textContent : 'cuidado! essa ação é permanente.',
    icon: confirmIcon ? confirmIcon.className : 'fa-regular fa-trash-can',
    label: confirmLabel ? confirmLabel.textContent : 'excluir'
};

// Define conteudos conhecidos para formularios de confirmacao
const confirmPresets = {
    periodic: {
        title: 'inserir previs\u00f5es?',
        message: 'Ser\u00e3o criadas transa\u00e7\u00f5es para cada template ativo com pr\u00f3xima execu\u00e7\u00e3o dentro do ciclo atual.',
        icon: 'fa-solid fa-calendar-plus',
        label: 'inserir'
    },
    'close-cycle': {
        title: 'encerrar ciclo?',
        message: 'Todas as transa\u00e7\u00f5es pendentes do ciclo atual ser\u00e3o marcadas como pagas.',
        icon: 'fa-solid fa-circle-check',
        label: 'encerrar'
    }
};

// Inicializa as dicas contextuais declaradas nas telas
initializeInfoHints();

/**
 * Controla a abertura das dicas contextuais por clique ou toque.
 */
function initializeInfoHints() {
    // Percorre as dicas contextuais existentes na pagina
    infoHintWrappers.forEach((wrapper) => {
        // Carrega o botao que alterna a dica contextual
        const toggle = wrapper.querySelector('[data-info-hint-toggle]');

        // Verifica se a dica possui um botao de acionamento
        if (!toggle) {
            // Interrompe a configuracao da dica incompleta
            return;
        }

        // Alterna a dica contextual quando o usuario aciona o icone
        toggle.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleInfoHint(wrapper, toggle, !wrapper.classList.contains('is-open'));
        });
    });
}

/**
 * Fecha dicas contextuais abertas ao clicar fora delas.
 */
document.addEventListener('click', (event) => {
    // Percorre as dicas contextuais abertas na pagina
    infoHintWrappers.forEach((wrapper) => {
        // Verifica se o clique aconteceu dentro da dica atual
        if (wrapper.contains(event.target)) {
            // Interrompe o fechamento para preservar a interacao atual
            return;
        }

        // Carrega o botao que alterna a dica atual
        const toggle = wrapper.querySelector('[data-info-hint-toggle]');

        toggleInfoHint(wrapper, toggle, false);
    });
});

/**
 * Fecha dicas contextuais abertas quando o usuario pressiona escape.
 */
document.addEventListener('keydown', (event) => {
    // Verifica se a tecla pressionada deve fechar as dicas
    if (event.key !== 'Escape') {
        // Interrompe teclas que nao controlam as dicas contextuais
        return;
    }

    // Percorre as dicas contextuais existentes na pagina
    infoHintWrappers.forEach((wrapper) => {
        // Carrega o botao que alterna a dica atual
        const toggle = wrapper.querySelector('[data-info-hint-toggle]');

        toggleInfoHint(wrapper, toggle, false);
    });
});

/**
 * Define o estado visivel de uma dica contextual.
 */
function toggleInfoHint(wrapper, toggle, isOpen) {
    // Define a classe visual da dica contextual
    wrapper.classList.toggle('is-open', isOpen);

    // Verifica se existe botao para receber o estado acessivel
    if (toggle) {
        // Define o estado acessivel do botao de informacao
        toggle.setAttribute('aria-expanded', String(isOpen));
    }
}

/**
 * Exibe um modal de confirmacao ao tentar excluir um registro.
 */
document.addEventListener('click', (event) => {
    // Carrega o botao de exclusao acionado
    const deleteButton = event.target.closest('[data-delete-button]');

    // Verifica se o clique pertence a uma exclusao confirmavel
    if (!deleteButton || !confirmModal) {
        // Interrompe cliques que nao precisam do modal
        return;
    }

    // Carrega o formulario que sera enviado apos a confirmacao
    const form = deleteButton.closest('form');

    // Verifica se existe um formulario para confirmar
    if (!form) {
        // Interrompe quando nao ha formulario relacionado
        return;
    }

    // Interrompe o envio imediato do formulario
    event.preventDefault();
    pendingConfirmForm = form;

    // Define o conteudo padrao para exclusao
    setConfirmContent(defaultConfirmContent);
    confirmModal.open();
});

/**
 * Exibe um modal de confirmacao antes de enviar um formulario sensivel.
 */
document.addEventListener('submit', (event) => {
    // Carrega o formulario enviado
    const form = event.target;

    // Verifica se o formulario precisa do modal compartilhado
    if (!(form instanceof HTMLFormElement) || !form.hasAttribute('data-confirm-form') || !confirmModal) {
        // Interrompe formularios que nao precisam de confirmacao
        return;
    }

    // Interrompe o envio ate o usuario confirmar a acao
    event.preventDefault();
    pendingConfirmForm = form;

    // Define o conteudo do modal a partir do preset ou do formulario atual
    setConfirmContent(getConfirmContent(form));

    confirmModal.open();
});

/**
 * Faz o submit do formulario pendente quando o usuario confirma.
 */
if (confirmDeleteButton) {
    confirmDeleteButton.addEventListener('click', () => {
        // Verifica se existe um formulario aguardando confirmacao
        if (!pendingConfirmForm) {
            // Interrompe quando nao ha acao pendente
            return;
        }

        // Define o formulario que sera enviado
        const form = pendingConfirmForm;
        pendingConfirmForm = null;

        // Desativa o botao para evitar envios duplicados durante o redirecionamento
        confirmDeleteButton.disabled = true;
        confirmModal.close();
        form.submit();
    });
}

/**
 * Atualiza os textos e icones do modal de confirmacao compartilhado.
 */
function setConfirmContent(content) {
    // Define o titulo da confirmacao
    if (confirmTitle) {
        confirmTitle.textContent = content.title;
    }

    // Define a mensagem da confirmacao
    if (confirmMessage) {
        confirmMessage.textContent = content.message;
    }

    // Define o icone da acao principal
    if (confirmIcon) {
        confirmIcon.className = content.icon;
    }

    // Define o texto da acao principal
    if (confirmLabel) {
        confirmLabel.textContent = content.label;
    }

    // Reativa o botao quando o modal e preparado para uma nova acao
    if (confirmDeleteButton) {
        confirmDeleteButton.disabled = false;
    }
}

/**
 * Obtem o conteudo de confirmacao definido para um formulario.
 */
function getConfirmContent(form) {
    // Define o preset informado pelo formulario
    const presetName = form.dataset.confirmPreset || getConfirmPresetFromAction(form.action || '');
    const preset = confirmPresets[presetName] || {};

    return {
        title: form.dataset.confirmTitle || preset.title || defaultConfirmContent.title,
        message: form.dataset.confirmMessage || preset.message || defaultConfirmContent.message,
        icon: form.dataset.confirmIcon || preset.icon || defaultConfirmContent.icon,
        label: form.dataset.confirmLabel || preset.label || defaultConfirmContent.label
    };
}

/**
 * Identifica o preset de confirmacao a partir da URL do formulario.
 */
function getConfirmPresetFromAction(action) {
    // Verifica se a acao corresponde ao encerramento do ciclo
    if (action.indexOf('/dashboard/cycle/close/') !== -1) {
        // Define o preset de encerramento do ciclo
        return 'close-cycle';
    }

    // Verifica se a acao corresponde a geracao de previsoes
    if (action.indexOf('/dashboard/periodic/generate/') !== -1) {
        // Define o preset de geracao de previsoes
        return 'periodic';
    }

    return '';
}

/**
 * Intercepta o submit dos formularios para validar os campos.
 */
document.addEventListener('submit', (event) => {
    // Carrega o formulario enviado
    const form = event.target;

    // Verifica se o formulario usa a validacao compartilhada
    if (!(form instanceof HTMLFormElement) || !form.classList.contains('validate')) {
        // Interrompe formularios sem validacao automatica
        return;
    }

    // Verifica se os campos informados sao validos
    if (!window.validateForms(form)) {
        // Interrompe o envio quando existem campos invalidos
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('auth-tab-height-change'));
    }
});
