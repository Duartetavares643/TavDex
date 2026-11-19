/* =====================================================================
   TavDex — Banner do perfil: cenário "colina"
   Colina das estrelas: pôr do sol, focos de luz, o TAVDEX na colina, palmeiras e película
   Precisa do ajudantes.js (carregado antes).
   ===================================================================== */
(function () {
    'use strict';
    var B = window.BannerPerfil;
    var n = B.n, aleat = B.aleat, av = B.av, titulo = B.titulo, legenda = B.legenda, palmeira = B.palmeira;
    var TEMAS = B.TEMAS;

    TEMAS.colina = function (E) {
        var W = E.W, H = E.H, id = E.id, est = E.estreito, i;
        var hz = H * 0.66;                                   // altura da colina
        var fs = est ? Math.min(H * 0.34, W * 0.3) : Math.min(H * 0.4, W * 0.22);
        var cx = W / 2, ty = est ? H * 0.5 : H * 0.56, larg = fs * 2.6;
        var fs2 = Math.max(6, H * 0.058), sy = ty + (est ? H * 0.15 : H * 0.18), larg2 = fs2 * 12.5;
        var defs =
            '<linearGradient id="' + id + '-ceu" x1="0" y1="0" x2="0" y2="' + n(hz) + '" gradientUnits="userSpaceOnUse">' +
            '<stop offset="0" stop-color="#1c0f30"/><stop offset=".35" stop-color="#521c3e"/><stop offset=".62" stop-color="#ad3a2f"/>' +
            '<stop offset=".85" stop-color="#ec7c2e"/><stop offset="1" stop-color="#f9b552"/></linearGradient>' +
            '<radialGradient id="' + id + '-sol" cx="' + n(cx) + '" cy="' + n(hz) + '" r="' + n(Math.max(W * 0.45, H)) + '" gradientUnits="userSpaceOnUse">' +
            '<stop offset="0" stop-color="#ffd98a" stop-opacity=".75"/><stop offset=".5" stop-color="#ff9a4a" stop-opacity=".25"/><stop offset="1" stop-color="#ff9a4a" stop-opacity="0"/></radialGradient>' +
            '<linearGradient id="' + id + '-foco" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff4d8" stop-opacity=".6"/>' +
            '<stop offset="1" stop-color="#fff4d8" stop-opacity="0"/></linearGradient>' +
            '<linearGradient id="' + id + '-colina" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#341710"/><stop offset="1" stop-color="#0c0504"/></linearGradient>' +
            '<linearGradient id="' + id + '-letras" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:' + av(35, 98) + '"/>' +
            '<stop offset="1" style="stop-color:' + av(30, 80) + '"/></linearGradient>' +
            '<filter id="' + id + '-nuvem" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="' + n(H * 0.012) + '"/></filter>';

        var c = '<rect width="' + W + '" height="' + H + '" fill="url(#' + id + '-ceu)"/>' +
            '<rect width="' + W + '" height="' + n(hz + H * 0.1) + '" fill="url(#' + id + '-sol)"/>';
        // estrelas a cintilar
        for (i = 0; i < 16; i++) {
            c += '<circle class="estrela" cx="' + n(aleat(i, 1) * W) + '" cy="' + n(aleat(i, 2) * hz * 0.4) + '" r="' + n(H * (0.004 + aleat(i, 3) * 0.004)) +
                '" fill="#fff6e0" style="animation-delay:-' + n(aleat(i, 4) * 3) + 's"/>';
        }
        // nuvens
        for (i = 0; i < 8; i++) {
            c += '<ellipse cx="' + n(aleat(i, 5) * W) + '" cy="' + n(H * (0.12 + aleat(i, 6) * 0.32)) + '" rx="' + n(W * (0.08 + aleat(i, 7) * 0.12)) +
                '" ry="' + n(H * (0.02 + aleat(i, 8) * 0.025)) + '" fill="' + (i % 2 ? '#62203a' : '#7a2a30') + '" opacity=".55" filter="url(#' + id + '-nuvem)"/>';
        }
        // focos de luz a varrer o céu (rodam à volta da base, atrás da colina)
        [0.13, 0.35, 0.65, 0.87].forEach(function (f, k) {
            var bx = W * f, by = hz - H * 0.04, abre = H * 0.2;
            c += '<polygon class="foco" points="' + n(bx - 2) + ',' + n(by) + ' ' + n(bx + 2) + ',' + n(by) + ' ' + n(bx + abre) + ',' + n(-H * 0.15) + ' ' +
                n(bx - abre) + ',' + n(-H * 0.15) + '" fill="url(#' + id + '-foco)" style="transform-origin:' + n(bx) + 'px ' + n(by) + 'px;animation-duration:' +
                (6 + k) + 's;animation-delay:-' + n(k * 1.7) + 's"/>';
        });
        // colinas ao longe e a colina principal, com a borda iluminada pelo sol
        c += '<path d="M0,' + n(hz - H * 0.05) + ' Q' + n(W * 0.18) + ',' + n(hz - H * 0.2) + ' ' + n(W * 0.38) + ',' + n(hz - H * 0.07) +
            ' T' + n(W * 0.78) + ',' + n(hz - H * 0.11) + ' T' + n(W) + ',' + n(hz - H * 0.04) + ' L' + W + ',' + H + ' L0,' + H + 'Z" fill="#4a1c2e"/>';
        var crista = 'M0,' + n(hz + H * 0.04) + ' C' + n(W * 0.2) + ',' + n(hz - H * 0.02) + ' ' + n(W * 0.3) + ',' + n(hz - H * 0.17) + ' ' +
            n(W * 0.48) + ',' + n(hz - H * 0.16) + ' S' + n(W * 0.82) + ',' + n(hz + H * 0.02) + ' ' + n(W) + ',' + n(hz - H * 0.02);
        c += '<path d="' + crista + ' L' + W + ',' + H + ' L0,' + H + 'Z" fill="url(#' + id + '-colina)"/>' +
            '<path d="' + crista + '" fill="none" stroke="#e0742c" stroke-width="' + n(Math.max(1, H * 0.008)) + '" opacity=".75"/>';
        // palmeiras, câmara de filmar (no telemóvel, onde o avatar não a tapa) e película
        c += palmeira(W - W * 0.05, H + 2, H * 0.62, '#0a0403');
        if (W > 260) c += palmeira(W - W * 0.015, H + 2, H * 0.46, '#0a0403');
        if (est && W > 250) {
            var kx = W * 0.05, ky = H * 0.82, k = H * 0.1;
            c += '<g fill="#0a0403"><circle cx="' + n(kx + k * 0.6) + '" cy="' + n(ky - k * 1.1) + '" r="' + n(k * 0.55) + '"/><circle cx="' + n(kx + k * 1.7) + '" cy="' + n(ky - k * 1.2) + '" r="' + n(k * 0.55) + '"/>' +
                '<rect x="' + n(kx) + '" y="' + n(ky - k * 0.6) + '" width="' + n(k * 2.4) + '" height="' + n(k) + '" rx="' + n(k * 0.15) + '"/>' +
                '<polygon points="' + n(kx + k * 2.4) + ',' + n(ky - k * 0.4) + ' ' + n(kx + k * 3.1) + ',' + n(ky - k * 0.7) + ' ' + n(kx + k * 3.1) + ',' + n(ky + k * 0.3) + ' ' + n(kx + k * 2.4) + ',' + n(ky) + '"/>' +
                '<path d="M' + n(kx + k * 1.2) + ',' + n(ky + k * 0.4) + ' l-' + n(k * 0.8) + ',' + n(k * 1.4) + ' M' + n(kx + k * 1.2) + ',' + n(ky + k * 0.4) + ' l' + n(k * 0.8) + ',' + n(k * 1.4) + '" stroke="#0a0403" stroke-width="' + n(k * 0.15) + '"/></g>';
        }
        if (W > 260) {
            var fita = 'M' + n(W * 0.55) + ',' + n(H + 6) + ' Q' + n(W * 0.75) + ',' + n(H * 0.8) + ' ' + n(W * 0.97) + ',' + n(H * 0.86);
            var esp = H * 0.024;
            c += '<path d="' + fita + '" fill="none" stroke="#140906" stroke-width="' + n(H * 0.075) + '"/>' +
                '<path d="' + fita + '" fill="none" stroke="#d9a55c" stroke-width="' + n(H * 0.012) + '" stroke-dasharray="' + n(H * 0.016) + ' ' + n(H * 0.022) + '" transform="translate(0,-' + n(esp) + ')"/>' +
                '<path d="' + fita + '" fill="none" stroke="#d9a55c" stroke-width="' + n(H * 0.012) + '" stroke-dasharray="' + n(H * 0.016) + ' ' + n(H * 0.022) + '" transform="translate(0,' + n(esp) + ')"/>';
        }
        // TAVDEX gigante na colina: suportes, sombra e as letras (claras, com um toque da cor do avatar)
        for (i = 0; i < 6; i++) {
            var lx = cx - larg / 2 + larg * (i + 0.5) / 6;
            c += '<path d="M' + n(lx - fs * 0.12) + ',' + n(ty) + ' v' + n(fs * 0.16) + ' M' + n(lx + fs * 0.12) + ',' + n(ty) + ' v' + n(fs * 0.16) +
                '" stroke="#2a120c" stroke-width="' + n(Math.max(1, fs * 0.025)) + '"/>';
        }
        c += titulo(cx + fs * 0.04, ty + fs * 0.05, fs, larg, 'TAVDEX', 'fill:' + av(45, 16, 0.85)) +
            titulo(cx, ty, fs, larg, 'TAVDEX', 'fill:url(#' + id + '-letras);stroke:' + av(35, 28) + ';stroke-width:' + n(fs * 0.012));
        // estrela, linhas douradas e "FILMES E SÉRIES"
        c += legenda(cx, sy - fs2 * 1.25, fs2 * 0.95, '★', '#f2cf86') +
            '<path d="M' + n(cx - larg2 / 2 - fs2 * 4.5) + ',' + n(sy - fs2 * 0.35) + ' h' + n(fs2 * 3.5) + ' M' + n(cx + larg2 / 2 + fs2) + ',' + n(sy - fs2 * 0.35) +
            ' h' + n(fs2 * 3.5) + '" stroke="#c99a50" stroke-width="' + n(Math.max(1, fs2 * 0.12)) + '"/>' +
            legenda(cx, sy, fs2, 'FILMES E SÉRIES', '#f2cf86');
        var css = '#ID .foco{animation:ID-varre 7s ease-in-out infinite alternate}' +
            '@keyframes ID-varre{from{transform:rotate(-14deg)}to{transform:rotate(14deg)}}' +
            '#ID .estrela{animation:ID-brilha 3s ease-in-out infinite}' +
            '@keyframes ID-brilha{0%,100%{opacity:.15}50%{opacity:1}}';
        return { defs: defs, corpo: c, css: css };
    };
})();
