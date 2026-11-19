/* =====================================================================
   TavDex — Banner do perfil (5 cenários de cinema em SVG)
     colina    → "Colina das estrelas": pôr do sol, focos de luz a varrer o céu,
                 o TAVDEX em letras gigantes na colina, palmeiras e película
     pipocas   → "Sessão de pipocas": cortinas de veludo, o TAVDEX nos fotogramas
                 de uma película, balde de pipocas e confetes dourados a cair
     claquete  → "Claquete antiga": papel envelhecido, claquete que abre e fecha,
                 bobines, máquina fotográfica e uma borboleta a voar
     pelicula  → "Rolo de película": películas a correr e um projetor (com as
                 bobines a rodar) a lançar o feixe de luz sobre o TAVDEX
     marquise  → "Cinema à noite": fachada art déco, placa "CINEMA" em néon e
                 marquise iluminada com lâmpadas a correr
   Ilustrações originais, desenhadas em SVG (vetorial: ficam nítidas em qualquer
   tamanho) e animadas com CSS. O TAVDEX aparece sempre na cor do avatar:
   as cores usam var(--h), por isso mudam logo que o --h muda, sem redesenhar.
   Uso: <div class="pbanner" data-tema="colina" aria-hidden="true"></div>
   ===================================================================== */
(function () {
    'use strict';

    var FONTE_TITULO = "'Bebas Neue', Impact, 'Arial Narrow', sans-serif";
    var FONTE_TEXTO = "Inter, 'Segoe UI', Arial, sans-serif";
    var TEMA_POR_OMISSAO = 'colina';
    var contador = 0;

    // ---------- Ajudantes ----------
    // Arredonda a 1 casa decimal (o SVG fica mais pequeno)
    function n(v) { return Math.round(v * 10) / 10; }
    // Número "aleatório" mas sempre igual para os mesmos (a, b): o desenho não muda ao redesenhar
    function aleat(a, b) {
        var x = (a * 374761393 + b * 668265263) | 0;
        x = Math.imul(x ^ (x >>> 13), 1274126177);
        x ^= x >>> 16;
        return (x >>> 0) / 4294967296;
    }
    // Cor na cor do avatar (o --h vem do CSS do perfil)
    function av(s, l, a) {
        return a === undefined ? 'hsl(var(--h), ' + s + '%, ' + l + '%)' : 'hsla(var(--h), ' + s + '%, ' + l + '%, ' + a + ')';
    }
    // Texto grande (Bebas Neue) com uma largura exata, para o desenho não depender da letra carregada
    function titulo(x, y, fs, larg, conteudo, estilo, extra) {
        return '<text x="' + n(x) + '" y="' + n(y) + '" font-family="' + FONTE_TITULO + '" font-size="' + n(fs) +
            '" textLength="' + n(larg) + '" lengthAdjust="spacingAndGlyphs" text-anchor="middle" style="' + estilo + '"' +
            (extra || '') + '>' + conteudo + '</text>';
    }
    // Texto pequeno (Inter), com espaço entre as letras
    function legenda(x, y, fs, conteudo, cor, extra) {
        return '<text x="' + n(x) + '" y="' + n(y) + '" font-family="' + FONTE_TEXTO + '" font-size="' + n(fs) +
            '" font-weight="700" letter-spacing="' + n(fs * 0.22) + '" text-anchor="middle" fill="' + cor + '"' + (extra || '') + '>' + conteudo + '</text>';
    }
    // Bobine de filme: disco, 5 furos e o centro
    function bobine(cx, cy, r, aro, furo, classe) {
        var s = '<g' + (classe ? ' class="' + classe + '" style="transform-origin:' + n(cx) + 'px ' + n(cy) + 'px"' : '') + '>' +
            '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r) + '" fill="' + aro + '"/>';
        for (var i = 0; i < 5; i++) {
            var a = -Math.PI / 2 + i * 2 * Math.PI / 5;
            s += '<circle cx="' + n(cx + Math.cos(a) * r * 0.55) + '" cy="' + n(cy + Math.sin(a) * r * 0.55) + '" r="' + n(r * 0.24) + '" fill="' + furo + '"/>';
        }
        return s + '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r * 0.13) + '" fill="' + furo + '"/></g>';
    }
    // Palmeira (silhueta): tronco curvo e folhas
    function palmeira(x, base, alt, cor) {
        var tx = x + alt * 0.07, ty = base - alt;
        var s = '<path d="M' + n(x) + ',' + n(base) + ' Q' + n(x + alt * 0.14) + ',' + n(base - alt * 0.5) + ' ' + n(tx) + ',' + n(ty) +
            '" stroke="' + cor + '" stroke-width="' + n(alt * 0.05) + '" fill="none" stroke-linecap="round"/>';
        [[-0.44, 0.22], [-0.38, 0.03], [-0.2, -0.14], [0.2, -0.14], [0.38, 0.03], [0.44, 0.22], [0.02, -0.2]].forEach(function (d) {
            var ex = tx + d[0] * alt, ey = ty + d[1] * alt, mx = tx + d[0] * alt * 0.5, my = ty + d[1] * alt * 0.5 - alt * 0.12;
            s += '<path d="M' + n(tx) + ',' + n(ty) + ' Q' + n(mx) + ',' + n(my) + ' ' + n(ex) + ',' + n(ey) +
                ' Q' + n(mx) + ',' + n(my + alt * 0.08) + ' ' + n(tx) + ',' + n(ty) + 'Z" fill="' + cor + '"/>';
        });
        return s + '<circle cx="' + n(tx) + '" cy="' + n(ty + alt * 0.03) + '" r="' + n(alt * 0.035) + '" fill="' + cor + '"/>';
    }
    // Brilho (néon, luzes): desfoca uma cópia e põe o original por cima
    function filtroBrilho(id, forca) {
        return '<filter id="' + id + '" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="' + n(forca) +
            '" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
    }

    // =====================================================================
    //  OS 5 CENÁRIOS
    //  Cada um recebe E = { W, H, id, estreito } e devolve { defs, corpo, css }.
    //  estreito = telemóvel ou miniatura (o avatar fica ao centro, em baixo);
    //  no computador o avatar fica em baixo à esquerda.
    //  No CSS, "#ID" é o id deste banner (o mesmo cenário pode estar várias vezes na página).
    // =====================================================================
    var TEMAS = {};

    // ---------- 1) Colina das estrelas ----------
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

    // ---------- 2) Sessão de pipocas ----------
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

    // ---------- 3) Claquete antiga ----------
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

    // ---------- 4) Rolo de película ----------
    TEMAS.pelicula = function (E) {
        var W = E.W, H = E.H, id = E.id, est = E.estreito, i;
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

    // ---------- 5) Cinema à noite ----------
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
