/* =====================================================================
   TavDex — Banner do perfil: ajudantes de desenho (SVG)
   Os 5 cenários estão um em cada ficheiro desta pasta:
     colina.js · pipocas.js · claquete.js · pelicula.js · marquise.js
   e o motor.js desenha o cenário escolhido em cada <div class="pbanner">.
   Ordem de carregamento: ajudantes.js → os 5 cenários → motor.js
   Ilustrações originais, desenhadas em SVG (vetorial: ficam nítidas em qualquer
   tamanho) e animadas com CSS. O TAVDEX aparece sempre na cor do avatar:
   as cores usam var(--h), por isso mudam logo que o --h muda, sem redesenhar.
   Tudo fica no objeto window.BannerPerfil (as funções abaixo + TEMAS).
   ===================================================================== */
(function () {
    'use strict';

    var FONTE_TITULO = "'Bebas Neue', Impact, 'Arial Narrow', sans-serif";
    var FONTE_TEXTO = "Inter, 'Segoe UI', Arial, sans-serif";
    var TEMA_POR_OMISSAO = 'colina';

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

    // Partilhado com os ficheiros dos cenários e com o motor.js
    window.BannerPerfil = {
        FONTE_TITULO: FONTE_TITULO, FONTE_TEXTO: FONTE_TEXTO, TEMA_POR_OMISSAO: TEMA_POR_OMISSAO,
        n: n, aleat: aleat, av: av, titulo: titulo, legenda: legenda, bobine: bobine,
        palmeira: palmeira, filtroBrilho: filtroBrilho,
        // Os cenários: cada ficheiro acrescenta o seu (TEMAS.colina = function (E) {...}).
        // Cada um recebe E = { W, H, id, estreito } e devolve { defs, corpo, css }.
        // estreito = telemóvel ou miniatura (o avatar fica ao centro, em baixo);
        // no computador o avatar fica em baixo à esquerda.
        // No CSS, "#ID" é o id deste banner (o mesmo cenário pode estar várias vezes na página).
        TEMAS: {},
    };
})();
