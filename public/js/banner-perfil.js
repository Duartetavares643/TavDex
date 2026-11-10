/* =====================================================================
   TavDex — Banner pixel art do perfil (4 cenários de cinema)
     fachada  → cinema de bairro de dia: letreiro com lâmpadas, bilheteira,
                passadeira vermelha e placa vertical "CINEMA"
     estreia  → noite de estreia à chuva: marquise iluminada, cartazes,
                portas de vidro e chão molhado
     noir     → cinema noir a sépia, dentro de uma película a correr:
                rua à noite, candeeiro, carro antigo e letreiro néon
     cartaz   → cartaz vintage de chapa: laço creme, bobine, bilhete,
                fita "PIPOCAS" e "EM CARTAZ"
   Uso: <div class="pbanner" data-tema="fachada" aria-hidden="true"></div>
   ===================================================================== */
(function () {
    'use strict';

    // ---------- Letras ----------
    // Grandes (5×7), para o TAVDEX
    var LETRAS = {
        T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
        A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
        V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
        D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
        E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
        X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001']
    };
    // Pequenas (3×5), para os outros textos
    var MINI = {
        A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'],
        C: ['011', '100', '100', '100', '011'], E: ['111', '100', '110', '100', '111'],
        'É': ['111', '100', '110', '100', '111'], F: ['111', '100', '110', '100', '100'],
        H: ['101', '101', '111', '101', '101'], I: ['111', '010', '010', '010', '111'],
        L: ['100', '100', '100', '100', '111'], M: ['101', '111', '111', '101', '101'],
        N: ['110', '101', '101', '101', '101'], O: ['111', '101', '101', '101', '111'],
        P: ['110', '101', '110', '100', '100'], R: ['110', '101', '110', '101', '101'],
        S: ['011', '100', '010', '001', '110'], T: ['111', '010', '010', '010', '010'],
        Z: ['111', '001', '010', '100', '111']
    };

    // Matriz de Bayer: mistura duas cores aos pontinhos (degradê "à antiga")
    var BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

    // ---------- Ajudantes ----------
    // Número "aleatório" mas sempre igual para o mesmo (x, y)
    function aleat(x, y) {
        var n = (x * 374761393 + y * 668265263) | 0;
        n = Math.imul(n ^ (n >>> 13), 1274126177);
        n ^= n >>> 16;
        return (n >>> 0) / 4294967296;
    }
    function ret(c, x, y, w, h, cor) { c.fillStyle = cor; c.fillRect(x, y, w, h); }
    function moldura(c, x, y, w, h, cor) {
        ret(c, x, y, w, 1, cor); ret(c, x, y + h - 1, w, 1, cor);
        ret(c, x, y, 1, h, cor); ret(c, x + w - 1, y, 1, h, cor);
    }
    function hsl(h, s, l, a) { return 'hsla(' + h + ',' + s + '%,' + l + '%,' + (a === undefined ? 1 : a) + ')'; }

    // Cor de um degradê com pontinhos (f vai de 0 a 1)
    function corD(cores, f, x, y) {
        if (cores.length === 1) return cores[0];
        f = Math.max(0, Math.min(1, f)) * (cores.length - 1);
        var i = Math.min(cores.length - 2, Math.floor(f));
        return (f - i) > (BAYER[y & 3][x & 3] + 0.5) / 16 ? cores[i + 1] : cores[i];
    }
    // Uma linha horizontal de degradê (x1 exclusivo)
    function linhaD(c, x0, x1, y, cores, f) {
        var ini = x0, cor = null;
        for (var x = x0; x < x1; x++) {
            var k = corD(cores, f, x, y);
            if (k !== cor) { if (cor) ret(c, ini, y, x - ini, 1, cor); cor = k; ini = x; }
        }
        if (cor) ret(c, ini, y, x1 - ini, 1, cor);
    }
    // Retângulo com degradê vertical
    function degrade(c, x0, y0, x1, y1, cores) {
        for (var y = y0; y < y1; y++) linhaD(c, x0, x1, y, cores, (y - y0) / Math.max(1, y1 - y0 - 1));
    }
    // Círculo cheio (só as linhas acima de yMax)
    function disco(c, cx, cy, r, cor, yMax) {
        for (var dy = -r; dy <= r; dy++) {
            var y = cy + dy;
            if (y >= yMax) continue;
            var dx = Math.floor(Math.sqrt(r * r - dy * dy));
            ret(c, cx - dx, y, 2 * dx + 1, 1, cor);
        }
    }

    // Texto → lista de "blocos" (pixels) a desenhar
    function texto(t, fonte, k, esp) {
        var lista = [], cx = 0, alt = 0;
        for (var i = 0; i < t.length; i++) {
            var ch = t[i];
            if (ch === ' ') { cx += 2 * k + esp; continue; }
            var g = fonte[ch];
            if (!g) continue;
            alt = Math.max(alt, g.length * k);
            for (var r = 0; r < g.length; r++) for (var c = 0; c < g[r].length; c++) {
                if (g[r][c] === '1') lista.push({ x: cx + c * k, y: r * k, s: k, i: i });
            }
            if (ch === 'É') lista.push({ x: cx + 2 * k, y: -2 * k, s: k, i: i });   // acento
            cx += g[0].length * k + esp;
        }
        lista.largura = cx - esp;
        lista.altura = alt;
        return lista;
    }
    // Texto na vertical (letras umas por baixo das outras)
    function textoV(t, fonte, k, esp) {
        var lista = [], cy = 0;
        for (var i = 0; i < t.length; i++) {
            var g = fonte[t[i]];
            if (!g) continue;
            for (var r = 0; r < g.length; r++) for (var c = 0; c < g[r].length; c++) {
                if (g[r][c] === '1') lista.push({ x: c * k, y: cy + r * k, s: k, i: i });
            }
            cy += g.length * k + esp;
        }
        lista.largura = 3 * k;
        lista.altura = cy - esp;
        return lista;
    }
    function mover(lista, dx, dy) { lista.forEach(function (b) { b.x += dx; b.y += dy; }); return lista; }
    function pintar(c, blocos, cor) { blocos.forEach(function (b) { ret(c, b.x, b.y, b.s, b.s, cor); }); }

    // Néon: halo, contorno colorido e núcleo claro (uma letra pode estar "apagada")
    function neon(ctx, blocos, halo, contorno, nucleo, apagada, corOff) {
        blocos.forEach(function (b) {
            if (!apagada(b.i)) ret(ctx, b.x - 2, b.y - 2, b.s + 4, b.s + 4, halo);
        });
        blocos.forEach(function (b) {
            ret(ctx, b.x - 1, b.y - 1, b.s + 2, b.s + 2, apagada(b.i) ? corOff.contorno : contorno);
        });
        blocos.forEach(function (b) {
            ret(ctx, b.x, b.y, b.s, b.s, apagada(b.i) ? corOff.nucleo : nucleo);
        });
    }

    // Chuva: gotas com posição inicial fixa que descem com o tempo
    function criarGotas(E, densidade, semente, comp) {
        var n = Math.round(E.W * E.H / densidade), g = [];
        for (var i = 0; i < n; i++) g.push({
            x: aleat(i, semente) * E.W, y: aleat(i, semente + 1) * (E.H + 10),
            v: 3 + aleat(i, semente + 2) * 2.5, l: comp + Math.floor(aleat(i, semente + 3) * 3)
        });
        return g;
    }
    function desenharChuva(ctx, E, gotas, cor) {
        var H = E.H + 10, W = E.W;
        gotas.forEach(function (g) {
            var y = ((g.y + E.t * g.v) % H) - 5;
            ret(ctx, Math.round(((g.x - (y + 5) * 0.05) % W + W) % W), Math.round(y), 1, g.l, cor);
        });
    }

    // =====================================================================
    //  OS 4 CENÁRIOS
    //  preparar → calcula posições | fundo → parte fixa (desenhada 1 vez)
    //  frame → o que se mexe (10 vezes por segundo)
    // =====================================================================
    var TEMAS = {};

    // ---------- 1) Cinema de bairro (de dia) ----------
    function tijolos(c, x0, y0, w, h) {
        ret(c, x0, y0, w, h, '#9c4f3c');
        for (var y = y0; y < y0 + h; y += 4) {
            ret(c, x0, y, w, 1, '#7a3a2c');
            for (var x = x0 + (((y - y0) / 4) % 2 ? 4 : 0); x < x0 + w; x += 8) ret(c, x, y, 1, 4, '#7a3a2c');
        }
    }
    TEMAS.fachada = {
        preparar: function (E) {
            var W = E.W, H = E.H, est = E.estreito;
            E.cx = Math.round(W / 2);
            E.pw = E.lw + 14; E.px = Math.round((W - E.pw) / 2);   // painel das letras
            E.chao = H - 9;
            E.capTopo = 9; E.pTop = 14;
            E.lx = E.px + 7; E.ly = 17;
            E.sx = E.px + Math.round((E.pw - E.sw) / 2); E.sy = E.ly + 24;
            E.pBot = E.sy + 7;
            E.portaY = E.pBot + 5;
            E.torreW = est ? Math.max(16, E.px - 2) : 54;           // as duas torres de pedra
            E.tE = E.px - E.torreW; E.tD = E.px + E.pw;
            E.lamp = [];                                            // lâmpadas do toldo
            for (var x = E.px - 2; x <= E.px + E.pw + 1; x += 6) {
                E.lamp.push({ x: x, y: E.capTopo + 2 });
                E.lamp.push({ x: x, y: E.pBot + 2 });
            }
            var s = { bl: textoV('CINEMA', MINI, 1, 2), w: 7 };      // placa vertical
            s.h = s.bl.altura + 4;
            s.x = est ? E.tD + E.torreW - 9 : E.tD + E.torreW - 3;
            s.y = 7;
            mover(s.bl, s.x + 2, s.y + 2);
            E.sinal = s;
        },
        fundo: function (c, E) {
            var W = E.W, H = E.H, est = E.estreito, tE = E.tE, tD = E.tD, tw = E.torreW, chao = E.chao;
            var px = E.px, pw = E.pw, x, y, i;
            degrade(c, 0, 0, W, 12, ['#6fb7d8', '#a9d8ea']);
            // prédios vizinhos
            if (tE > 0) {
                tijolos(c, 0, 3, tE, chao - 3);
                if (tE > 22) { ret(c, 9, 15, 15, 17, '#5b3a30'); ret(c, 10, 16, 13, 15, '#2b3550'); ret(c, 10, 23, 13, 1, '#5b3a30'); ret(c, 12, 17, 1, 3, '#5a6a90'); }
            }
            var dx = tD + tw;
            if (dx < W) {
                ret(c, dx, 5, W - dx, chao - 5, '#b7aa92');
                for (y = 9; y < chao; y += 6) ret(c, dx, y, W - dx, 1, '#a4977e');
                if (W - dx > 22) { ret(c, dx + 9, 15, W - dx - 16, 17, '#4a4038'); ret(c, dx + 10, 16, W - dx - 18, 15, '#2b3550'); ret(c, dx + 12, 17, 1, 3, '#5a6a90'); }
            }
            // torres de pedra com janela e cartaz
            [tE, tD].forEach(function (tx, lado) {
                ret(c, tx, 9, tw, chao - 9, '#d8c39a');
                for (y = 14; y < chao - 6; y += 12) ret(c, tx, y, tw, 3, '#c9a465');
                for (y = 11; y < chao - 6; y += 4) for (x = tx + ((y >> 2) % 2) * 5; x < tx + tw; x += 10) ret(c, x, y, 1, 3, '#c4ad82');
                ret(c, tx - 1, 5, tw + 2, 4, '#a39d97'); ret(c, tx - 1, 5, tw + 2, 1, '#cbc6c0'); ret(c, tx - 1, 8, tw + 2, 1, '#7d7872');
                ret(c, tx, chao - 6, tw, 6, '#a2482f'); ret(c, tx, chao - 6, tw, 1, '#c25a3d');
                var livre = !(est && lado === 1);   // no telemóvel a torre da direita leva a placa CINEMA
                var ww = Math.min(14, tw - (livre ? 6 : 14)), wx = livre ? tx + Math.round((tw - ww) / 2) : tx + 3;
                if (ww >= 6) {
                    ret(c, wx - 1, 17, ww + 2, 16, '#6b6672'); ret(c, wx, 18, ww, 14, '#2b3550'); ret(c, wx, 25, ww, 1, '#6b6672');
                    ret(c, wx + ww - 4, 19, 1, 1, '#7d8db5'); ret(c, wx + ww - 5, 20, 1, 1, '#7d8db5'); ret(c, wx + ww - 3, 26, 1, 1, '#7d8db5'); ret(c, wx + ww - 4, 27, 1, 1, '#7d8db5');
                }
                if (livre && tw >= 14) {
                    var cw = Math.min(12, tw - 6), cx = tx + Math.round((tw - cw) / 2), cy = chao - 25;
                    ret(c, cx - 1, cy - 1, cw + 2, 18, '#c9a465');
                    ret(c, cx, cy, cw, 16, lado ? '#2a2230' : '#b8322a');
                    var m = cx + Math.floor(cw / 2);
                    if (lado) { ret(c, m - 2, cy + 6, 5, 1, '#f2c14e'); ret(c, m, cy + 4, 1, 5, '#f2c14e'); ret(c, m - 1, cy + 5, 3, 3, '#f2c14e'); }
                    else { disco(c, m, cy + 6, 3, '#1a1014', 999); ret(c, m, cy + 6, 1, 1, '#f1e3c0'); }
                    ret(c, cx + 2, cy + 12, cw - 4, 1, '#f1e3c0'); ret(c, cx + 3, cy + 14, cw - 6, 1, '#f1e3c0');
                }
            });
            // por baixo do letreiro: portas, bilheteira e passadeira vermelha
            var py = E.portaY, ph = chao - py, dw = Math.round(pw * 0.3);
            ret(c, px, E.pBot, pw, chao - E.pBot, '#3b2b2b');
            var d0 = px + 2;
            ret(c, d0, py, dw, ph, '#b03a2e'); moldura(c, d0, py, dw, ph, '#7a2219'); ret(c, d0 + Math.round(dw / 2), py, 1, ph, '#7a2219');
            disco(c, d0 + Math.round(dw * 0.25), py + 5, 2, '#8fc7cf', 999); disco(c, d0 + Math.round(dw * 0.75), py + 5, 2, '#8fc7cf', 999);
            ret(c, d0 + 2, py + 10, dw - 4, 1, '#d9c27a');
            var b0 = px + Math.round((pw - dw) / 2), vid = Math.round(ph * 0.55);
            ret(c, b0, py - 1, dw, 2, '#7a7f88');
            ret(c, b0 + 1, py + 1, dw - 2, vid, '#8fc7cf'); ret(c, b0 + 3, py + 2, 1, 4, '#d6f0f2');
            ret(c, b0 + Math.round(dw / 2) - 1, py + 3, 3, 3, '#3d5a7a'); ret(c, b0 + Math.round(dw / 2) - 2, py + 6, 5, 3, '#3d5a7a');
            ret(c, b0, py + 1 + vid, dw, ph - 1 - vid, '#8a5a32'); ret(c, b0, py + 1 + vid, dw, 1, '#a97446');
            var e0 = px + pw - dw - 2;
            ret(c, e0, py, dw, ph, '#2a1612');
            for (y = py + 4; y < chao; y++) {
                var f = (y - py - 4) / Math.max(1, chao - py - 5), lw = Math.round(dw * 0.4 + f * dw * 0.5), lx = e0 + Math.round((dw - lw) / 2);
                ret(c, lx, y, lw, 1, '#c0392b'); ret(c, lx, y, 1, 1, '#e2a03a'); ret(c, lx + lw - 1, y, 1, 1, '#e2a03a');
            }
            // toldos vermelhos e painel creme com um azulejo por letra
            function toldo(y) { ret(c, px - 4, y, pw + 8, 5, '#c8372b'); ret(c, px - 4, y, pw + 8, 1, '#e8604f'); ret(c, px - 4, y + 4, pw + 8, 1, '#8e2219'); }
            toldo(E.capTopo);
            ret(c, px, E.pTop, pw, E.pBot - E.pTop, '#f3e6b8');
            for (x = px + 3; x < px + pw; x += 6) ret(c, x, E.pTop, 1, E.pBot - E.pTop, '#e9d9a4');
            for (y = E.pTop + 3; y < E.pBot; y += 6) ret(c, px, y, pw, 1, '#e9d9a4');
            for (i = 0; i < 6; i++) { ret(c, E.lx + i * 18 - 1, E.ly - 1, 17, 23, '#c8b27a'); ret(c, E.lx + i * 18, E.ly, 15, 21, '#fbf3d6'); }
            toldo(E.pBot);
            // máquina de filmar em cima do letreiro
            var cx0 = E.cx;
            disco(c, cx0 - 4, 3, 3, '#2d2f4f', 999); disco(c, cx0 + 3, 3, 3, '#2d2f4f', 999);
            ret(c, cx0 - 4, 3, 1, 1, '#6a6ea0'); ret(c, cx0 + 3, 3, 1, 1, '#6a6ea0');
            ret(c, cx0 - 6, 5, 11, 4, '#2d2f4f'); ret(c, cx0 + 5, 6, 3, 2, '#2d2f4f'); ret(c, cx0 + 8, 5, 1, 4, '#2d2f4f');
            ret(c, cx0 - 2, 9, 4, 1, '#2d2f4f');
            // passeio
            ret(c, 0, chao, W, H - chao, '#e2d6bb');
            ret(c, 0, chao, W, 1, '#b5a98f'); ret(c, 0, chao + 5, W, 1, '#cdbf9f');
            for (x = 12; x < W; x += 26) ret(c, x, chao + 1, 1, 4, '#cdbf9f');
            for (x = 25; x < W; x += 26) ret(c, x, chao + 6, 1, H - chao - 6, '#cdbf9f');
        },
        frame: function (ctx, E, h) {
            var t = E.t;
            // lâmpadas a "correr" à volta do letreiro
            E.lamp.forEach(function (l, i) {
                var acesa = ((Math.floor(i / 2) + Math.floor(t / 2)) % 3) !== 0;
                if (acesa) ret(ctx, l.x - 1, l.y - 1, 3, 3, 'rgba(255,230,120,.4)');
                ret(ctx, l.x, l.y, 1, 1, acesa ? '#fff1a0' : '#9a6a2a');
            });
            pintar(ctx, E.letreiro, hsl(h, 70, 30));   // TAVDEX na cor do avatar
            pintar(ctx, E.sub, hsl(h, 45, 26));
            // placa vertical CINEMA: as letras acendem uma a uma
            var s = E.sinal, fase = Math.floor(t / 4) % 10;
            ret(ctx, s.x, s.y, s.w, s.h, '#2f5fb3'); moldura(ctx, s.x, s.y, s.w, s.h, '#1d3c7a'); ret(ctx, s.x + 1, s.y + 1, 1, s.h - 2, '#5b8ce0');
            s.bl.forEach(function (b) {
                var on = fase > b.i || fase >= 6;
                if (on) ret(ctx, b.x - 1, b.y - 1, 3, 3, 'rgba(255,216,74,.22)');
            });
            s.bl.forEach(function (b) { ret(ctx, b.x, b.y, 1, 1, (fase > b.i || fase >= 6) ? '#ffd84a' : '#8a7a3a'); });
            // senhor a passear no passeio
            var x = Math.round(((t * 0.7) % (E.W + 20)) - 10), yb = E.H - 2, p = Math.floor(t / 2) % 2;
            ret(ctx, x, yb - 10, 3, 1, '#4a4a52'); ret(ctx, x - 1, yb - 9, 5, 1, '#4a4a52');
            ret(ctx, x, yb - 8, 3, 2, '#e0b088');
            ret(ctx, x - 1, yb - 6, 5, 4, '#3a5a4a'); ret(ctx, x + 1, yb - 6, 1, 2, '#c9a465');
            ret(ctx, x + (p ? 0 : 1), yb - 2, 1, 2, '#2a2a3a'); ret(ctx, x + (p ? 2 : 1), yb - 2, 1, 2, '#2a2a3a');
        }
    };

    // ---------- 2) Noite de estreia (à chuva) ----------
    TEMAS.estreia = {
        preparar: function (E) {
            var W = E.W, est = E.estreito;
            E.cx = Math.round(W / 2);
            E.pw = E.lw + 16; E.px = Math.round((W - E.pw) / 2);
            E.pTop = 10; E.lx = E.px + 8; E.ly = 14;
            E.sx = E.px + Math.round((E.pw - E.sw) / 2); E.sy = E.ly + 25;
            E.pBot = E.sy + 8;
            E.chao = E.H - 7;
            E.cartazes = [];
            var n = est ? 1 : 3, cw = 9, ch = Math.max(6, Math.min(15, E.chao - E.pBot - 9));
            for (var i = 0; i < n; i++) {
                E.cartazes.push({ x: 5 + i * (cw + 4), y: E.pBot + 6, w: cw, h: ch, k: i });
                E.cartazes.push({ x: W - 5 - cw - i * (cw + 4), y: E.pBot + 6, w: cw, h: ch, k: i + 3 });
            }
            E.gotas = criarGotas(E, 45, 400, 4);
            // palavras nos painéis dos lados (só se couberem)
            E.lados = [];
            [['ESTREIA', 3, E.px - 6], ['PIPOCAS', E.px + E.pw + 3, W - E.px - E.pw - 6]].forEach(function (d) {
                var bl = texto(d[0], MINI, 2, 2);
                if (bl.largura > d[2] - 8) return;
                E.lados.push(mover(bl, d[1] + Math.round((d[2] - bl.largura) / 2), E.pTop + Math.round((E.pBot - E.pTop - 10) / 2)));
            });
        },
        fundo: function (c, E) {
            var W = E.W, H = E.H, px = E.px, pw = E.pw, pTop = E.pTop, pBot = E.pBot, chao = E.chao, cx = E.cx, est = E.estreito;
            var x, y, i;
            degrade(c, 0, 0, W, pTop + 2, ['#0c1230', '#1a2452', '#2a3672']);
            // cristas cor de laranja às escadinhas, com xadrez
            var nA = Math.max(3, Math.round(W / 70)), aw = W / nA;
            for (i = 0; i < nA; i++) {
                var acx = i * aw + aw / 2;
                for (y = 1; y < pTop; y++) {
                    var meia = Math.round((aw / 2 - 3) * (0.3 + 0.7 * (Math.floor(y / 2) * 2) / pTop));
                    var x0 = Math.round(acx - meia), x1 = Math.round(acx + meia);
                    ret(c, x0, y, x1 - x0 + 1, 1, '#e2552c');
                    for (x = x0 + 2; x < x1 - 1; x++) if ((x + y) % 2 && y > 2) ret(c, x, y, 1, 1, '#9a3018');
                    if (y % 2 === 1) ret(c, x0, y, 2, 1, '#ff8a4a');
                }
            }
            // fachada de baixo, azul, com faixas aos quadradinhos
            ret(c, 0, pBot, W, chao - pBot, '#3b3fa8');
            for (x = 0; x < W; x++) {
                ret(c, x, pBot + 3 + (x % 2), 1, 1, '#23257a');
                ret(c, x, chao - 3 + (x % 2), 1, 1, '#23257a');
            }
            // marquise: moldura laranja e três painéis claros
            ret(c, 0, pTop, W, pBot - pTop, '#e2552c');
            ret(c, 0, pTop, W, 1, '#ff8a4a');
            [{ x: 3, w: px - 6 }, { x: px + pw + 3, w: W - px - pw - 6 }, { x: px, w: pw }].forEach(function (p) {
                if (p.w < 6) return;
                ret(c, p.x, pTop + 2, p.w, pBot - pTop - 4, '#efe9ff');
                for (y = pTop + 7; y < pBot - 3; y += 6) ret(c, p.x, y, p.w, 1, '#ddd5f7');
            });
            // dois candeeiros com luz branca
            [px - 2, px + pw + 1].forEach(function (lx) {
                disco(c, lx, 2, 5, 'rgba(255,255,255,.12)', 999);
                ret(c, lx, 3, 1, pTop - 3, '#2a2a48');
                ret(c, lx - 1, 1, 3, 3, '#ffffff');
            });
            // cartazes com moldura laranja (desenhos inventados)
            var fundos = ['#c0392b', '#1fa39a', '#8e2a4a', '#2aa860', '#4a4a5a', '#d94a8a'];
            E.cartazes.forEach(function (p) {
                ret(c, p.x - 1, p.y - 1, p.w + 2, p.h + 2, '#e08a2a');
                ret(c, p.x, p.y, p.w, p.h, fundos[p.k % 6]);
                var m = p.x + Math.floor(p.w / 2), cy = p.y + Math.round(p.h * 0.4);
                disco(c, m, cy, 2, p.k % 2 ? '#f1e3c0' : '#1a1626', 999);
                ret(c, m - 1, cy, 1, 1, p.k % 2 ? '#1a1626' : '#f1e3c0'); ret(c, m + 1, cy, 1, 1, p.k % 2 ? '#1a1626' : '#f1e3c0');
                ret(c, p.x + 2, p.y + p.h - 3, p.w - 4, 1, '#f1e3c0');
            });
            // bilheteira de vidro ao centro e portas de vidro
            var by = pBot + 4, bw = 13, bx = cx - 6, dw = 9, nd = est ? 1 : 2;
            var esq = cx - 6 - 3 - nd * (dw + 2), dir = cx + 7 + 3 + nd * (dw + 2);
            ret(c, esq - 2, by, dir - esq + 4, chao - by, '#25277e');
            ret(c, bx - 1, by - 1, bw + 2, chao - by + 1, '#2a2c70');
            ret(c, bx, by, bw, chao - by, '#5aa0e8'); ret(c, bx + 1, by + 1, 2, chao - by - 2, '#9fd0ff');
            ret(c, bx + 5, by + 4, 3, 3, '#ff8a3a'); ret(c, bx + 6, by + 7, 2, 2, '#c8d8f0');
            ret(c, bx, by + Math.round((chao - by) * 0.6), bw, 1, '#3a6ad0');
            for (i = 0; i < nd; i++) [cx - 6 - 3 - (i + 1) * (dw + 2), cx + 7 + 3 + i * (dw + 2)].forEach(function (x) {
                ret(c, x - 1, by + 2, dw + 2, chao - by - 2, '#2a2c70');
                ret(c, x, by + 3, dw, chao - by - 3, '#9cc4f0');
                ret(c, x + 1, by + 4, 1, 4, '#d6e8ff');
                ret(c, x + 2, by + Math.round((chao - by) * 0.55), dw - 4, 1, '#3a6ad0');
            });
            // chão molhado
            degrade(c, 0, chao, W, H, ['#4a4a78', '#34345a']);
            ret(c, 0, chao, W, 1, '#6a6aa8');
        },
        frame: function (ctx, E, h) {
            var t = E.t, W = E.W, H = E.H, chao = E.chao, x, i;
            // lâmpadas a correr por cima e por baixo da marquise
            for (x = 1; x < W; x += 2) {
                var on = (Math.floor(x / 2) + t) % 4 < 2;
                ret(ctx, x, E.pBot - 1, 1, 1, on ? '#ffffff' : '#8a88c0');
                ret(ctx, x, E.pTop + 1, 1, 1, on ? '#ffffff' : '#c86a40');
            }
            pintar(ctx, E.letreiro, hsl(h, 60, 16));   // TAVDEX na cor do avatar
            pintar(ctx, E.sub, hsl(h, 40, 26));
            E.lados.forEach(function (bl) { pintar(ctx, bl, '#2a2c70'); });
            // reflexos a tremer no chão molhado
            for (i = 0; i < 40; i++) {
                var rx = Math.floor(aleat(i, t) * W), ry = chao + 1 + Math.floor(aleat(i + 70, t) * (H - chao - 1));
                ret(ctx, rx, ry, 2 + (i % 3), 1, i % 4 === 0 ? 'rgba(255,140,60,.35)' : 'rgba(220,215,255,.3)');
            }
            desenharChuva(ctx, E, E.gotas, 'rgba(225,230,255,.45)');
            for (i = 0; i < 6; i++) {   // salpicos
                var sx = Math.floor(aleat(i, t * 2 + 3) * W), sy = chao + 1 + Math.floor(aleat(i, t * 2 + 4) * (H - chao - 1));
                ret(ctx, sx - 1, sy, 3, 1, 'rgba(230,235,255,.55)'); ret(ctx, sx, sy - 1, 1, 1, 'rgba(230,235,255,.45)');
            }
        }
    };

    // ---------- 3) Cinema noir (sépia, dentro de uma película) ----------
    var SEPIA = ['#0b0805', '#1a140c', '#2e2416', '#4a3b24', '#6e5a38', '#98804f', '#c4a96e', '#e8d6a2', '#fff4d0'];
    function carro(c, x0, yb) {
        var P = SEPIA, k = '#050402';
        ret(c, x0 + 2, yb - 9, 46, 5, k);
        ret(c, x0 + 22, yb - 15, 18, 7, k); ret(c, x0 + 23, yb - 16, 16, 1, k);
        ret(c, x0 + 1, yb - 10, 22, 2, k); ret(c, x0 + 40, yb - 11, 9, 3, k);
        disco(c, x0 + 10, yb - 4, 5, k, yb - 3); disco(c, x0 + 40, yb - 4, 5, k, yb - 3);
        ret(c, x0 + 24, yb - 14, 6, 4, P[3]); ret(c, x0 + 32, yb - 14, 6, 4, P[3]);
        ret(c, x0 + 24, yb - 14, 6, 1, P[5]); ret(c, x0 + 32, yb - 14, 6, 1, P[5]);
        ret(c, x0 + 1, yb - 10, 21, 1, P[5]); ret(c, x0 + 22, yb - 16, 1, 6, P[4]); ret(c, x0 + 23, yb - 16, 16, 1, P[4]);
        ret(c, x0 + 2, yb - 7, 46, 1, P[6]); ret(c, x0 + 6, yb - 3, 38, 1, P[4]);
        ret(c, x0, yb - 9, 2, 5, P[4]); ret(c, x0 + 1, yb - 12, 2, 2, P[8]);
        [10, 40].forEach(function (wx) {
            disco(c, x0 + wx, yb - 2, 4, k, 999);
            disco(c, x0 + wx, yb - 2, 2, P[6], 999);
            disco(c, x0 + wx, yb - 2, 1, P[3], 999);
        });
        for (var i = 0; i < 12; i++) ret(c, x0 - 1 - i, yb - 12 - Math.floor(i / 3), 1, 2 + Math.floor(i / 2), 'rgba(255,240,200,' + (0.25 - i * 0.018).toFixed(3) + ')');
    }
    TEMAS.noir = {
        preparar: function (E) {
            var W = E.W, H = E.H, est = E.estreito;
            E.fb = H >= 74 ? 8 : 7; E.y0 = E.fb; E.y1 = H - E.fb;
            E.vx = Math.round(est ? W * 0.5 : W * 0.38); E.vy = E.y0 + Math.round((E.y1 - E.y0) * 0.45);
            E.ly = E.y0 + (est ? 5 : 7);
            E.mw = E.lw + 12;
            E.mx = est ? Math.round((W - E.mw) / 2) : W - E.mw - 14;
            E.lx = E.mx + 6; E.my = E.ly - 4;
            E.sy = E.ly + 25; E.sx = E.mx + Math.round((E.mw - E.sw) / 2);
            E.mh = E.sy + 8 - E.my;
            E.lampX = Math.round(est ? W * 0.1 : W * 0.3); E.lampY = E.y0 + 4;
            E.carro = { x: est ? W - 56 : W - 80, y: E.y1 - 2 };
            E.deco = !est;
            E.po = [];
            for (var i = 0; i < 24; i++) E.po.push({ u: aleat(i, 91), y: aleat(i, 92), v: 0.004 + aleat(i, 93) * 0.008 });
        },
        fundo: function (c, E) {
            var P = SEPIA, W = E.W, H = E.H, y0 = E.y0, y1 = E.y1, vx = E.vx, vy = E.vy, x, y, i, u;
            ret(c, 0, 0, W, H, P[0]);
            degrade(c, 0, y0, W, vy + 2, [P[0], P[1], P[2]]);
            for (x = vx - 34; x < vx + 34; x += 6) {   // prédios ao fundo
                var tp = vy - 6 - Math.floor(aleat(x, 3) * 14);
                ret(c, x, tp, 5, vy - tp + 1, P[1]);
                if (aleat(x, 4) < 0.6) ret(c, x + 2, tp + 3, 1, 1, P[6]);
            }
            // rua com pedras a fugir para o fundo
            degrade(c, 0, vy, W, y1, [P[2], P[1], P[0]]);
            for (var g = -8; g <= 8; g++) {
                var xb = vx + g * 24;
                for (y = vy + 1; y < y1; y++) { u = (y - vy) / (y1 - vy); if (aleat(g + 20, y) < 0.7) ret(c, Math.round(vx + (xb - vx) * u), y, 1, 1, P[2]); }
            }
            for (y = vy + 3; y < y1; y += Math.max(2, Math.round((y - vy) / 3))) ret(c, 0, y, W, 1, 'rgba(110,90,56,.25)');
            // fachadas em perspetiva (esquerda; e direita no telemóvel)
            var lados = E.deco ? [0] : [0, 1];
            lados.forEach(function (lado) {
                var lim = vx - 14;
                for (var j = 0; j < lim; j++) {
                    u = j / vx;
                    var yt = Math.round(y0 - 6 + (vy - y0 + 6) * u), yb = Math.round(y1 + 4 + (vy - y1 - 4) * u), xx = lado ? W - 1 - j : j;
                    ret(c, xx, yt, 1, yb - yt, P[2]);
                    var col = false;
                    for (var k = 0; k < 14; k++) if (Math.round(lim * (1 - Math.pow(0.8, k))) === j) col = true;
                    if (col) { ret(c, xx, yt, 1, yb - yt, P[4]); continue; }
                    [[0.12, 0.32], [0.42, 0.62]].forEach(function (fr, n) {
                        var seg = Math.floor(Math.log(1 - j / lim) / Math.log(0.8));
                        if (aleat(seg + lado * 30, n + 5) < 0.5) ret(c, xx, yt + Math.round((yb - yt) * fr[0]), 1, Math.max(1, Math.round((yb - yt) * (fr[1] - fr[0]))), n ? P[5] : P[6]);
                    });
                }
            });
            // prédio art déco do cinema (computador)
            if (E.deco) {
                var dx = E.mx - 10;
                ret(c, dx, y0 + 2, W - dx, y1 - y0 - 6, P[2]);
                ret(c, dx + 6, y0, W - dx - 12, 3, P[2]);
                for (x = dx + 3; x < W; x += 8) ret(c, x, y0 + 2, 2, y1 - y0 - 6, P[3]);
                for (x = dx + 7; x < W - 4; x += 8) for (y = E.my + E.mh + 3; y < y1 - 8; y += 5) ret(c, x, y, 2, 3, aleat(x, y) < 0.45 ? P[6] : P[1]);
                ret(c, dx, y1 - 4, W - dx, 1, P[4]);
            }
            // candeeiro e o seu cone de luz
            var lx = E.lampX, ly = E.lampY;
            for (y = ly + 2; y < y1; y++) {
                var f = (y - ly) / (y1 - ly), hw = Math.round(2 + f * (y1 - ly) * 0.55);
                ret(c, lx - hw, y, 2 * hw + 1, 1, 'rgba(255,225,160,' + (0.3 * (1 - f * 0.6)).toFixed(2) + ')');
            }
            for (y = y1 - 5; y < y1; y++) ret(c, lx - 18, y, 37, 1, 'rgba(255,225,160,.12)');
            ret(c, lx, ly + 2, 1, y1 - ly - 2, P[0]); ret(c, lx + 1, ly + 2, 1, y1 - ly - 2, P[3]);
            ret(c, lx - 2, ly, 5, 2, P[0]); ret(c, lx - 1, ly + 1, 3, 1, P[8]);
            // pilaretes com corrente (computador)
            if (E.deco) for (x = 4; x < lx - 8; x += 14) {
                ret(c, x, y1 - 8, 2, 7, P[0]); ret(c, x, y1 - 8, 2, 1, P[5]);
                if (x + 14 < lx - 8) for (var q = 2; q < 14; q++) ret(c, x + q, y1 - 6 + Math.round(2 * Math.sin(Math.PI * q / 14)), 1, 1, P[4]);
            }
            carro(c, E.carro.x, E.carro.y);
        },
        frame: function (ctx, E, h) {
            var t = E.t, W = E.W, H = E.H, y0 = E.y0, y1 = E.y1, x, i;
            // pó a cair na luz do candeeiro
            E.po.forEach(function (p) {
                var f = (p.y + t * p.v) % 1, y = E.lampY + 4 + f * (y1 - E.lampY - 6), hw = 2 + (y - E.lampY) * 0.55;
                ret(ctx, Math.round(E.lampX + (p.u * 2 - 1) * hw * 0.9), Math.round(y), 1, 1, 'rgba(255,240,200,' + (0.55 * (1 - f)).toFixed(2) + ')');
            });
            // a imagem "pisca" como um filme antigo
            ret(ctx, 0, y0, W, y1 - y0, 'rgba(0,0,0,' + (aleat(t, 11) * 0.12).toFixed(3) + ')');
            // letreiro TAVDEX em néon na cor do avatar (a única cor da cena)
            var mx = E.mx, my = E.my, mw = E.mw, mh = E.mh;
            if (!E.deco) { ret(ctx, mx + 6, y0, 1, my - y0, SEPIA[3]); ret(ctx, mx + mw - 7, y0, 1, my - y0, SEPIA[3]); }
            ret(ctx, mx - 3, my - 3, mw + 6, mh + 6, hsl(h, 100, 60, 0.08));
            ret(ctx, mx, my, mw, mh, '#120d07'); moldura(ctx, mx, my, mw, mh, SEPIA[5]);
            for (x = mx + 2; x < mx + mw - 1; x += 3) {
                var on = (Math.floor((x - mx) / 3) + Math.floor(t / 2)) % 3 !== 0;
                ret(ctx, x, my + 1, 1, 1, on ? SEPIA[8] : SEPIA[3]); ret(ctx, x, my + mh - 2, 1, 1, on ? SEPIA[8] : SEPIA[3]);
            }
            neon(ctx, E.letreiro, hsl(h, 100, 60, 0.15), hsl(h, 100, 55), hsl(h, 100, 86),
                function (i) { return i === E.pisca.letra; }, { contorno: hsl(h, 40, 20), nucleo: hsl(h, 30, 30) });
            pintar(ctx, E.sub, SEPIA[7]);
            // riscos e pó da película
            if (aleat(t, 5) < 0.35) ret(ctx, Math.floor(aleat(t, 6) * W), y0, 1, y1 - y0, 'rgba(255,244,208,.22)');
            for (i = 0; i < 4; i++) ret(ctx, Math.floor(aleat(i, t * 7) * W), y0 + Math.floor(aleat(i + 9, t * 7) * (y1 - y0)), 1, 1, i % 2 ? 'rgba(255,244,208,.6)' : 'rgba(0,0,0,.7)');
            // película com as perfurações a andar
            ret(ctx, 0, 0, W, y0, '#0a0806'); ret(ctx, 0, y1, W, H - y1, '#0a0806');
            var off = (t * 2) % 14, hh = E.fb - 4;
            for (x = -off; x < W; x += 14) { ret(ctx, x + 4, 2, 7, hh, '#d8d2bd'); ret(ctx, x + 4, y1 + 2, 7, hh, '#d8d2bd'); }
        }
    };

    // ---------- 4) Cartaz vintage (chapa antiga) ----------
    TEMAS.cartaz = {
        preparar: function (E) {
            var W = E.W, est = E.estreito;
            E.cx = Math.round(W / 2);
            E.bw = est ? Math.min(W - 10, E.lw + 22) : E.lw + 60;   // laço creme
            E.bx = Math.round((W - E.bw) / 2);
            E.bTop = 11; E.bBot = Math.min(54, E.H - 8); E.v = 3;
            E.ly = 17;
            E.sy = E.ly + 26; E.sx = Math.round((W - E.sw) / 2);
            var b = { bl: texto('BILHETES', MINI, 1, 1), x: est ? 5 : E.bx - 6, y: 3, h: 11 };
            b.w = b.bl.largura + 6; mover(b.bl, b.x + 3, b.y + 3); E.bilhete = b;
            var f = { bl: texto('PIPOCAS', MINI, 1, 1), y: 4, h: 9 };
            f.w = f.bl.largura + 8; f.x = est ? W - f.w - 5 : E.bx + E.bw - f.w + 6; mover(f.bl, f.x + 3, f.y + 2); E.fita = f;
            E.oval = null;
            if (!est) {
                var o = { bl: texto('EM CARTAZ', MINI, 1, 1), h: 11, y: E.bBot + 4 };
                o.w = o.bl.largura + 12; o.x = E.cx - Math.round(o.w / 2); mover(o.bl, o.x + 6, o.y + 3); E.oval = o;
            }
        },
        fundo: function (c, E) {
            var W = E.W, H = E.H, x, y, i, FUNDO = '#26363a';
            // chapa com ferrugem nas margens
            ret(c, 0, 0, W, H, '#6b3a1e');
            for (i = 0; i < W * H / 6; i++) ret(c, Math.floor(aleat(i, 41) * W), Math.floor(aleat(i, 42) * H), 1, 1, aleat(i, 43) < 0.5 ? '#8a4a22' : '#4e2a14');
            for (y = 3; y < H - 3; y++) linhaD(c, 3, W - 3, y, [FUNDO, '#2c3e42'], 0.5);
            for (i = 0; i < W * 1.2; i++) {   // ferrugem a entrar e desgaste
                var lado = i % 4, d = Math.floor(aleat(i, 44) * 6);
                x = lado === 0 ? 3 + d : lado === 1 ? W - 4 - d : Math.floor(aleat(i, 45) * W);
                y = lado === 2 ? 3 + d : lado === 3 ? H - 4 - d : Math.floor(aleat(i, 46) * H);
                ret(c, x, y, 1 + (i % 2), 1, aleat(i, 47) < 0.7 ? '#7a4020' : '#3d5156');
            }
            for (i = 0; i < 14; i++) {   // riscos
                x = Math.floor(aleat(i, 48) * W); y = Math.floor(aleat(i, 49) * H);
                for (var q = 0; q < 5; q++) ret(c, x + q, y + Math.floor(q / 2), 1, 1, '#41565a');
            }
            [[5, 5], [W - 7, 5], [5, H - 7], [W - 7, H - 7]].forEach(function (p) { ret(c, p[0] + 1, p[1] + 1, 2, 2, '#3a2a1a'); ret(c, p[0], p[1], 2, 2, '#a9a08a'); });
            // bobine de filme por trás do laço
            var rc = E.cx, ry = 8;
            disco(c, rc, ry, 7, '#3d8a7a', 999); disco(c, rc, ry, 6, '#5fb3a1', 999);
            for (i = 0; i < 5; i++) { var a = -Math.PI / 2 + i * 2 * Math.PI / 5; disco(c, Math.round(rc + Math.cos(a) * 4), Math.round(ry + Math.sin(a) * 4), 1, '#e9dfb8', 999); }
            ret(c, rc, ry, 1, 1, '#24423d');
            // laço creme (mais estreito ao centro), com sombra e contorno verde-água
            var bx = E.bx, bw = E.bw, meio = bx + (bw - 1) / 2, half = bw / 2;
            function forma(dx, dy, cor, corpo) {
                for (x = bx; x < bx + bw; x++) {
                    var k = 1 - Math.abs(x - meio) / half, tp = E.bTop + Math.round(E.v * k), bt = E.bBot - Math.round(E.v * k);
                    ret(c, x + dx, tp + dy, 1, bt - tp + 1, cor);
                    if (corpo) {
                        ret(c, x, tp + 1, 1, bt - tp - 1, '#efe4c0');
                        if (x > bx + 1 && x < bx + bw - 2) { ret(c, x, tp + 2, 1, 1, '#8cc7b8'); ret(c, x, bt - 2, 1, 1, '#8cc7b8'); }
                    }
                }
            }
            forma(2, 2, '#1b2729', false);
            forma(0, 0, '#5fb3a1', true);
            for (i = 0; i < bw * 3; i++) if (aleat(i, 53) < 0.5) ret(c, bx + 2 + Math.floor(aleat(i, 51) * (bw - 4)), E.bTop + 4 + Math.floor(aleat(i, 52) * (E.bBot - E.bTop - 8)), 1, 1, '#e0d2a6');
            // bilhete "BILHETES"
            var b = E.bilhete;
            ret(c, b.x + 1, b.y + 1, b.w, b.h, '#1b2729');
            ret(c, b.x, b.y, b.w, b.h, '#79c2ae');
            ret(c, b.x, b.y + 4, 1, 3, FUNDO); ret(c, b.x + b.w - 1, b.y + 4, 1, 3, FUNDO);
            for (x = b.x + 2; x < b.x + b.w - 2; x += 2) { ret(c, x, b.y + 1, 1, 1, '#3d7a6c'); ret(c, x, b.y + b.h - 2, 1, 1, '#3d7a6c'); }
            pintar(c, b.bl, '#1f3d37');
            // fita vermelha "PIPOCAS" com o rabo cortado em V
            var f = E.fita, mf = (f.h - 1) / 2;
            ret(c, f.x - 2, f.y + f.h - 2, 4, 3, '#7a221c');
            ret(c, f.x, f.y, f.w, f.h, '#d0453a'); ret(c, f.x, f.y, f.w, 1, '#e86a5c'); ret(c, f.x, f.y + f.h - 1, f.w, 1, '#9a2e26');
            for (y = 0; y < f.h; y++) { var corte = 3 - Math.round(Math.abs(y - mf) * 3 / mf); if (corte > 0) ret(c, f.x + f.w - corte, f.y + y, corte, 1, FUNDO); }
            pintar(c, f.bl, '#f4ead0');
            // "EM CARTAZ" num oval vermelho (computador)
            if (E.oval) {
                var o = E.oval;
                ret(c, o.x + 2, o.y, o.w - 4, o.h, '#efe4c0'); ret(c, o.x, o.y + 2, o.w, o.h - 4, '#efe4c0'); ret(c, o.x + 1, o.y + 1, o.w - 2, o.h - 2, '#efe4c0');
                ret(c, o.x + 3, o.y + 1, o.w - 6, o.h - 2, '#d0453a'); ret(c, o.x + 1, o.y + 3, o.w - 2, o.h - 6, '#d0453a'); ret(c, o.x + 2, o.y + 2, o.w - 4, o.h - 4, '#d0453a');
                pintar(c, o.bl, '#f4ead0');
                for (i = 0; i < 3; i++) { ret(c, o.x - 22, o.y + 3 + i * 2, 16, 1, '#5fb3a1'); ret(c, o.x + o.w + 6, o.y + 3 + i * 2, 16, 1, '#5fb3a1'); }
            }
        },
        frame: function (ctx, E, h) {
            // TAVDEX na cor do avatar, com sombra verde-água desencontrada e tinta gasta
            E.letreiro.forEach(function (b) { ret(ctx, b.x + 2, b.y + 2, b.s, b.s, '#4fa894'); });
            E.letreiro.forEach(function (b) {
                for (var r = 0; r < b.s; r++) {
                    var f = (b.y + r - E.ly) / 20;
                    ret(ctx, b.x, b.y + r, b.s, 1, f < 0.3 ? hsl(h, 80, 58) : f < 0.7 ? hsl(h, 75, 50) : hsl(h, 70, 43));
                }
            });
            E.letreiro.forEach(function (b, k) {
                for (var q = 0; q < b.s * b.s; q++) if (aleat(k * 9 + q, 77) < 0.05) ret(ctx, b.x + (q % b.s), b.y + Math.floor(q / b.s), 1, 1, '#efe4c0');
            });
            pintar(ctx, E.sub, '#2c4a45');
            // reflexo de luz a passar na chapa, de vez em quando
            var p = E.t % 70;
            if (p < 18) {
                var gx = -20 + (E.W + 40) * p / 18;
                for (var y = 0; y < E.H; y++) ret(ctx, Math.round(gx + y * 0.6), y, 5, 1, 'rgba(255,255,255,.07)');
            }
        }
    };

    // =====================================================================
    //  MOTOR: tamanho, animação e troca de cenário
    // =====================================================================
    function iniciar(banner) {
        if (banner.dataset.bannerIniciado) return;   // nunca iniciar o mesmo banner duas vezes
        banner.dataset.bannerIniciado = '1';
        var tela = document.createElement('canvas');
        tela.className = 'pbanner__pixel';
        banner.appendChild(tela);
        var ctx = tela.getContext('2d');
        var fundo = document.createElement('canvas'), fctx = fundo.getContext('2d');
        var frente = document.createElement('canvas'), gctx = frente.getContext('2d');
        var E = { W: 0, H: 0, estreito: false, t: 0, pisca: { letra: -1, n: 0 } };
        var chave = '', relogio = null, visivel = false;
        var semAnimacao = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function nomeTema() { return TEMAS[banner.getAttribute('data-tema')] ? banner.getAttribute('data-tema') : 'fachada'; }
        function hue() { return Math.round(parseFloat(getComputedStyle(banner).getPropertyValue('--h')) || 330); }

        function preparar() {
            E = { W: E.W, H: E.H, estreito: E.estreito, t: E.t, pisca: E.pisca };
            if (!E.W) return;
            E.letreiro = texto('TAVDEX', LETRAS, 3, 3);
            E.sub = texto('FILMES E SÉRIES', MINI, 1, 1);
            E.lw = E.letreiro.largura; E.sw = E.sub.largura;
            E.lx = Math.round((E.W - E.lw) / 2); E.ly = 6;
            TEMAS[nomeTema()].preparar(E);
            if (E.sx === undefined) { E.sx = E.lx + Math.round((E.lw - E.sw) / 2); E.sy = E.ly + 26; }
            mover(E.letreiro, E.lx, E.ly);
            mover(E.sub, E.sx, E.sy);
            chave = '';
        }

        function desenhar() {
            if (!E.W || !E.letreiro) return;
            var h = hue(), nome = nomeTema(), T = TEMAS[nome], k = E.W + 'x' + E.H + ':' + h + ':' + nome;
            if (k !== chave) {
                fundo.width = E.W; fundo.height = E.H; T.fundo(fctx, E, h);
                frente.width = E.W; frente.height = E.H; if (T.frente) T.frente(gctx, E, h);
                chave = k;
            }
            ctx.drawImage(fundo, 0, 0);
            T.frame(ctx, E, h);
            if (T.frente) ctx.drawImage(frente, 0, 0);
        }

        function passo() {
            if (!banner.isConnected) { parar(); return; }   // a página redesenhou-se e o banner saiu
            E.t++;
            if (E.pisca.n > 0) E.pisca.n--;
            else {
                E.pisca.letra = -1;
                if (Math.random() < 0.04) { E.pisca.letra = Math.floor(Math.random() * 6); E.pisca.n = 1 + Math.floor(Math.random() * 4); }
            }
            desenhar();
        }

        function medir() {
            var caixa = banner.getBoundingClientRect();
            if (!caixa.width) return;
            E.estreito = caixa.width <= 600;
            // tamanho de cada "pixel" no ecrã (1 nas miniaturas, para o TAVDEX caber)
            var S = caixa.width < 300 ? 1 : (E.estreito ? 2 : 3);
            E.W = Math.ceil(caixa.width / S);
            E.H = Math.ceil(caixa.height / S);
            tela.width = E.W; tela.height = E.H;
            tela.style.width = E.W * S + 'px';
            tela.style.height = E.H * S + 'px';
            preparar();
            desenhar();
        }

        function ligar() { if (!relogio && !semAnimacao) relogio = setInterval(passo, 100); }   // 10 imagens/segundo
        function desligar() { clearInterval(relogio); relogio = null; }

        var ro = new ResizeObserver(medir);
        ro.observe(banner);
        // só anima quando o banner está visível no ecrã
        var io = new IntersectionObserver(function (e) {
            visivel = e[0].isIntersecting;
            if (visivel && banner.isConnected) ligar(); else desligar();
        });
        io.observe(banner);
        // troca de cenário (data-tema) ou de cor do avatar (style) sem recarregar
        var obs = new MutationObserver(function () { preparar(); desenhar(); });
        obs.observe(banner, { attributes: true, attributeFilter: ['data-tema', 'style'] });
        if (banner.parentElement) obs.observe(banner.parentElement, { attributes: true, attributeFilter: ['style'] });
        var perfil = banner.closest('.pperfil');
        if (perfil && perfil !== banner.parentElement) obs.observe(perfil, { attributes: true, attributeFilter: ['style'] });

        // limpa tudo quando o banner sai da página (para não ficar a gastar recursos)
        function parar() { desligar(); ro.disconnect(); io.disconnect(); obs.disconnect(); }
        medir();
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

    function arrancar() {
        iniciarBanners(document);
        // banners que aparecem mais tarde (páginas desenhadas pelo JavaScript)
        new MutationObserver(function (lista) {
            lista.forEach(function (m) {
                m.addedNodes.forEach(function (n) { if (n.nodeType === 1) iniciarBanners(n); });
            });
        }).observe(document.body, { childList: true, subtree: true });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
    else arrancar();
})();
