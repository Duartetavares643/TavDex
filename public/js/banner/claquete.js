/* =====================================================================
   TavDex — Banner do perfil: cenário "claquete"
   Claquete antiga: papel envelhecido, claquete que abre e fecha, bobines, máquina e borboleta
   Precisa do ajudantes.js (carregado antes).
   ===================================================================== */
(function () {
    'use strict';
    var B = window.BannerPerfil;
    var n = B.n, aleat = B.aleat, av = B.av, titulo = B.titulo, legenda = B.legenda, bobine = B.bobine;
    var TEMAS = B.TEMAS;

    TEMAS.claquete = function (E) {
        var W = E.W, H = E.H, id = E.id, est = E.estreito, i;
        var bw = Math.min(est ? H * 0.62 : H * 0.55, W * 0.32), bh = bw * 0.62;   // quadro da claquete
        var by = est ? H * 0.42 : H * 0.4;
        // No computador o avatar tapa o canto de baixo à esquerda: a claquete vai para a direita
        var bx = est ? W * 0.05 : W - bw - W * 0.05;
        var extras = !est && W > 500;                         // bobines e máquina fotográfica
        var x0 = est ? bx + bw + W * 0.04 : W * 0.04, x1 = est ? W * 0.96 : bx - (extras ? bw * 1.1 : W * 0.04);
        var fs = Math.min(est ? H * 0.32 : H * 0.36, (x1 - x0) / 2.75), larg = fs * 2.6, cx = (x0 + x1) / 2, ty = H * 0.5 + fs * 0.25;
        var fs2 = Math.max(6, H * 0.056);
        var faixa = Math.max(4, bh * 0.22);
        var defs =
            '<radialGradient id="' + id + '-papel" cx="55%" cy="45%" r="75%"><stop offset="0" stop-color="#f3e7c9"/><stop offset=".7" stop-color="#dcc69a"/><stop offset="1" stop-color="#b8945e"/></radialGradient>' +
            '<filter id="' + id + '-textura" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/>' +
            '<feColorMatrix values="0 0 0 0 .35  0 0 0 0 .24  0 0 0 0 .12  0 0 0 .55 0"/></filter>' +
            '<filter id="' + id + '-mancha" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="' + n(H * 0.04) + '"/></filter>' +
            '<filter id="' + id + '-carimbo"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="1" seed="2" result="r"/>' +
            '<feDisplacementMap in="SourceGraphic" in2="r" scale="' + n(Math.max(0.8, fs * 0.022)) + '"/></filter>' +
            '<pattern id="' + id + '-riscas" width="' + n(faixa) + '" height="' + n(faixa) + '" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">' +
            '<rect width="' + n(faixa / 2) + '" height="' + n(faixa) + '" fill="#f4f4f2"/><rect x="' + n(faixa / 2) + '" width="' + n(faixa / 2) + '" height="' + n(faixa) + '" fill="#161618"/></pattern>' +
            '<radialGradient id="' + id + '-metal" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#f2f2f4"/><stop offset="1" stop-color="#8a8a92"/></radialGradient>' +
            '<linearGradient id="' + id + '-asa" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7cc8f2"/><stop offset="1" stop-color="#1f74c4"/></linearGradient>' +
            '<radialGradient id="' + id + '-borda" cx="50%" cy="50%" r="72%"><stop offset=".62" stop-color="#5a3518" stop-opacity="0"/><stop offset="1" stop-color="#5a3518" stop-opacity=".6"/></radialGradient>';
        var c = '<rect width="' + W + '" height="' + H + '" fill="url(#' + id + '-papel)"/>' +
            '<rect width="' + W + '" height="' + H + '" filter="url(#' + id + '-textura)" opacity=".5"/>';
        for (i = 0; i < 6; i++) {
            c += '<ellipse cx="' + n(aleat(i, 51) * W) + '" cy="' + n(aleat(i, 52) * H) + '" rx="' + n(H * (0.12 + aleat(i, 53) * 0.18)) + '" ry="' + n(H * (0.08 + aleat(i, 54) * 0.12)) +
                '" fill="#9a7038" opacity=".16" filter="url(#' + id + '-mancha)"/>';
        }
        c += '<rect width="' + W + '" height="' + H + '" fill="url(#' + id + '-borda)"/>';
        // bobines empilhadas e máquina fotográfica (no computador, à esquerda da claquete)
        if (extras) {
            var rx0 = bx - bw * 0.48, ry0 = by + bh * 0.72, r = bh * 0.42;
            c += '<ellipse cx="' + n(rx0) + '" cy="' + n(ry0 + r * 0.95) + '" rx="' + n(r * 1.05) + '" ry="' + n(r * 0.28) + '" fill="#6e6e76"/>' +
                '<ellipse cx="' + n(rx0) + '" cy="' + n(ry0 + r * 0.82) + '" rx="' + n(r * 1.05) + '" ry="' + n(r * 0.28) + '" fill="#b4b4bc"/>' +
                bobine(rx0, ry0, r, 'url(#' + id + '-metal)', '#4a4a52');
            var mx = bx - bw * 1.05, my = by + bh * 0.62, ms = bh * 0.5;
            c += '<rect x="' + n(mx - ms * 0.6) + '" y="' + n(my - ms * 0.35) + '" width="' + n(ms * 1.2) + '" height="' + n(ms * 0.8) + '" rx="' + n(ms * 0.1) + '" fill="#232326"/>' +
                '<rect x="' + n(mx - ms * 0.45) + '" y="' + n(my - ms * 0.52) + '" width="' + n(ms * 0.4) + '" height="' + n(ms * 0.2) + '" fill="#3a3a3e"/>' +
                '<circle cx="' + n(mx) + '" cy="' + n(my + ms * 0.05) + '" r="' + n(ms * 0.3) + '" fill="#5a5a62"/><circle cx="' + n(mx) + '" cy="' + n(my + ms * 0.05) + '" r="' + n(ms * 0.18) + '" fill="#8fc8ec"/>' +
                '<circle cx="' + n(mx + ms * 0.4) + '" cy="' + n(my - ms * 0.42) + '" r="' + n(ms * 0.08) + '" fill="#d62a1e"/>';
        }
        // a claquete: sombra, quadro com giz, barra fixa às riscas e o braço que abre e fecha
        var fT = Math.max(5, bh * 0.13);
        c += '<rect x="' + n(bx + bh * 0.06) + '" y="' + n(by + bh * 0.08) + '" width="' + n(bw) + '" height="' + n(bh) + '" rx="' + n(bw * 0.03) + '" fill="rgba(70,40,15,.35)"/>' +
            '<rect x="' + n(bx) + '" y="' + n(by) + '" width="' + n(bw) + '" height="' + n(bh) + '" rx="' + n(bw * 0.03) + '" fill="#1d1d20"/>' +
            '<path d="M' + n(bx + bw * 0.04) + ',' + n(by + bh * 0.4) + ' h' + n(bw * 0.92) + ' M' + n(bx + bw * 0.04) + ',' + n(by + bh * 0.72) + ' h' + n(bw * 0.92) +
            ' M' + n(bx + bw * 0.5) + ',' + n(by + bh * 0.06) + ' v' + n(bh * 0.66) + '" stroke="rgba(255,255,255,.5)" stroke-width="1"/>';
        if (bw > 70) {
            c += legenda(bx + bw * 0.25, by + bh * 0.3, fT, 'CENA', 'rgba(255,255,255,.8)') + legenda(bx + bw * 0.75, by + bh * 0.3, fT, 'PLANO', 'rgba(255,255,255,.8)') +
                legenda(bx + bw * 0.25, by + bh * 0.62, fT, 'TAKE', 'rgba(255,255,255,.8)');
        }
        c += '<circle cx="' + n(bx + bw * 0.85) + '" cy="' + n(by + bh * 0.86) + '" r="' + n(bh * 0.05) + '" fill="#d62a1e"/>' +
            '<rect x="' + n(bx) + '" y="' + n(by - faixa) + '" width="' + n(bw) + '" height="' + n(faixa) + '" fill="url(#' + id + '-riscas)" stroke="#161618" stroke-width="1"/>' +
            '<g class="braco" style="transform-origin:' + n(bx) + 'px ' + n(by - faixa - 1) + 'px">' +
            '<rect x="' + n(bx) + '" y="' + n(by - 2 * faixa - 1) + '" width="' + n(bw) + '" height="' + n(faixa) + '" fill="url(#' + id + '-riscas)" stroke="#161618" stroke-width="1"/></g>' +
            '<circle cx="' + n(bx + faixa * 0.3) + '" cy="' + n(by - faixa - 1) + '" r="' + n(faixa * 0.35) + '" fill="#9a9aa2"/>';
        // borboleta azul a voar perto da claquete
        var vx = bx + bw * 0.62, vy = by - bh * 0.95, va = Math.max(4, bh * 0.16);
        c += '<g class="voo" style="transform-origin:' + n(vx) + 'px ' + n(vy) + 'px"><g class="asas" style="transform-origin:' + n(vx) + 'px ' + n(vy) + 'px">' +
            '<ellipse cx="' + n(vx - va * 0.55) + '" cy="' + n(vy - va * 0.2) + '" rx="' + n(va * 0.55) + '" ry="' + n(va * 0.42) + '" fill="url(#' + id + '-asa)"/>' +
            '<ellipse cx="' + n(vx + va * 0.55) + '" cy="' + n(vy - va * 0.2) + '" rx="' + n(va * 0.55) + '" ry="' + n(va * 0.42) + '" fill="url(#' + id + '-asa)"/>' +
            '<ellipse cx="' + n(vx - va * 0.4) + '" cy="' + n(vy + va * 0.35) + '" rx="' + n(va * 0.35) + '" ry="' + n(va * 0.28) + '" fill="#2b8fd6"/>' +
            '<ellipse cx="' + n(vx + va * 0.4) + '" cy="' + n(vy + va * 0.35) + '" rx="' + n(va * 0.35) + '" ry="' + n(va * 0.28) + '" fill="#2b8fd6"/></g>' +
            '<ellipse cx="' + n(vx) + '" cy="' + n(vy) + '" rx="' + n(va * 0.1) + '" ry="' + n(va * 0.5) + '" fill="#141414"/></g>';
        // TAVDEX carimbado na cor do avatar, sublinhado e "FILMES E SÉRIES"
        c += titulo(cx, ty, fs, larg, 'TAVDEX', 'fill:' + av(58, 30, 0.92), ' filter="url(#' + id + '-carimbo)"') +
            '<path d="M' + n(cx - larg / 2) + ',' + n(ty + fs * 0.12) + ' h' + n(larg) + '" stroke="' + av(45, 35, 0.45) + '" stroke-width="' + n(Math.max(1, fs * 0.03)) + '"/>' +
            legenda(cx, ty + fs * 0.12 + fs2 * 1.6, fs2, 'FILMES E SÉRIES', '#5a3c22');
        var css = '#ID .braco{animation:ID-claque 4s ease-in infinite}' +
            '@keyframes ID-claque{0%,55%{transform:rotate(-22deg)}62%,88%{transform:rotate(0)}100%{transform:rotate(-22deg)}}' +
            '#ID .asas{animation:ID-bate .28s ease-in-out infinite alternate}' +
            '@keyframes ID-bate{from{transform:scaleX(1)}to{transform:scaleX(.25)}}' +
            '#ID .voo{animation:ID-voa 6s ease-in-out infinite alternate}' +
            '@keyframes ID-voa{0%{transform:translate(0,0)}50%{transform:translate(' + n(bw * 0.18) + 'px,-' + n(bh * 0.15) + 'px)}100%{transform:translate(-' + n(bw * 0.12) + 'px,' + n(bh * 0.08) + 'px)}}';
        return { defs: defs, corpo: c, css: css };
    };
})();
