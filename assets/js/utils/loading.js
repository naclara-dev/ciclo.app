(function () {
    // Carrega o overlay global declarado no layout
    const overlay = document.querySelector('[data-global-loading]');

    // Verifica se a pagina possui o overlay global
    if (!overlay) {
        // Interrompe a inicializacao quando o componente nao existe
        return;
    }

    // Define a quantidade de requisicoes javascript em andamento
    let pendingRequests = 0;

    // Define se o loading deve permanecer ate a troca de pagina
    let persistentLoading = false;

    // Define o controle do fechamento animado do overlay
    let hideTimer = null;

    /**
     * Exibe o overlay global de carregamento.
     */
    function show(options) {
        // Define as opcoes recebidas para a exibicao atual
        const settings = options || {};

        // Define se o overlay deve aguardar uma navegacao de pagina
        persistentLoading = persistentLoading || Boolean(settings.persistent);

        // Cancela um fechamento pendente antes de reexibir o overlay
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }

        // Exibe o elemento antes de aplicar a transicao visual
        overlay.hidden = false;
        overlay.setAttribute('aria-hidden', 'false');

        // Aplica a classe no proximo frame para preservar a transicao
        requestAnimationFrame(function () {
            overlay.classList.add('is-active');
        });
    }

    /**
     * Oculta o overlay quando nao existem acoes pendentes.
     */
    function hide(force) {
        // Verifica se ainda existem acoes que precisam manter o overlay visivel
        if (!force && (pendingRequests > 0 || persistentLoading)) {
            // Interrompe o fechamento enquanto existe carregamento ativo
            return;
        }

        // Libera o modo persistente quando o fechamento e forcado
        if (force) {
            persistentLoading = false;
        }

        // Remove o estado visual ativo do overlay
        overlay.classList.remove('is-active');
        overlay.setAttribute('aria-hidden', 'true');

        // Aguarda a transicao antes de esconder o elemento da arvore acessivel
        hideTimer = setTimeout(function () {
            // Verifica se o overlay continuou inativo durante a animacao
            if (!overlay.classList.contains('is-active')) {
                overlay.hidden = true;
            }
        }, 180);
    }

    /**
     * Registra o inicio de uma requisicao javascript monitorada.
     */
    function startRequest() {
        // Calcula o total de requisicoes pendentes
        pendingRequests += 1;

        show();
    }

    /**
     * Registra o fim de uma requisicao javascript monitorada.
     */
    function finishRequest() {
        // Calcula o total restante sem permitir valores negativos
        pendingRequests = Math.max(0, pendingRequests - 1);

        // Verifica se todas as requisicoes foram finalizadas
        if (pendingRequests === 0) {
            hide(false);
        }
    }

    /**
     * Identifica se um link deve ser ignorado pelo loading global.
     */
    function shouldIgnoreLink(link, event) {
        // Verifica se a navegacao ja foi bloqueada por outro script
        if (event.defaultPrevented) {
            // Interrompe links que nao vao navegar
            return true;
        }

        // Verifica se o usuario abriu o link em outra aba ou janela
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
            // Interrompe atalhos controlados pelo navegador
            return true;
        }

        // Verifica se o link pertence a uma acao interna sem navegacao
        if (link.matches('.modal-toggle, [data-tab-target], [data-no-loading], [download]')) {
            // Interrompe acoes que devem permanecer instantaneas
            return true;
        }

        // Carrega o destino textual do link
        const href = link.getAttribute('href') || '';

        // Verifica se o destino nao troca a pagina atual
        if (!href || href === '#' || href.indexOf('javascript:') === 0) {
            // Interrompe atalhos sem navegacao real
            return true;
        }

        // Carrega a URL absoluta para comparar com a pagina atual
        const url = new URL(link.href, window.location.href);

        // Verifica se o link aponta apenas para uma ancora da mesma pagina
        if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) {
            // Interrompe navegacoes internas da mesma tela
            return true;
        }

        // Verifica se o link abre em outro contexto de navegacao
        if (link.target && link.target !== '_self') {
            // Interrompe links externos ao fluxo da pagina atual
            return true;
        }

        return false;
    }

    /**
     * Exibe o overlay quando um formulario sera enviado de verdade.
     */
    document.addEventListener('submit', function (event) {
        // Carrega o formulario enviado
        const form = event.target;

        // Verifica se o evento pertence a um formulario valido
        if (!(form instanceof HTMLFormElement)) {
            // Interrompe eventos que nao sao submits reais
            return;
        }

        // Aguarda validacoes e confirmacoes cancelarem o envio quando necessario
        setTimeout(function () {
            // Verifica se outro script impediu o envio do formulario
            if (event.defaultPrevented) {
                // Interrompe formularios que ficaram na tela atual
                return;
            }

            show({ persistent: true });
        }, 0);
    });

    /**
     * Exibe o overlay em navegacoes disparadas por links comuns.
     */
    document.addEventListener('click', function (event) {
        // Carrega o link mais proximo do clique atual
        const link = event.target.closest('a[href]');

        // Verifica se existe link navegavel no clique atual
        if (!link || shouldIgnoreLink(link, event)) {
            // Interrompe cliques que nao trocam a pagina
            return;
        }

        // Aguarda outros scripts cancelarem a navegacao quando necessario
        setTimeout(function () {
            // Verifica se o clique continuou valido para navegacao
            if (!event.defaultPrevented) {
                show({ persistent: true });
            }
        }, 0);
    });

    // Verifica se a pagina suporta interceptacao de submits programaticos
    if (window.HTMLFormElement && HTMLFormElement.prototype.submit) {
        // Carrega o submit nativo para preservar o comportamento original
        const nativeSubmit = HTMLFormElement.prototype.submit;

        // Exibe o overlay em submits disparados diretamente por javascript
        HTMLFormElement.prototype.submit = function () {
            show({ persistent: true });

            return nativeSubmit.apply(this, arguments);
        };
    }

    // Verifica se a API fetch esta disponivel no navegador atual
    if (typeof window.fetch === 'function') {
        // Carrega a implementacao nativa do fetch
        const nativeFetch = window.fetch.bind(window);

        // Monitora requisicoes fetch para controlar o overlay global
        window.fetch = function () {
            startRequest();

            try {
                // Envia a requisicao usando o comportamento nativo
                const request = nativeFetch.apply(window, arguments);

                // Verifica se a promessa permite finalizacao automatica
                if (request && typeof request.finally === 'function') {
                    return request.finally(function () {
                        finishRequest();
                    });
                }

                finishRequest();

                return request;
            } catch (error) {
                finishRequest();
                throw error;
            }
        };
    }

    // Verifica se a API XMLHttpRequest esta disponivel no navegador atual
    if (window.XMLHttpRequest && XMLHttpRequest.prototype.send) {
        // Carrega o envio nativo do XMLHttpRequest
        const nativeSend = XMLHttpRequest.prototype.send;

        // Monitora requisicoes XHR para controlar o overlay global
        XMLHttpRequest.prototype.send = function () {
            // Define se a requisicao atual ja encerrou
            let finished = false;

            // Finaliza a requisicao atual apenas uma vez
            const finish = function () {
                // Verifica se o encerramento ja foi processado
                if (finished) {
                    // Interrompe chamadas duplicadas de finalizacao
                    return;
                }

                finished = true;
                finishRequest();
            };

            startRequest();
            this.addEventListener('loadend', finish, { once: true });

            try {
                // Envia a requisicao usando o comportamento nativo
                const result = nativeSend.apply(this, arguments);

                // Verifica requisicoes sincronas que terminam antes do evento loadend assíncrono
                if (this.readyState === 4) {
                    finish();
                }

                return result;
            } catch (error) {
                finish();
                throw error;
            }
        };
    }

    /**
     * Limpa o overlay ao restaurar paginas vindas do cache do navegador.
     */
    window.addEventListener('pageshow', function () {
        // Reseta contadores para evitar loading preso no historico do navegador
        pendingRequests = 0;
        hide(true);
    });

    // Expõe controles manuais para fluxos javascript específicos
    window.CicloLoading = {
        show: show,
        hide: function () {
            hide(true);
        },
        start: startRequest,
        finish: finishRequest
    };
})();
