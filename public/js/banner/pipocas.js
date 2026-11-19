/* =====================================================================
   TavDex — Banner do perfil: cenário "pipocas"
   Sessão de pipocas: cortinas de veludo, TAVDEX nos fotogramas, balde de pipocas e confetes
   Precisa do ajudantes.js (carregado antes).
   ===================================================================== */
(function () {
    'use strict';
    var B = window.BannerPerfil;
    var n = B.n, aleat = B.aleat, av = B.av, titulo = B.titulo, bobine = B.bobine;
    var TEMAS = B.TEMAS;

    TEMAS.pipocas = function (E) {
        var W = E.W, H = E.H, id = E.id, est = E.estreito, i;
        var cw = est ? W * 0.09 : W * 0.075;                 // largura das cortinas
        var fh = Math.min(est ? H * 0.42 : H * 0.46, (W - 2 * cw) * 0.82 / (3 * 1.25 + 0.24));   // altura de um fotograma
        var fw = fh * 1.25, gap = fh * 0.12, total = 3 * fw + 2 * gap;
        var fx0 = (W - total) / 2, cyF = est ? H * 0.38 : H * 0.42, fy = cyF - fh / 2;
        var bh = fh * 1.42, by = cyF - bh / 2;                // a faixa preta da película
        var defs =
            '<radialGradient id="' + id + '-fundo" cx="50%" cy="42%" r="70%"><stop offset="0" stop-color="#a06a3a"/><stop offset=".55" stop-color="#5a2e16"/><stop offset="1" stop-color="#1e0b05"/></radialGradient>' +
            '<linearGradient id="' + id + '-veludo" x1="0" y1="0" x2="' + n(Math.max(8, cw * 0.32)) + '" y2="0" gradientUnits="userSpaceOnUse" spreadMethod="reflect">' +
            '<stop offset="0" stop-color="#4a0716"/><stop offset=".5" stop-color="#a51d3c"/><stop offset="1" stop-color="#6a0c22"/></linearGradient>' +
            '<linearGradient id="' + id + '-papel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf0d6"/><stop offset="1" stop-color="#ead4a8"/></linearGradient>' +
            '<radialGradient id="' + id + '-pipoca" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#efcf8e"/></radialGradient>' +
            '<filter id="' + id + '-suave" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="' + n(H * 0.01) + '"/></filter>';
        var c = '<rect width="' + W + '" height="' + H + '" fill="url(#' + id + '-fundo)"/>';
        // raios de luz a sair de cima
        for (i = 0; i < 5; i++) {
            var rx = W * (0.3 + i * 0.1);
            c += '<polygon points="' + n(rx - W * 0.02) + ',0 ' + n(rx + W * 0.02) + ',0 ' + n(rx + W * (i - 2) * 0.12 + W * 0.06) + ',' + H + ' ' +
                n(rx + W * (i - 2) * 0.12 - W * 0.06) + ',' + H + '" fill="#ffd9a0" opacity=".05"/>';
        }
        // película a ondular por trás
        var onda = 'M-5,' + n(H * 0.82) + ' C' + n(W * 0.25) + ',' + n(H * 0.68) + ' ' + n(W * 0.5) + ',' + n(H * 0.98) + ' ' + n(W + 5) + ',' + n(H * 0.76);
        c += '<path d="' + onda + '" fill="none" stroke="#2e170b" stroke-width="' + n(H * 0.1) + '"/>' +
            '<path d="' + onda + '" fill="none" stroke="#8a5a36" stroke-width="' + n(H * 0.016) + '" stroke-dasharray="' + n(H * 0.02) + ' ' + n(H * 0.03) + '"/>';
        // a película principal (ligeiramente inclinada) com os fotogramas: "TA" "VD" "EX"
        c += '<g transform="rotate(-2 ' + n(W / 2) + ' ' + n(cyF) + ')">' +
            '<rect x="' + n(fx0 - fh * 0.2) + '" y="' + n(by) + '" width="' + n(total + fh * 0.4) + '" height="' + n(bh) + '" rx="' + n(fh * 0.05) + '" fill="#171110"/>';
        for (var hx = fx0 - fh * 0.12; hx < fx0 + total + fh * 0.1; hx += fh * 0.19) {
            c += '<rect x="' + n(hx) + '" y="' + n(by + bh * 0.045) + '" width="' + n(fh * 0.1) + '" height="' + n(fh * 0.07) + '" rx="1" fill="#efe2c4"/>' +
                '<rect x="' + n(hx) + '" y="' + n(by + bh - bh * 0.045 - fh * 0.07) + '" width="' + n(fh * 0.1) + '" height="' + n(fh * 0.07) + '" rx="1" fill="#efe2c4"/>';
        }
        ['TA', 'VD', 'EX'].forEach(function (par, k) {
            var x = fx0 + k * (fw + gap);
            c += '<rect x="' + n(x) + '" y="' + n(fy) + '" width="' + n(fw) + '" height="' + n(fh) + '" fill="url(#' + id + '-papel)" stroke="#c9ad78" stroke-width="1"/>' +
                titulo(x + fw / 2 + fh * 0.03, fy + fh * 0.8 + fh * 0.03, fh * 0.78, fw * 0.74, par, 'fill:rgba(120,80,40,.35)') +
                titulo(x + fw / 2, fy + fh * 0.8, fh * 0.78, fw * 0.74, par, 'fill:' + av(58, 34) + ';stroke:' + av(62, 22) + ';stroke-width:' + n(fh * 0.012));
        });
        c += '</g>';
        // cortinas de veludo com o drapeado
        var cort = 'M0,0 L' + n(cw * 1.1) + ',0 Q' + n(cw * 0.6) + ',' + n(H * 0.45) + ' ' + n(cw) + ',' + n(H) + ' L0,' + H + 'Z';
        c += '<path d="' + cort + '" fill="url(#' + id + '-veludo)"/>' +
            '<path d="' + cort + '" fill="url(#' + id + '-veludo)" transform="translate(' + W + ',0) scale(-1,1)"/>';
        for (i = 0; i * H * 0.07 < W; i++) {
            c += '<circle cx="' + n(i * H * 0.07) + '" cy="0" r="' + n(H * 0.045) + '" fill="#5a0a1c"/>';
        }
        c += '<rect width="' + W + '" height="' + n(H * 0.02) + '" fill="#3e0614"/>';
        // bobine (em baixo à esquerda), claquete (em baixo à direita) e o balde de pipocas
        c += bobine(cw + H * 0.16, H * 0.98, H * 0.17, '#9a918a', '#3a2a20');
        var kx = W - cw - H * 0.42, ky = H * 0.8, k = H * 0.34;
        c += '<g><rect x="' + n(kx) + '" y="' + n(ky) + '" width="' + n(k) + '" height="' + n(k * 0.55) + '" rx="2" fill="#1a1716"/>' +
            '<path d="M' + n(kx + k * 0.08) + ',' + n(ky + k * 0.22) + ' h' + n(k * 0.84) + ' M' + n(kx + k * 0.08) + ',' + n(ky + k * 0.4) + ' h' + n(k * 0.84) + '" stroke="#77716c" stroke-width="1"/>';
        for (i = 0; i < 6; i++) c += '<rect x="' + n(kx + i * k / 6) + '" y="' + n(ky - k * 0.16) + '" width="' + n(k / 12) + '" height="' + n(k * 0.14) + '" fill="#f2f2f2"/>';
        c += '<rect x="' + n(kx) + '" y="' + n(ky - k * 0.16) + '" width="' + n(k) + '" height="' + n(k * 0.14) + '" fill="none" stroke="#1a1716" stroke-width="1"/></g>';
        // No telemóvel o balde vai para a direita (o avatar fica ao centro) e um pouco mais abaixo, para não tapar o "EX"
        var bx = est ? W * 0.72 : W * 0.5, topo = by + bh + (est ? H * 0.06 : -H * 0.04), bl = Math.min(H * 0.32, W * 0.16), bb = bl * 0.74;
        var balde = 'M' + n(bx - bl / 2) + ',' + n(topo) + ' L' + n(bx + bl / 2) + ',' + n(topo) + ' L' + n(bx + bb / 2) + ',' + n(H + 2) + ' L' + n(bx - bb / 2) + ',' + n(H + 2) + 'Z';
        c += '<clipPath id="' + id + '-balde"><path d="' + balde + '"/></clipPath><g clip-path="url(#' + id + '-balde)"><path d="' + balde + '" fill="#f6ecd8"/>';
        for (i = 0; i < 7; i += 2) c += '<rect x="' + n(bx - bl / 2 + i * bl / 7) + '" y="' + n(topo) + '" width="' + n(bl / 7) + '" height="' + n(H) + '" fill="#c8243a"/>';
        c += '<rect x="' + n(bx - bl) + '" y="' + n(topo) + '" width="' + n(bl * 0.6) + '" height="' + n(H) + '" fill="rgba(0,0,0,.12)" transform="skewX(-6)"/></g>' +
            '<rect x="' + n(bx - bl / 2 - 1) + '" y="' + n(topo - H * 0.012) + '" width="' + n(bl + 2) + '" height="' + n(H * 0.03) + '" rx="2" fill="#f8efdc"/>';
        for (i = 0; i < 15; i++) {
            c += '<circle cx="' + n(bx - bl * 0.45 + aleat(i, 31) * bl * 0.9) + '" cy="' + n(topo - H * 0.02 - aleat(i, 32) * H * 0.09) + '" r="' + n(H * (0.03 + aleat(i, 33) * 0.018)) +
                '" fill="url(#' + id + '-pipoca)" stroke="#e2bf7a" stroke-width=".6"/>';
        }
        // confetes dourados a cair (cada um com a sua velocidade e o seu atraso)
        for (i = 0; i < 34; i++) {
            c += '<rect class="confete" x="' + n(aleat(i, 41) * W) + '" y="' + n(-H * 0.1) + '" width="' + n(H * 0.022) + '" height="' + n(H * 0.04) +
                '" fill="' + ['#f5c74e', '#e8a43a', '#ffe08a'][i % 3] + '" style="animation-duration:' + n(4 + aleat(i, 42) * 4) + 's;animation-delay:-' + n(aleat(i, 43) * 8) + 's"/>';
        }
        var css = '#ID .confete{transform-box:fill-box;transform-origin:center;animation:ID-cai 6s linear infinite}' +
            '@keyframes ID-cai{from{transform:translate(0,0) rotate(0)}to{transform:translate(' + n(H * 0.15) + 'px,' + n(H * 1.25) + 'px) rotate(540deg)}}';
        return { defs: defs, corpo: c, css: css };
    };
})();
