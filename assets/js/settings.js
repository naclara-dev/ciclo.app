(function () {
    // Carrega os elementos usados pelo collapse de alteração de senha
    const toggle = document.querySelector('[data-change-password-toggle]');
    const collapse = document.querySelector('[data-change-password-collapse]');
    const label = document.querySelector('[data-change-password-toggle-label]');
    const icon = document.querySelector('[data-change-password-toggle-icon]');
    const fields = document.querySelectorAll('[data-change-password-field]');
    const accountModal = document.querySelector('#account-settings-modal');

    // Verifica se a estrutura do collapse está disponível
    if (!toggle || !collapse || !label || !icon) {
        // Interrompe a inicialização quando a tela não possui o componente
        return;
    }

    // Alterna o estado do collapse ao clicar no botão
    toggle.addEventListener('click', function () {
        // Verifica se os campos estão visíveis
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';

        // Define o novo estado do collapse
        setExpanded(!isExpanded);
    });

    // Verifica se o controlador compartilhado do modal está disponível
    if (window.CicloModal && accountModal) {
        // Restaura o collapse quando o modal é fechado
        window.CicloModal.create(accountModal, {
            onClose: function () {
                setExpanded(false);
            }
        });
    }

    // Verifica se o backend enviou um feedback para a conta
    if (accountModal && accountModal.hasAttribute('data-account-feedback')) {
        // Verifica se o erro exige a exibição dos campos de senha
        if (accountModal.dataset.expandPassword === '1') {
            setExpanded(true);
        }

        // Abre o modal para exibir a mensagem ao usuário
        window.CicloModal.get(accountModal).open();
    }

    // Define o estado visual e funcional dos campos de senha
    function setExpanded(isExpanded) {
        // Define o estado acessível do botão
        toggle.setAttribute('aria-expanded', String(isExpanded));

        // Define a altura necessária para animar o conteúdo
        collapse.style.maxHeight = isExpanded
            ? collapse.scrollHeight + 'px'
            : '0px';

        // Alterna a visibilidade do conteúdo
        collapse.classList.toggle('opacity-100', isExpanded);
        collapse.classList.toggle('opacity-0', !isExpanded);

        // Atualiza o texto e o ícone do botão
        label.textContent = isExpanded
            ? 'não quero alterar minha senha'
            : 'quero alterar minha senha';
        icon.classList.toggle('rotate-180', isExpanded);

        // Percorre os campos controlados pelo collapse
        fields.forEach(function (field) {
            // Define se o campo participa da validação e do envio
            field.disabled = !isExpanded;

            // Verifica se o collapse foi fechado
            if (!isExpanded) {
                // Limpa as senhas que deixaram de participar do formulário
                field.value = field.type === 'hidden' ? '1' : '';
            }
        });
    }
})();
