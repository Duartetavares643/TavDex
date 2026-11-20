/* =====================================================================
   TavDex — Banner do perfil: cenário "pelicula"
   Rolo de película: películas a correr e um projetor a lançar luz sobre o TAVDEX
   Precisa do ajudantes.js (carregado antes).
   ===================================================================== */
(function () {
    'use strict';
    var B = window.BannerPerfil;
    var n = B.n, aleat = B.aleat, av = B.av, titulo = B.titulo, legenda = B.legenda, bobine = B.bobine;
    var TEMAS = B.TEMAS;

    TEMAS.pelicula = function (E) {
        var W = E.W, H = E.H, id = E.id, i;
        var fb = H * 0.17, periodo = fb * 1.9;              // altura das películas e tamanho de um fotograma
        var s = Math.min(H * 0.34, W * 0.12), x0 = W * 0.04, cy = H * 0.5;
        var lx = x0 + s * 1.85;                              // ponta da lente: começa o feixe
        var fs = Math.min(H * 0.33, (W - lx - W * 0.06) / 2.7), larg = fs * 2.6;
        var cx = Math.max(lx + larg / 2 + W * 0.02, (lx + W) / 2), ty = cy + fs * 0.28;
        var fs2 = Math.max(6, H * 0.055), comSub = H * 0.8 - (ty + fs2 * 1.9) > 0;
        var defs =
            '<linearGradient id="' + id + '-fundo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6eedd"/><stop offset="1" stop-color="#e9dcc2"/></linearGradient>' +
            '<linearGradient id="' + id + '-feixe" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset="1" stop-color="#ffffff" stop-opacity=".35"/></linearGradient>';
        var c = '<rect width="' + W + '" height="' + H + '" fill="url(#' + id + '-fundo)"/>';
        // películas "fantasma" na diagonal, ao fundo
        c += '<g opacity=".07" fill="#5a4630"><rect x="-' + n(W * 0.1) + '" y="' + n(H * 0.3) + '" width="' + n(W * 1.3) + '" height="' + n(fb) + '" transform="rotate(-9 ' + n(W / 2) + ' ' + n(H / 2) + ')"/>' +
            '<rect x="-' + n(W * 0.1) + '" y="' + n(H * 0.55) + '" width="' + n(W * 1.3) + '" height="' + n(fb * 0.8) + '" transform="rotate(7 ' + n(W / 2) + ' ' + n(H / 2) + ')"/></g>';
        // feixe de luz do projetor (treme um bocadinho, como num projetor antigo)
        c += '<polygon class="feixe" points="' + n(lx) + ',' + n(cy - s * 0.08) + ' ' + W + ',' + n(cy - H * 0.32) + ' ' + W + ',' + n(cy + H * 0.32) + ' ' + n(lx) + ',' + n(cy + s * 0.08) +
            '" fill="url(#' + id + '-feixe)"/>';
        for (i = 0; i < 12; i++) {
            var py = cy + (aleat(i, 61) - 0.5) * H * 0.4;
            c += '<circle class="po" cx="' + n(lx + 8) + '" cy="' + n(py) + '" r="' + n(H * 0.006 + aleat(i, 62) * H * 0.005) + '" fill="#fffdf4" style="animation-duration:' +
                n(4 + aleat(i, 63) * 4) + 's;animation-delay:-' + n(aleat(i, 64) * 8) + 's"/>';
        }
        // duas películas a correr (em cima para a esquerda, em baixo para a direita)
        function fita(y, classe) {
            var f = '<g class="' + classe + '"><rect x="-' + n(periodo) + '" y="' + n(y) + '" width="' + n(W + 3 * periodo) + '" height="' + n(fb) + '" fill="#29231f"/>';
            var cores = ['#f2647e', null, '#68c3ea', null, '#f3c95a', null];
            for (var k = 0, x = -periodo; x < W + 2 * periodo; x += periodo, k++) {
                f += '<rect x="' + n(x + periodo * 0.06) + '" y="' + n(y + fb * 0.24) + '" width="' + n(periodo * 0.88) + '" height="' + n(fb * 0.52) + '" rx="1.5" fill="#ece1c9"/>';
                var corF = cores[k % cores.length];
                if (corF) f += '<rect x="' + n(x + periodo * 0.14) + '" y="' + n(y + fb * 0.3) + '" width="' + n(periodo * 0.36) + '" height="' + n(fb * 0.4) + '" fill="' + corF + '" opacity=".9"/>';
                for (var q = 0; q < 3; q++) {
                    var hx = x + periodo * (0.12 + q * 0.32);
                    f += '<rect x="' + n(hx) + '" y="' + n(y + fb * 0.07) + '" width="' + n(periodo * 0.13) + '" height="' + n(fb * 0.1) + '" rx="1" fill="#f6eedd"/>' +
                        '<rect x="' + n(hx) + '" y="' + n(y + fb * 0.83) + '" width="' + n(periodo * 0.13) + '" height="' + n(fb * 0.1) + '" rx="1" fill="#f6eedd"/>';
                }
            }
            return f + '</g>';
        }
        c += fita(H * 0.025, 'fita-cima') + fita(H - fb - H * 0.025, 'fita-baixo');
        // projetor: bobines a rodar, corpo com as riscas da claquete, lente e pernas
        var cor = '#17140f';
        c += bobine(x0 + s * 0.42, cy - s * 0.62, s * 0.36, cor, '#f6eedd', 'roda') + bobine(x0 + s * 1.12, cy - s * 0.68, s * 0.36, cor, '#f6eedd', 'roda') +
            '<rect x="' + n(x0) + '" y="' + n(cy - s * 0.24) + '" width="' + n(s * 1.45) + '" height="' + n(s * 0.6) + '" rx="' + n(s * 0.06) + '" fill="' + cor + '"/>';
        for (i = 0; i < 5; i++) c += '<rect x="' + n(x0 + s * (0.08 + i * 0.27)) + '" y="' + n(cy - s * 0.24) + '" width="' + n(s * 0.13) + '" height="' + n(s * 0.12) + '" fill="#ece1c9"/>';
        c += '<rect x="' + n(x0 + s * 1.45) + '" y="' + n(cy - s * 0.12) + '" width="' + n(s * 0.18) + '" height="' + n(s * 0.3) + '" fill="' + cor + '"/>' +
            '<polygon points="' + n(x0 + s * 1.6) + ',' + n(cy - s * 0.08) + ' ' + n(lx) + ',' + n(cy - s * 0.2) + ' ' + n(lx) + ',' + n(cy + s * 0.2) + ' ' + n(x0 + s * 1.6) + ',' + n(cy + s * 0.1) + '" fill="' + cor + '"/>' +
            '<path d="M' + n(x0 + s * 0.4) + ',' + n(cy + s * 0.36) + ' l-' + n(s * 0.25) + ',' + n(s * 0.45) + ' M' + n(x0 + s * 1.05) + ',' + n(cy + s * 0.36) + ' l' + n(s * 0.25) + ',' + n(s * 0.45) +
            '" stroke="' + cor + '" stroke-width="' + n(s * 0.07) + '" stroke-linecap="round"/>';
        // TAVDEX na cor do avatar, dentro do feixe
        c += titulo(cx + fs * 0.03, ty + fs * 0.04, fs, larg, 'TAVDEX', 'fill:rgba(80,60,30,.18)') +
            titulo(cx, ty, fs, larg, 'TAVDEX', 'fill:' + av(62, 34));
        if (comSub) c += legenda(cx, ty + fs2 * 1.9, fs2, 'FILMES E SÉRIES', '#4a3e30');
        var css = '#ID .fita-cima{animation:ID-esq 2.4s linear infinite}#ID .fita-baixo{animation:ID-dir 2.4s linear infinite}' +
            '@keyframes ID-esq{from{transform:translateX(0)}to{transform:translateX(-' + n(periodo) + 'px)}}' +
            '@keyframes ID-dir{from{transform:translateX(-' + n(periodo) + 'px)}to{transform:translateX(0)}}' +
            '#ID .roda{animation:ID-roda 3s linear infinite}@keyframes ID-roda{to{transform:rotate(360deg)}}' +
            '#ID .feixe{animation:ID-treme 1.7s steps(5) infinite}@keyframes ID-treme{0%,100%{opacity:1}30%{opacity:.86}60%{opacity:.95}80%{opacity:.82}}' +
            '#ID .po{animation:ID-po 6s linear infinite}@keyframes ID-po{from{transform:translateX(0);opacity:.9}to{transform:translateX(' + n(W - lx) + 'px);opacity:0}}';
        return { defs: defs, corpo: c, css: css };
    };
})();
