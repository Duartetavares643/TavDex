/* =====================================================================
   TavDex — Banner do perfil: motor
   Desenha o cenário de cada <div class="pbanner" data-tema="colina"> com o
   tamanho da caixa, redesenha quando o tamanho ou o cenário mudam e pára as
   animações fora do ecrã. Tem de ser o último ficheiro da pasta a carregar.
   Uso: <div class="pbanner" data-tema="colina" aria-hidden="true"></div>
   ===================================================================== */
(function () {
    'use strict';
    var B = window.BannerPerfil;
    var TEMAS = B.TEMAS;
    var TEMA_POR_OMISSAO = B.TEMA_POR_OMISSAO;
    var contador = 0;   // numera os banners da página (cada um tem um id próprio)

    // =====================================================================
    //  O SVG completo de um cenário (W×H em píxeis do ecrã)
    // =====================================================================
    function svg(tema, W, H, id, estreito) {
        var T = TEMAS[tema] || TEMAS[TEMA_POR_OMISSAO];
        var r = T({ W: W, H: H, id: id, estreito: estreito });
        // As regras de CSS só valem para este banner (#id) e respeitam "reduzir movimento"
        var css = r.css.replace(/ID/g, id) +
            '#' + id + '.pausado *{animation-play-state:paused!important}' +
            '@media (prefers-reduced-motion:reduce){#' + id + ' *{animation:none!important}}';
        return '<svg class="pbanner__arte" id="' + id + '" xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H +
            '" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true" focusable="false"><defs>' + r.defs + '</defs><style>' + css + '</style>' + r.corpo + '</svg>';
    }

    // =====================================================================
    //  MOTOR: desenha o SVG com o tamanho da caixa e troca de cenário
    // =====================================================================
    function iniciar(banner) {
        if (banner.dataset.bannerIniciado) return;   // nunca iniciar o mesmo banner duas vezes
        banner.dataset.bannerIniciado = '1';
        var id = 'pbanner-' + (++contador);
        var chave = '', visivel = true;

        function nomeTema() { return TEMAS[banner.getAttribute('data-tema')] ? banner.getAttribute('data-tema') : TEMA_POR_OMISSAO; }

        // Só redesenha quando muda o tamanho ou o cenário.
        // (A cor do avatar não obriga a redesenhar: as cores usam var(--h).)
        function desenhar() {
            if (!banner.isConnected) { parar(); return; }
            var caixa = banner.getBoundingClientRect();
            if (!caixa.width) return;
            var W = Math.round(caixa.width), H = Math.round(caixa.height), tema = nomeTema();
            var k = W + 'x' + H + ':' + tema;
            if (k === chave) return;
            chave = k;
            var antigo = banner.querySelector('.pbanner__arte');
            if (antigo) antigo.remove();
            // O SVG é feito só com valores do próprio programa (nada escrito pelos utilizadores)
            banner.insertAdjacentHTML('beforeend', svg(tema, W, H, id, W <= 600));
            atualizarPausa();
        }
        // Fora do ecrã as animações param (não gastam bateria)
        function atualizarPausa() {
            var arte = banner.querySelector('.pbanner__arte');
            if (arte) arte.classList.toggle('pausado', !visivel);
        }

        var ro = new ResizeObserver(desenhar);
        ro.observe(banner);
        var io = new IntersectionObserver(function (e) { visivel = e[0].isIntersecting; atualizarPausa(); });
        io.observe(banner);
        // troca de cenário (data-tema) sem recarregar
        var obs = new MutationObserver(desenhar);
        obs.observe(banner, { attributes: true, attributeFilter: ['data-tema'] });

        function parar() { ro.disconnect(); io.disconnect(); obs.disconnect(); }
        desenhar();
    }

    // Inicia os banners que estão dentro de "raiz" (por omissão, a página toda).
    // As páginas que desenham o HTML depois de a API responder podem chamar
    // iniciarBanners(raiz), mas não é obrigatório: o observador abaixo também os apanha.
    function iniciarBanners(raiz) {
        raiz = raiz || document;
        if (raiz.matches && raiz.matches('.pbanner')) iniciar(raiz);
        if (raiz.querySelectorAll) raiz.querySelectorAll('.pbanner').forEach(iniciar);
    }
    window.iniciarBanners = iniciarBanners;
    // Para pré-visualizar ou testar um cenário sem página (ex.: TavDexBanner.svg('colina', 900, 214, 'x', false))
    window.TavDexBanner = { svg: svg, temas: Object.keys(TEMAS) };

    // Ao abrir a página: inicia os banners que já existem e fica atento aos que aparecerem
    function arrancar() {
        iniciarBanners(document);
        // banners que aparecem mais tarde (páginas desenhadas pelo JavaScript)
        new MutationObserver(function (lista) {
            lista.forEach(function (m) {
                m.addedNodes.forEach(function (no) { if (no.nodeType === 1) iniciarBanners(no); });
            });
        }).observe(document.body, { childList: true, subtree: true });
    }
    if (typeof document === 'undefined') return;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
    else arrancar();
})();
