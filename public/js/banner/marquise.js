/* =====================================================================
   TavDex — Banner do perfil: cenário "marquise"
   Cinema à noite: fachada art déco, placa "CINEMA" em néon e marquise iluminada
   Precisa do ajudantes.js (carregado antes).
   ===================================================================== */
(function () {
    'use strict';
    var B = window.BannerPerfil;
    var FONTE_TITULO = B.FONTE_TITULO, n = B.n, aleat = B.aleat, av = B.av, titulo = B.titulo, legenda = B.legenda, filtroBrilho = B.filtroBrilho;
    var TEMAS = B.TEMAS;

    TEMAS.marquise = function (E) {
        var W = E.W, H = E.H, id = E.id, est = E.estreito, i;
        var fs = est ? Math.min(H * 0.26, W * 0.2) : Math.min(H * 0.28, W * 0.18), larg = fs * 2.6;
        var pw = larg + fs * 0.9, px = (W - pw) / 2, py = H * 0.1;
        var fs2 = Math.max(6, H * 0.052), ph = fs * 1.05 + fs2 * 2.4;
        var cx = W / 2, ty = py + fs * 0.98, pBot = py + ph;
        var sw = Math.max(9, H * 0.11), sh = Math.min(H * 0.84, sw * 6.4);   // placa vertical
        var sx = px - sw - H * 0.05 >= 2 ? px - sw - H * 0.05 : (px + pw + H * 0.05 + sw <= W - 2 ? px + pw + H * 0.05 : null);
        var dTopo = pBot + H * 0.06, dBase = H * 0.93;
        var defs =
            '<linearGradient id="' + id + '-ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03050c"/><stop offset=".6" stop-color="#0f1830"/><stop offset="1" stop-color="#1c2742"/></linearGradient>' +
            '<linearGradient id="' + id + '-predio" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2e221b"/><stop offset="1" stop-color="#6a4a30"/></linearGradient>' +
            '<linearGradient id="' + id + '-painel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#efe1c0"/></linearGradient>' +
            '<linearGradient id="' + id + '-vidro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6c06a"/><stop offset="1" stop-color="#a8621f"/></linearGradient>' +
            '<radialGradient id="' + id + '-luz" cx="50%" cy="0%" r="80%"><stop offset="0" stop-color="#ffb860" stop-opacity=".5"/><stop offset="1" stop-color="#ffb860" stop-opacity="0"/></radialGradient>' +
            filtroBrilho(id + '-neon', Math.max(1.2, H * 0.014)) +
            '<filter id="' + id + '-nuvem" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="' + n(H * 0.02) + '"/></filter>';
        var c = '<rect width="' + W + '" height="' + H + '" fill="url(#' + id + '-ceu)"/>';
        for (i = 0; i < 18; i++) {
            c += '<circle class="estrela" cx="' + n(aleat(i, 71) * W) + '" cy="' + n(aleat(i, 72) * H * 0.5) + '" r="' + n(H * 0.005) + '" fill="#dfe6ff" style="animation-delay:-' + n(aleat(i, 73) * 3) + 's"/>';
        }
        for (i = 0; i < 6; i++) {
            c += '<ellipse cx="' + n(aleat(i, 74) * W) + '" cy="' + n(H * (0.08 + aleat(i, 75) * 0.25)) + '" rx="' + n(W * (0.1 + aleat(i, 76) * 0.12)) + '" ry="' + n(H * 0.05) +
                '" fill="#26304a" opacity=".7" filter="url(#' + id + '-nuvem)"/>';
        }
        // prédio art déco
        var ex = px - H * 0.12, ew = pw + H * 0.24;
        c += '<rect x="' + n(ex) + '" y="' + n(H * 0.03) + '" width="' + n(ew) + '" height="' + H + '" fill="url(#' + id + '-predio)"/>' +
            '<rect x="' + n(ex - H * 0.02) + '" y="' + n(H * 0.02) + '" width="' + n(ew + H * 0.04) + '" height="' + n(H * 0.03) + '" fill="#4a3628"/>';
        for (var vx = ex + H * 0.05; vx < ex + ew; vx += H * 0.1) c += '<rect x="' + n(vx) + '" y="' + n(H * 0.05) + '" width="1" height="' + H + '" fill="#5a4432" opacity=".7"/>';
        // por baixo da marquise: luz quente, portas de vidro e o cartaz ao centro
        if (dBase - dTopo > H * 0.08) {
            var dh = dBase - dTopo, dw = Math.min(dh * 0.55, pw * 0.12);
            c += '<rect x="' + n(ex) + '" y="' + n(pBot) + '" width="' + n(ew) + '" height="' + n(H - pBot) + '" fill="url(#' + id + '-luz)"/>';
            [-2.7, -1.6, 0.6, 1.7].forEach(function (k) {
                var x = cx + k * dw * 1.08;
                c += '<rect x="' + n(x) + '" y="' + n(dTopo) + '" width="' + n(dw) + '" height="' + n(dh) + '" fill="#2a1a10"/>' +
                    '<rect x="' + n(x + dw * 0.1) + '" y="' + n(dTopo + dw * 0.1) + '" width="' + n(dw * 0.8) + '" height="' + n(dh - dw * 0.2) + '" fill="url(#' + id + '-vidro)"/>' +
                    '<rect x="' + n(x + dw * 0.48) + '" y="' + n(dTopo) + '" width="' + n(dw * 0.06) + '" height="' + n(dh) + '" fill="#2a1a10"/>';
            });
            var cw2 = dw * 1.1;
            c += '<rect x="' + n(cx - cw2 / 2) + '" y="' + n(dTopo - dh * 0.05) + '" width="' + n(cw2) + '" height="' + n(dh * 1.02) + '" fill="#c9a050"/>' +
                '<rect x="' + n(cx - cw2 / 2 + 2) + '" y="' + n(dTopo - dh * 0.05 + 2) + '" width="' + n(cw2 - 4) + '" height="' + n(dh * 1.02 - 4) + '" fill="#2a140a"/>' +
                '<g filter="url(#' + id + '-neon)" fill="#f08a2c"><circle cx="' + n(cx) + '" cy="' + n(dTopo + dh * 0.25) + '" r="' + n(cw2 * 0.13) + '"/>' +
                '<path d="M' + n(cx - cw2 * 0.28) + ',' + n(dTopo + dh * 0.9) + ' Q' + n(cx) + ',' + n(dTopo + dh * 0.3) + ' ' + n(cx + cw2 * 0.28) + ',' + n(dTopo + dh * 0.9) + 'Z"/></g>';
        }
        // passeio com o reflexo da luz
        c += '<rect y="' + n(dBase) + '" width="' + W + '" height="' + n(H - dBase) + '" fill="#1d1916"/>' +
            '<ellipse cx="' + n(cx) + '" cy="' + n(dBase + 2) + '" rx="' + n(pw * 0.6) + '" ry="' + n(H * 0.04) + '" fill="#ffb860" opacity=".18"/>';
        // marquise: caixa escura, painel claro com linhas, tubos de néon e lâmpadas
        c += '<rect x="' + n(px - H * 0.035) + '" y="' + n(py - H * 0.03) + '" width="' + n(pw + H * 0.07) + '" height="' + n(ph + H * 0.06) + '" rx="' + n(H * 0.015) + '" fill="#191210"/>' +
            '<rect x="' + n(px) + '" y="' + n(py) + '" width="' + n(pw) + '" height="' + n(ph) + '" fill="url(#' + id + '-painel)"/>';
        for (var ly = py + ph * 0.25; ly < pBot - 2; ly += ph * 0.25) c += '<rect x="' + n(px) + '" y="' + n(ly) + '" width="' + n(pw) + '" height="1" fill="#e4d4ae"/>';
        c += '<g filter="url(#' + id + '-neon)" stroke="#ff7b3a" stroke-width="' + n(Math.max(1.2, H * 0.012)) + '">' +
            '<path d="M' + n(px - H * 0.03) + ',' + n(py - H * 0.015) + ' h' + n(pw + H * 0.06) + ' M' + n(px - H * 0.03) + ',' + n(pBot + H * 0.015) + ' h' + n(pw + H * 0.06) + '"/></g>';
        var nb = Math.floor((pw + H * 0.04) / (H * 0.045));
        for (i = 0; i <= nb; i++) {
            c += '<circle class="lampada" cx="' + n(px - H * 0.02 + i * H * 0.045) + '" cy="' + n(pBot + H * 0.045) + '" r="' + n(Math.max(1, H * 0.011)) +
                '" fill="#ffe9a8" style="animation-delay:' + n((i % 3) * 0.25) + 's"/>';
        }
        // TAVDEX na cor do avatar e "FILMES E SÉRIES"
        c += titulo(cx, ty, fs, larg, 'TAVDEX', 'fill:' + av(70, 33)) + legenda(cx, ty + fs2 * 1.75, fs2, 'FILMES E SÉRIES', '#3a2c22');
        // placa vertical "CINEMA" em néon vermelho: as letras acendem uma a uma
        if (sx !== null) {
            var sy0 = H * 0.03;
            c += '<rect x="' + n(sx) + '" y="' + n(sy0) + '" width="' + n(sw) + '" height="' + n(sh) + '" rx="' + n(sw * 0.2) + '" fill="#1a0b0a" stroke="#6a2a20" stroke-width="1.5"/>' +
                '<g filter="url(#' + id + '-neon)">';
            'CINEMA'.split('').forEach(function (l, k) {
                c += '<text class="letra-neon" x="' + n(sx + sw / 2) + '" y="' + n(sy0 + sh * (0.15 + k * 0.148)) + '" font-family="' + FONTE_TITULO + '" font-size="' + n(sw * 0.78) +
                    '" text-anchor="middle" fill="#ff4433" style="animation-delay:' + n(k * 0.35) + 's">' + l + '</text>';
            });
            c += '</g>';
        }
        var css = '#ID .estrela{animation:ID-brilha 3s ease-in-out infinite}@keyframes ID-brilha{0%,100%{opacity:.2}50%{opacity:1}}' +
            '#ID .lampada{animation:ID-corre .75s steps(1) infinite}@keyframes ID-corre{0%{opacity:1}33%{opacity:.25}66%{opacity:1}}' +
            '#ID .letra-neon{animation:ID-acende 6s steps(1) infinite}' +
            '@keyframes ID-acende{0%{fill:#4a1410}6%{fill:#ff4433}70%{fill:#ff4433}72%{fill:#4a1410}74%{fill:#ff4433}96%{fill:#ff4433}100%{fill:#4a1410}}';
        return { defs: defs, corpo: c, css: css };
    };
})();
