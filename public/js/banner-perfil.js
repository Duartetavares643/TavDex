/* =====================================================================
   TavDex — Banner pixel art do perfil (5 cenários de cinema)
     colina    → "Colina das estrelas": pôr do sol, focos de luz a varrer o céu,
                 o TAVDEX em letras gigantes na colina, palmeiras e uma câmara
     pipocas   → "Sessão de pipocas": cortinas de veludo, o TAVDEX dentro dos
                 fotogramas de uma película, balde de pipocas e confetes a cair
     claquete  → "Claquete antiga": papel envelhecido, claquete que abre e fecha,
                 bobines, máquina fotográfica e uma borboleta a voar
     pelicula  → "Rolo de película": duas películas a correr e um projetor com
                 o feixe de luz por cima do TAVDEX
     marquise  → "Cinema à noite": fachada art déco, placa vertical "CINEMA" em
                 néon e marquise iluminada com lâmpadas a correr
   Desenhos originais (inspirados em cartazes de cinema), feitos píxel a píxel.
   O TAVDEX aparece sempre na cor do avatar (style="--h: <cor>").
   Uso: <div class="pbanner" data-tema="colina" aria-hidden="true"></div>
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
        C: ['011', '100', '100', '100', '011'], D: ['110', '101', '101', '101', '110'],
        E: ['111', '100', '110', '100', '111'], 'É': ['111', '100', '110', '100', '111'],
        F: ['111', '100', '110', '100', '100'], H: ['101', '101', '111', '101', '101'],
        I: ['111', '010', '010', '010', '111'], K: ['101', '101', '110', '101', '101'],
        L: ['100', '100', '100', '100', '111'], M: ['101', '111', '111', '101', '101'],
        N: ['110', '101', '101', '101', '101'], O: ['111', '101', '101', '101', '111'],
        P: ['110', '101', '110', '100', '100'], R: ['110', '101', '110', '101', '101'],
        S: ['011', '100', '010', '001', '110'], T: ['111', '010', '010', '010', '010'],
        V: ['101', '101', '101', '101', '010'], X: ['101', '101', '010', '101', '101'],
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

    // Letras com sombra e "brilho" em cima (topo mais claro, base mais escura).
    //  dx = função que dá o deslocamento extra de cada letra (para as separar em fotogramas)
    function letreiro(c, blocos, sombra, cores, y0, alt, dx) {
        dx = dx || function () { return 0; };
        if (sombra) blocos.forEach(function (b) { ret(c, b.x + dx(b.i) + 1, b.y + 1, b.s, b.s, sombra); });
        blocos.forEach(function (b) {
            for (var r = 0; r < b.s; r++) {
                var f = (b.y + r - y0) / alt;
                ret(c, b.x + dx(b.i), b.y + r, b.s, 1, f < 0.3 ? cores[0] : f < 0.7 ? cores[1] : cores[2]);
            }
        });
    }

    // Bobine de filme: aro, 5 furos e o centro
    function bobine(c, cx, cy, r, aro, fundo, yMax) {
        yMax = yMax || 9999;
        disco(c, cx, cy, r, aro, yMax);
        disco(c, cx, cy, r - 1, fundo, yMax);
        var rf = Math.max(1, Math.round(r / 4));
        for (var i = 0; i < 5; i++) {
            var a = -Math.PI / 2 + i * 2 * Math.PI / 5;
            disco(c, Math.round(cx + Math.cos(a) * r * 0.55), Math.round(cy + Math.sin(a) * r * 0.55), rf, aro, yMax);
        }
        if (cy < yMax) ret(c, cx, cy, 1, 1, aro);
    }

    // Palmeira (silhueta): tronco curvo e folhas a cair
    function palmeira(c, x, yb, alt, cor) {
        var topo = { x: x, y: yb - alt };
        for (var i = 0; i < alt; i++) {
            var px = x + Math.round(Math.sin(i / alt * 1.3) * 3);
            ret(c, px, yb - i, 2, 1, cor);
            topo = { x: px, y: yb - i };
        }
        [[-1, -0.35], [-1, 0.1], [-0.6, -0.8], [0.6, -0.8], [1, 0.1], [1, -0.35], [0, -1]].forEach(function (d) {
            var comp = 9 + Math.round(aleat(x, d[0] * 10 + d[1] * 7) * 4);
            for (var j = 0; j < comp; j++) {
                ret(c, Math.round(topo.x + 1 + d[0] * j), Math.round(topo.y + d[1] * j + j * j * 0.07), 1, 1, cor);
                if (j > 2 && j < comp - 2) ret(c, Math.round(topo.x + 1 + d[0] * j), Math.round(topo.y + d[1] * j + j * j * 0.07) + 1, 1, 1, cor);
            }
        });
    }

    // Faixa de película (horizontal) com perfurações e fotogramas.
    //  off = deslocamento (para a animação); cores = cor de alguns fotogramas
    function pelicula(c, W, y, alt, off, fundoFita, furo, fotograma, cores) {
        ret(c, 0, y, W, alt, fundoFita);
        var furoA = Math.max(1, Math.floor(alt / 6));
        for (var x = -off; x < W; x += 6) {
            ret(c, x + 2, y + 1, 3, furoA, furo);
            ret(c, x + 2, y + alt - 1 - furoA, 3, furoA, furo);
        }
        var ini = y + furoA + 2, h = alt - 2 * furoA - 4;
        if (h < 2) return;
        for (var k = 0, fx = -off; fx < W; fx += 24, k++) {
            ret(c, fx + 1, ini, 21, h, fotograma);
            var cor = cores[((k % cores.length) + cores.length) % cores.length];
            if (cor) ret(c, fx + 3, ini + 1, 9, h - 2, cor);
        }
    }

    // =====================================================================
    //  OS 5 CENÁRIOS
    //  preparar → calcula posições | fundo → parte fixa (desenhada 1 vez)
    //  frame → o que se mexe (10 vezes por segundo) | frente → fixo, por cima do que se mexe
    // =====================================================================
    var TEMAS = {};

    // ---------- 1) Colina das estrelas (pôr do sol) ----------
    TEMAS.colina = {
        preparar: function (E) {
            var W = E.W, H = E.H;
            E.ly = Math.max(5, Math.round(H * 0.2));
            E.lx = Math.round((W - E.lw) / 2);
            E.base = E.ly + 23;                 // linha onde as letras "assentam" na colina
            E.sy = E.base + 6; E.sx = Math.round((W - E.sw) / 2);
            E.focos = [0.12, 0.34, 0.66, 0.88].map(function (f, i) {
                return { x: Math.round(W * f), fase: i * 1.7, base: (i % 2 ? 1 : -1) * 0.22 };
            });
            // No computador o avatar tapa o canto de baixo à esquerda: lá vai uma palmeira em vez da câmara
            E.camara = E.estreito && W > 170;
            E.palmaEsq = !E.estreito;
            E.fita = W > 200;
        },
        // Altura da colina em cada x (mais alta atrás do letreiro)
        crista: function (E, x) {
            var W = E.W, g = Math.exp(-Math.pow((x - W * 0.47) / (W * 0.33), 2));
            return E.base - 3 - Math.round(9 * g) + Math.round(Math.sin(x * 0.21) * 0.8);
        },
        fundo: function (c, E) {
            var W = E.W, x, y, b;
            // céu ao pôr do sol: roxo em cima, laranja junto à colina
            degrade(c, 0, 0, W, E.base + 2, ['#2a1238', '#6a2240', '#b8402e', '#e8702e', '#f8b04a']);
            // nuvens em faixas (aos pontinhos)
            [0.12, 0.26, 0.4].forEach(function (f, k) {
                y = Math.round(E.H * f);
                for (x = 0; x < W; x++) {
                    var n = aleat(x >> 3, k + 5);
                    if (n < 0.5) continue;
                    ret(c, x, y, 1, 1 + (n > 0.8 ? 1 : 0), 'rgba(70,14,34,.55)');
                    if (aleat(x, k) < 0.4) ret(c, x, y - 1, 1, 1, 'rgba(255,170,90,.28)');
                }
            });
            // colinas ao longe (roxas)
            for (x = 0; x < W; x++) {
                var yl = E.base - 8 - Math.round(4 * Math.sin(x * 0.045 + 1) + 3 * Math.sin(x * 0.13));
                ret(c, x, yl, 1, E.base + 4 - yl, '#4a1d2c');
            }
            b = E.base;
            ret(c, 0, b + 2, W, E.H - b - 2, '#4a1d2c');
        },
        frame: function (ctx, E) {
            // focos de luz a varrer o céu (ficam por trás da colina, desenhada na "frente")
            var t = E.t;
            E.focos.forEach(function (f) {
                var ang = f.base + 0.32 * Math.sin(t * 0.04 + f.fase), y0 = E.base;
                for (var y = y0; y >= 0; y--) {
                    var d = y0 - y, cx = f.x + d * Math.tan(ang), meia = 1 + d * 0.08;
                    ret(ctx, Math.round(cx - meia), y, Math.max(2, Math.round(meia * 2)), 1, 'rgba(255,236,196,.3)');
                    ret(ctx, Math.round(cx - meia / 3), y, Math.max(1, Math.round(meia * 2 / 3)), 1, 'rgba(255,250,232,.35)');
                }
            });
        },
        frente: function (c, E, h) {
            var W = E.W, H = E.H, x, y, cr;
            // colina principal com a "borda" iluminada pelo sol
            for (x = 0; x < W; x++) {
                cr = TEMAS.colina.crista(E, x);
                ret(c, x, cr, 1, H - cr, '#1e0e0b');
                ret(c, x, cr, 1, 1, '#8a3a1a');
                if (aleat(x, 3) < 0.5) ret(c, x, cr + 1, 1, 1, '#4e2214');
                for (y = cr + 3; y < H; y += 3) if (aleat(x, y) < 0.18) ret(c, x, y, 1, 1, '#2e160f');
            }
            // palmeiras à direita e câmara de filmar à esquerda (silhuetas)
            palmeira(c, W - 24, H, Math.round(H * 0.6), '#0c0504');
            if (W > 190) palmeira(c, W - 10, H, Math.round(H * 0.45), '#0c0504');
            if (E.palmaEsq) palmeira(c, Math.round(W * 0.07), H, Math.round(H * 0.55), '#0c0504');
            if (E.camara) {
                var cy = H - 14;
                bobine(c, 11, cy - 11, 6, '#0c0504', '#3a1a10');
                bobine(c, 24, cy - 12, 6, '#0c0504', '#3a1a10');
                ret(c, 5, cy - 5, 22, 10, '#0c0504'); ret(c, 27, cy - 3, 6, 6, '#0c0504'); ret(c, 33, cy - 4, 2, 8, '#0c0504');
                ret(c, 5, cy - 5, 22, 1, '#5a2614');
                for (var p = 0; p < 9; p++) { ret(c, 15 - p, cy + 5 + p, 1, 1, '#0c0504'); ret(c, 17 + p, cy + 5 + p, 1, 1, '#0c0504'); }
            }
            // película a subir no canto de baixo
            if (E.fita) {
                var x0 = Math.round(W * 0.6), x1 = W - 30;
                for (x = x0; x < x1; x++) {
                    y = H - 2 - Math.round((x - x0) * 0.16);
                    ret(c, x, y - 6, 1, 7, '#140a08');
                    if (x % 4 === 0) { ret(c, x, y - 5, 1, 1, '#c99a58'); ret(c, x, y - 1, 1, 1, '#c99a58'); }
                }
            }
            // TAVDEX gigante na colina (letras claras com um toque da cor do avatar)
            letreiro(c, E.letreiro, hsl(h, 40, 18), [hsl(h, 30, 94), hsl(h, 28, 86), hsl(h, 26, 74)], E.ly, 21);
            // estrela, linhas douradas e "FILMES E SÉRIES"
            var mx = Math.round(W / 2), sy = E.sy;
            ret(c, mx, sy - 4, 1, 3, '#f0cf86'); ret(c, mx - 1, sy - 3, 3, 1, '#f0cf86');
            ret(c, E.sx - 16, sy + 2, 12, 1, '#b8904a'); ret(c, E.sx + E.sw + 4, sy + 2, 12, 1, '#b8904a');
            pintar(c, E.sub, '#f0cf86');
        }
    };

    // ---------- 2) Sessão de pipocas (película, cortinas e confetes) ----------
    // O TAVDEX fica em 3 fotogramas: "TA" "VD" "EX"
    TEMAS.pipocas = {
        preparar: function (E) {
            var W = E.W, H = E.H;
            E.gap = W >= 160 ? 5 : 3;
            E.fw = 2 * 15 + 3 + 8;                          // largura de um fotograma (2 letras + margens)
            var total = 3 * E.fw + 2 * E.gap;
            E.cort = Math.max(4, Math.min(Math.round(W * 0.08), Math.floor((W - total) / 2) - 1));
            E.fx0 = Math.round((W - total) / 2);
            E.fy = 9; E.fh = 29;                            // fotogramas: y de 9 a 38
            E.lx = E.fx0 + 4; E.ly = E.fy + 4;
            // cada par de letras salta para o seu fotograma
            E.passoPar = E.fw + E.gap - 36;
            E.confetes = [];
            for (var i = 0; i < 28; i++) E.confetes.push({ u: aleat(i, 61), y: aleat(i, 62), v: 0.006 + aleat(i, 63) * 0.01, f: i });
            E.balde = { x: Math.round(W / 2), y: E.fy + E.fh + 1 };
        },
        fundo: function (c, E, h) {
            var W = E.W, H = E.H, x, y, i;
            degrade(c, 0, 0, W, H, ['#2c140c', '#5a301c', '#7a4a2a', '#4a2614']);
            // brilho de holofote atrás da película
            for (var r = 5; r >= 1; r--) disco(c, Math.round(W / 2), Math.round(H * 0.45), r * Math.round(W * 0.06), 'rgba(255,200,120,.035)', 9999);
            // película decorativa a ondular por trás
            for (x = 0; x < W; x++) {
                y = Math.round(H * 0.72 + 3 * Math.sin(x * 0.05));
                ret(c, x, y, 1, 6, '#3a1e12');
                if (x % 4 === 0) { ret(c, x, y + 1, 1, 1, '#8a5a3a'); ret(c, x, y + 4, 1, 1, '#8a5a3a'); }
            }
            // a película principal com os fotogramas creme
            var by = E.fy - 5, bh = E.fh + 10;
            ret(c, E.fx0 - 6, by, 3 * E.fw + 2 * E.gap + 12, bh, '#1c1410');
            for (x = E.fx0 - 4; x < E.fx0 + 3 * E.fw + 2 * E.gap + 4; x += 5) {
                ret(c, x, by + 1, 2, 2, '#e9dcc0'); ret(c, x, by + bh - 3, 2, 2, '#e9dcc0');
            }
            for (i = 0; i < 3; i++) {
                var fx = E.fx0 + i * (E.fw + E.gap);
                ret(c, fx, E.fy, E.fw, E.fh, '#f3e6c8');
                ret(c, fx, E.fy + E.fh - 1, E.fw, 1, '#d9c79f');
            }
            // TAVDEX na cor do avatar, com sombra "gravada" no papel
            var passo = E.passoPar;
            letreiro(c, E.letreiro, '#cdb88c', [hsl(h, 55, 44), hsl(h, 58, 36), hsl(h, 60, 28)], E.ly, 21,
                function (i) { return Math.floor(i / 2) * passo; });
            // cortinas de veludo dos dois lados
            for (x = 0; x < E.cort; x++) {
                var s = 0.5 + 0.5 * Math.sin(x * 1.3);
                var cor = s > 0.7 ? '#b01e40' : s > 0.35 ? '#82122e' : '#560a1e';
                ret(c, x, 0, 1, H, cor);
                ret(c, W - 1 - x, 0, 1, H, cor);
            }
            ret(c, 0, 0, E.cort + 2, 2, '#3e0614'); ret(c, W - E.cort - 2, 0, E.cort + 2, 2, '#3e0614');
            // sombra no chão
            for (y = H - 6; y < H; y++) ret(c, 0, y, W, 1, 'rgba(20,8,4,' + ((y - H + 7) * 0.08).toFixed(2) + ')');
        },
        frame: function (ctx, E) {
            // confetes dourados a cair, a abanar e a rodar
            var t = E.t, W = E.W, H = E.H;
            E.confetes.forEach(function (p) {
                var f = (p.y + t * p.v) % 1, y = Math.round(f * (H + 4)) - 2;
                var x = Math.round(p.u * W + Math.sin(t * 0.12 + p.f) * 3);
                var deitado = (Math.floor(t / 3) + p.f) % 2 === 0;
                ret(ctx, x, y, deitado ? 2 : 1, deitado ? 1 : 2, p.f % 3 ? '#f2c14e' : '#e39a32');
            });
            // brilhinhos nas cortinas
            for (var i = 0; i < 3; i++) {
                if (aleat(i, t) < 0.4) ret(ctx, Math.floor(aleat(i + 4, t) * E.cort), Math.floor(aleat(i + 8, t) * H), 1, 1, 'rgba(255,230,160,.8)');
            }
        },
        frente: function (c, E) {
            var W = E.W, H = E.H, x, i;
            // balde de pipocas às riscas
            var b = E.balde, topo = b.y + 2, alt = H - topo - 1, larg = 18;
            if (alt >= 6) {
                for (var y = 0; y < alt; y++) {
                    var meia = Math.round(larg / 2 - y * 0.12);
                    for (x = -meia; x < meia; x++) ret(c, b.x + x, topo + y, 1, 1, (Math.floor((x + meia) / 3) % 2) ? '#f4ead6' : '#c8243a');
                }
                ret(c, b.x - larg / 2, topo, larg, 1, '#e8d8b8');
            }
            // pipocas em cima do balde
            for (i = 0; i < 9; i++) {
                var px = b.x - 8 + Math.round(aleat(i, 31) * 16), py = topo - 1 - Math.round(aleat(i, 32) * 4);
                disco(c, px, py, 2, '#fff4d6', 9999);
                ret(c, px - 1, py + 1, 1, 1, '#e8c98a');
            }
            // bobine em baixo à esquerda e claquete em baixo à direita
            bobine(c, E.cort + 11, H - 1, 10, '#8c8278', '#3a2a20', H);
            var cx = W - E.cort - 24, cy = H - 13;
            if (cx > b.x + 12) {
                ret(c, cx, cy + 4, 20, 9, '#1a1716'); moldura(c, cx, cy + 4, 20, 9, '#4a4440');
                ret(c, cx + 2, cy + 7, 16, 1, '#7a7470'); ret(c, cx + 2, cy + 10, 16, 1, '#7a7470');
                for (x = 0; x < 20; x++) ret(c, cx + x, cy, 1, 4, (Math.floor(x / 3) % 2) ? '#f2f2f2' : '#1a1716');
            }
        }
    };

    // ---------- 3) Claquete antiga (papel envelhecido) ----------
    TEMAS.claquete = {
        preparar: function (E) {
            var W = E.W, H = E.H;
            E.compacto = W < E.lw + 80;
            E.cw = E.compacto ? 28 : 44;                    // largura da claquete
            E.ch = E.compacto ? 18 : 24;                    // altura do quadro
            E.cTopo = H - E.ch - 5;                         // topo do quadro
            // No computador o avatar tapa o canto de baixo à esquerda: a claquete vai para a direita
            E.direita = !E.estreito && !E.compacto;
            if (E.direita) {
                E.cx = W - E.cw - 8;
                E.lx = Math.max(4, Math.round((E.cx - 40 - E.lw) / 2) + 6);
                E.extras = E.cx - 36;                       // bobine e máquina fotográfica, à esquerda da claquete
            } else {
                E.cx = 5;
                E.lx = Math.min(Math.max(E.cx + E.cw + 7, Math.round((W + E.cx + E.cw - E.lw) / 2)), W - E.lw - 3);
                E.extras = null;
            }
            E.ly = Math.round((H - 21 - 9) / 2);
            E.sy = E.ly + 27; E.sx = E.lx + Math.round((E.lw - E.sw) / 2);
            E.borboleta = { x: E.cx + Math.round(E.cw * 0.4), y: Math.max(6, E.cTopo - 16) };
            if (!E.compacto) {
                E.textos = [mover(texto('CENA', MINI, 1, 1), E.cx + 3, E.cTopo + 3),
                    mover(texto('PLANO', MINI, 1, 1), E.cx + 23, E.cTopo + 3),
                    mover(texto('TAKE', MINI, 1, 1), E.cx + 3, E.cTopo + 12)];
            }
        },
        fundo: function (c, E, h) {
            var W = E.W, H = E.H, x, y, i;
            // papel envelhecido com manchas e as bordas queimadas
            degrade(c, 0, 0, W, H, ['#e4d4b0', '#d8c49a', '#cdb68a']);
            for (i = 0; i < W * H / 5; i++) {
                ret(c, Math.floor(aleat(i, 71) * W), Math.floor(aleat(i, 72) * H), 1, 1, aleat(i, 73) < 0.5 ? '#c2a878' : '#ece0c4');
            }
            for (i = 0; i < 6; i++) {
                var mx = Math.floor(aleat(i, 81) * W), my = Math.floor(aleat(i, 82) * H), r = 6 + Math.floor(aleat(i, 83) * 12);
                for (y = -r; y <= r; y++) for (x = -r; x <= r; x++) {
                    if (x * x + y * y <= r * r && aleat(mx + x, my + y) < 0.45) ret(c, mx + x, my + y, 1, 1, 'rgba(120,88,48,.13)');
                }
            }
            for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
                var borda = Math.min(x, y, W - 1 - x, H - 1 - y);
                if (borda < 5 && aleat(x, y + 99) < (5 - borda) * 0.16) ret(c, x, y, 1, 1, 'rgba(96,62,30,.35)');
            }
            // quadro da claquete (preto, com riscos de giz)
            var cx = E.cx, ct = E.cTopo, cw = E.cw, ch = E.ch;
            ret(c, cx + 1, ct + 1, cw, ch, 'rgba(60,40,20,.35)');      // sombra
            ret(c, cx, ct, cw, ch, '#1c1c1f'); moldura(c, cx, ct, cw, ch, '#3c3c40');
            ret(c, cx + 1, ct + Math.round(ch * 0.38), cw - 2, 1, '#6e6e72');
            ret(c, cx + 1, ct + Math.round(ch * 0.72), cw - 2, 1, '#6e6e72');
            ret(c, cx + Math.round(cw * 0.48), ct + 1, 1, Math.round(ch * 0.72), '#6e6e72');
            (E.textos || []).forEach(function (t) { pintar(c, t, '#cfcfd2'); });
            // barra fixa às riscas por cima do quadro
            for (x = 0; x < cw; x++) for (y = 0; y < 5; y++) {
                ret(c, cx + x, ct - 5 + y, 1, 1, (Math.floor((x + y) / 4) % 2) ? '#f2f2f2' : '#151517');
            }
            // joaninha no quadro
            ret(c, cx + cw - 7, ct + ch - 4, 3, 2, '#d62a1e'); ret(c, cx + cw - 6, ct + ch - 4, 1, 1, '#1a1010');
            // TAVDEX carimbado na cor do avatar (com a tinta gasta) e "FILMES E SÉRIES"
            E.letreiro.forEach(function (b, k) {
                ret(c, b.x, b.y, b.s, b.s, hsl(h, 62, 30));
                for (var q = 0; q < b.s * b.s; q++) if (aleat(k * 9 + q, 55) < 0.08) ret(c, b.x + (q % b.s), b.y + Math.floor(q / b.s), 1, 1, '#d8c49a');
            });
            ret(c, E.lx, E.ly + 24, E.lw, 1, hsl(h, 50, 40, 0.5));
            pintar(c, E.sub, '#5a4026');
        },
        frame: function (ctx, E) {
            var t = E.t, cx = E.cx, ct = E.cTopo, cw = E.cw;
            // braço da claquete: abre devagar e fecha de repente ("Ação!")
            var p = t % 40, ang;
            if (p < 18) ang = -0.42;
            else if (p < 21) ang = -0.42 * (21 - p) / 3;
            else if (p < 30) ang = 0;
            else ang = -0.42 * (p - 30) / 10;
            // (o braço fica por cima da barra fixa, que vai de ct-5 a ct-1)
            var px = cx, py = ct - 10, d = [Math.cos(ang), Math.sin(ang)], n = [-Math.sin(ang), Math.cos(ang)];
            // (passos de meio píxel: assim o braço rodado não fica com buracos)
            for (var s = 0; s < cw; s += 0.5) for (var w = 0; w < 5; w += 0.5) {
                ret(ctx, Math.round(px + d[0] * s + n[0] * w), Math.round(py + d[1] * s + n[1] * w), 1, 1,
                    (Math.floor((s + w) / 4) % 2) ? '#151517' : '#f2f2f2');
            }
            ret(ctx, px - 1, py + 3, 3, 3, '#8a8a90');                   // dobradiça
            // borboleta azul a voar perto da claquete
            var b = E.borboleta, bx = Math.round(b.x + 7 * Math.sin(t * 0.06)), by = Math.round(b.y + 3 * Math.sin(t * 0.13));
            if (t % 4 < 2) {
                ret(ctx, bx - 3, by - 2, 3, 3, '#2f96d8'); ret(ctx, bx + 1, by - 2, 3, 3, '#2f96d8');
                ret(ctx, bx - 2, by + 1, 2, 2, '#58b6ea'); ret(ctx, bx + 1, by + 1, 2, 2, '#58b6ea');
            } else {
                ret(ctx, bx - 1, by - 3, 1, 4, '#2f96d8'); ret(ctx, bx + 1, by - 3, 1, 4, '#2f96d8');
            }
            ret(ctx, bx, by - 2, 1, 4, '#1a1a1a');
        },
        frente: function (c, E) {
            if (E.extras === null) return;
            var H = E.H, ex = E.extras;
            // bobine (com filme enrolado) e máquina fotográfica, ao lado da claquete
            bobine(c, ex + 8, H - 9, 8, '#c8c8cc', '#5a5a60', H);
            ret(c, ex + 2, H - 3, 14, 3, '#8a8a90'); ret(c, ex + 2, H - 3, 14, 1, '#d8d8dc');
            var mx = ex + 18, my = H - 12;
            ret(c, mx, my, 14, 9, '#1c1c1f'); moldura(c, mx, my, 14, 9, '#4a4a50');
            disco(c, mx + 7, my + 4, 3, '#5a5a60', 9999); disco(c, mx + 7, my + 4, 1, '#9ad0f0', 9999);
            ret(c, mx + 2, my - 3, 5, 3, '#2a2a2e'); ret(c, mx + 3, my - 2, 3, 1, '#e8e8ec');
            ret(c, mx + 10, my - 2, 2, 2, '#d62a1e');                    // outra joaninha
        }
    };

    // ---------- 4) Rolo de película (projetor e feixe de luz) ----------
    TEMAS.pelicula = {
        preparar: function (E) {
            var W = E.W, H = E.H;
            E.fb = Math.max(7, Math.round(H * 0.16));
            E.y1 = 2 + E.fb + 2; E.y2 = H - 2 - E.fb - 2;
            E.comSub = E.y2 - E.y1 >= 30;
            E.cy = Math.round((E.y1 + E.y2) / 2);
            E.px0 = 4;
            E.lx = Math.min(Math.max(E.px0 + 34, Math.round((W - E.lw) / 2) + 10), W - E.lw - 4);
            E.ly = E.comSub ? Math.round(E.cy - 14) : Math.round(E.cy - 10);
            E.sy = E.ly + 26; E.sx = E.lx + Math.round((E.lw - E.sw) / 2);
            E.po = [];
            for (var i = 0; i < 18; i++) E.po.push({ u: aleat(i, 41), v: 0.5 + aleat(i, 42), y: aleat(i, 43) });
        },
        fundo: function (c, E, h) {
            var W = E.W, H = E.H, x, y;
            degrade(c, 0, 0, W, H, ['#f4ecdb', '#ebdfc8']);
            // películas "fantasma" na diagonal, ao fundo
            for (x = 0; x < W; x++) {
                y = Math.round(x * 0.22) - 6;
                ret(c, x, y, 1, 8, 'rgba(110,90,60,.07)');
                y = Math.round(H - x * 0.18);
                ret(c, x, y, 1, 7, 'rgba(110,90,60,.06)');
            }
            // feixe de luz do projetor (cone que abre para a direita)
            var lx = E.px0 + 31, alvo = (E.y2 - E.y1) / 2 + 3;
            for (x = lx; x < W; x++) {
                var meia = 2 + (x - lx) / Math.max(1, W - lx) * alvo;
                ret(c, x, Math.round(E.cy - meia), 1, Math.round(meia * 2), 'rgba(255,255,255,.55)');
            }
            // projetor (silhueta preta com duas bobines)
            var px = E.px0, cy = E.cy;
            bobine(c, px + 8, cy - 10, 6, '#16130f', '#efe6d2');
            bobine(c, px + 21, cy - 11, 6, '#16130f', '#efe6d2');
            ret(c, px + 2, cy - 4, 24, 10, '#16130f');
            for (x = 0; x < 6; x++) ret(c, px + 3 + x * 4, cy - 4, 2, 2, '#e8dfca');   // riscas da claquete no corpo
            ret(c, px + 26, cy - 2, 4, 6, '#16130f'); ret(c, px + 30, cy - 3, 2, 8, '#16130f');
            ret(c, px + 6, cy + 6, 2, 4, '#16130f'); ret(c, px + 20, cy + 6, 2, 4, '#16130f');
            // TAVDEX na cor do avatar, dentro do feixe
            letreiro(c, E.letreiro, 'rgba(60,40,20,.25)', [hsl(h, 62, 40), hsl(h, 62, 33), hsl(h, 64, 26)], E.ly, 21);
            if (E.comSub) pintar(c, E.sub, '#4a3e30');
        },
        frame: function (ctx, E) {
            var t = E.t, W = E.W, H = E.H;
            // as duas películas a correr (em cima para a esquerda, em baixo para a direita)
            var cores = ['#f2647e', null, '#68c3ea', null, '#f3c95a', null];
            // (o deslocamento repete-se de 24 em 24 píxeis: o tamanho de um fotograma)
            pelicula(ctx, W, 2, E.fb, (t % 24), '#2a2420', '#f4ecdb', '#e6dac2', cores);
            pelicula(ctx, W, H - 2 - E.fb, E.fb, 23 - (t % 24), '#2a2420', '#f4ecdb', '#e6dac2', cores.slice(3).concat(cores.slice(0, 3)));
            // pó a brilhar dentro do feixe
            var lx = E.px0 + 31;
            E.po.forEach(function (p) {
                var f = (p.u + t * 0.004 * p.v) % 1, x = Math.round(lx + f * (W - lx));
                var y = Math.round(E.cy + (p.y * 2 - 1) * (2 + f * ((E.y2 - E.y1) / 2)));
                ret(ctx, x, y, 1, 1, 'rgba(255,250,235,' + (0.9 - f * 0.6).toFixed(2) + ')');
            });
            // a luz treme um bocadinho, como num projetor antigo
            if (aleat(t, 9) < 0.25) ret(ctx, lx, E.y1, W - lx, E.y2 - E.y1, 'rgba(255,255,255,.06)');
        }
    };

    // ---------- 5) Cinema à noite (marquise e néon) ----------
    TEMAS.marquise = {
        preparar: function (E) {
            var W = E.W, H = E.H;
            E.pw = E.lw + 16; E.px = Math.round((W - E.pw) / 2);
            E.pTop = 9; E.ly = E.pTop + 4; E.lx = E.px + 8;
            E.sy = E.ly + 25; E.sx = E.px + Math.round((E.pw - E.sw) / 2);
            E.pBot = E.sy + 9;
            E.chao = H - 4;
            var s = { bl: textoV('CINEMA', MINI, 1, 1), w: 7 };
            s.h = s.bl.altura + 4;
            if (E.px >= 12) s.x = E.px - 11;
            else if (W - E.px - E.pw >= 12) s.x = E.px + E.pw + 4;
            else s = null;
            if (s) { s.y = 2; mover(s.bl, s.x + 2, s.y + 2); }
            E.sinal = s;
        },
        fundo: function (c, E, h) {
            var W = E.W, H = E.H, x, y;
            // céu noturno com nuvens
            degrade(c, 0, 0, W, H, ['#04060d', '#0b1220', '#18223a']);
            for (var k = 0; k < 3; k++) {
                y = 2 + k * 5;
                for (x = 0; x < W; x++) if (aleat(x >> 2, k + 20) > 0.55) ret(c, x, y + (x % 3 === 0 ? 1 : 0), 1, 2, 'rgba(60,72,98,.35)');
            }
            // prédio art déco
            var px = E.px, pw = E.pw;
            ret(c, px - 6, E.pTop - 4, pw + 12, H, '#3a2c22');
            for (x = px - 4; x < px + pw + 6; x += 6) ret(c, x, E.pTop - 4, 1, H, '#4a3a2c');
            ret(c, px - 8, E.pTop - 5, pw + 16, 2, '#5a4634');
            // marquise: caixa escura e painel claro com linhas
            ret(c, px - 4, E.pTop, pw + 8, E.pBot - E.pTop, '#1a1412');
            ret(c, px, E.pTop + 2, pw, E.pBot - E.pTop - 4, '#f6eedb');
            for (y = E.pTop + 7; y < E.pBot - 3; y += 6) ret(c, px, y, pw, 1, '#e8dcc0');
            // por baixo: luz quente, portas de vidro e um cartaz ao centro
            var topo = E.pBot + 3, alt = E.chao - topo;
            if (alt >= 6) {
                degrade(c, px - 6, topo, px + pw + 6, E.chao, ['#7a5230', '#3a281c']);
                var dw = 10, cx = Math.round(W / 2);
                [cx - 30, cx - 18, cx + 9, cx + 21].forEach(function (dx) {
                    if (dx < px - 4 || dx + dw > px + pw + 4) return;
                    ret(c, dx, topo + 1, dw, alt - 1, '#2a1c14');
                    ret(c, dx + 1, topo + 2, dw - 2, alt - 2, '#d8943c');
                    ret(c, dx + Math.round(dw / 2), topo + 2, 1, alt - 2, '#2a1c14');
                });
                ret(c, cx - 5, topo, 10, alt, '#c9a050');
                ret(c, cx - 4, topo + 1, 8, alt - 2, '#2a160c');
                disco(c, cx, topo + 3, 1, '#e8782a', 9999);
                ret(c, cx - 1, topo + 5, 3, alt - 6, '#e8782a');
            }
            // passeio com o reflexo da luz
            ret(c, 0, E.chao, W, H - E.chao, '#24201c');
            ret(c, px, E.chao, pw, 1, 'rgba(255,190,120,.25)');
            // placa vertical (a caixa; as letras de néon são desenhadas na animação)
            if (E.sinal) {
                var s = E.sinal;
                ret(c, s.x, s.y, s.w, s.h, '#140c0c'); moldura(c, s.x, s.y, s.w, s.h, '#5a2a20');
            }
            // TAVDEX na cor do avatar e "FILMES E SÉRIES"
            letreiro(c, E.letreiro, null, [hsl(h, 70, 38), hsl(h, 72, 31), hsl(h, 74, 25)], E.ly, 21);
            pintar(c, E.sub, '#3a2c22');
        },
        frame: function (ctx, E) {
            var t = E.t, px = E.px, pw = E.pw, x;
            // tubos de néon cor de laranja em cima e em baixo da marquise
            [E.pTop, E.pBot - 1].forEach(function (y) {
                ret(ctx, px - 4, y - 1, pw + 8, 3, 'rgba(255,110,50,.22)');
                ret(ctx, px - 4, y, pw + 8, 1, '#ff7a3a');
            });
            // lâmpadas a "correr" por baixo da marquise
            for (x = px - 3; x < px + pw + 4; x += 3) {
                var acesa = (Math.floor(x / 3) + t) % 3 !== 0;
                if (acesa) ret(ctx, x - 1, E.pBot, 3, 3, 'rgba(255,220,140,.35)');
                ret(ctx, x, E.pBot + 1, 1, 1, acesa ? '#fff1b0' : '#6a4a2a');
            }
            // placa CINEMA em néon vermelho: as letras acendem uma a uma (e às vezes uma pisca)
            var s = E.sinal;
            if (!s) return;
            var fase = Math.floor(t / 4) % 12;
            s.bl.forEach(function (b) {
                var acesa = (fase > b.i || fase >= 6) && b.i !== E.pisca.letra;
                if (acesa) ret(ctx, b.x - 1, b.y - 1, 3, 3, 'rgba(255,60,40,.3)');
            });
            s.bl.forEach(function (b) {
                var acesa = (fase > b.i || fase >= 6) && b.i !== E.pisca.letra;
                ret(ctx, b.x, b.y, 1, 1, acesa ? '#ff4433' : '#5a1a14');
            });
        }
    };

    var TEMA_POR_OMISSAO = 'colina';

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

        function nomeTema() { return TEMAS[banner.getAttribute('data-tema')] ? banner.getAttribute('data-tema') : TEMA_POR_OMISSAO; }
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
