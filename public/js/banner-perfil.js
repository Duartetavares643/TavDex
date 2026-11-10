/* =====================================================================
   TavDex — Banner pixel art do perfil (4 cenários)
     chuva      → cidade à noite com chuva, cabos elétricos e placas néon
     synthwave  → pôr do sol retro anos 80, grelha a andar e palmeiras
     beco       → beco cheio de letreiros néon e chão molhado
     montanhas  → pôr do sol em pixel art, estrelas e lago a brilhar
   Uso: <div class="pbanner" data-tema="chuva" aria-hidden="true"></div>
   ===================================================================== */
(function () {
    'use strict';

    // ---------- Letras ----------
    // Grandes (5×7), para o letreiro TAVDEX
    var LETRAS = {
        T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
        A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
        V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
        D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
        E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
        X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001']
    };
    // Pequenas (3×5), para as placas
    var MINI = {
        A: ['010', '101', '111', '101', '101'], C: ['011', '100', '100', '100', '011'],
        D: ['110', '101', '101', '101', '110'], E: ['111', '100', '110', '100', '111'],
        'É': ['111', '100', '110', '100', '111'], F: ['111', '100', '110', '100', '100'],
        H: ['101', '101', '111', '101', '101'], I: ['111', '010', '010', '010', '111'],
        L: ['100', '100', '100', '100', '111'], M: ['101', '111', '111', '101', '101'],
        N: ['110', '101', '101', '101', '101'], O: ['111', '101', '101', '101', '111'],
        P: ['110', '101', '110', '100', '100'], R: ['110', '101', '110', '101', '101'],
        S: ['011', '100', '010', '001', '110'], T: ['111', '010', '010', '010', '010'],
        V: ['101', '101', '101', '101', '010'], Y: ['101', '101', '010', '010', '010'],
        '2': ['110', '001', '010', '100', '111'], '4': ['101', '101', '111', '001', '001']
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
    function nunca() { return false; }

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
    function disco(c, cx, cy, r, cor, yMax) {
        for (var dy = -r; dy <= r; dy++) {
            var y = cy + dy;
            if (y >= yMax) continue;
            var dx = Math.floor(Math.sqrt(r * r - dy * dy));
            ret(c, cx - dx, y, 2 * dx + 1, 1, cor);
        }
    }
    function anel(c, cx, cy, r, cor, yMax) {
        var visto = {}, n = Math.ceil(Math.PI * 2 * r * 1.5);
        for (var i = 0; i < n; i++) {
            var a = i / n * Math.PI * 2, x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
            if (y >= yMax || visto[x + ',' + y]) continue;
            visto[x + ',' + y] = 1;
            ret(c, x, y, 1, 1, cor);
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

    // Néon: halo, contorno colorido e núcleo claro
    function neon(ctx, blocos, halo, contorno, nucleo, apagada, corOff) {
        apagada = apagada || nunca;
        blocos.forEach(function (b) {
            var m = b.s >= 2 ? 2 : 1;
            if (!apagada(b.i)) ret(ctx, b.x - m, b.y - m, b.s + 2 * m, b.s + 2 * m, halo);
        });
        if (contorno) blocos.forEach(function (b) {
            ret(ctx, b.x - 1, b.y - 1, b.s + 2, b.s + 2, apagada(b.i) ? corOff.contorno : contorno);
        });
        blocos.forEach(function (b) {
            ret(ctx, b.x, b.y, b.s, b.s, apagada(b.i) ? corOff.nucleo : nucleo);
        });
    }
    // Texto com degradê por linhas (estilo cromado / título de jogo)
    function textoGrad(ctx, blocos, y0, alt, cores, contorno, sombra, halo) {
        if (halo) blocos.forEach(function (b) { ret(ctx, b.x - 3, b.y - 3, b.s + 6, b.s + 6, halo); });
        if (sombra) blocos.forEach(function (b) { ret(ctx, b.x - 1 + sombra.dx, b.y - 1 + sombra.dy, b.s + 2, b.s + 2, sombra.cor); });
        if (contorno) blocos.forEach(function (b) { ret(ctx, b.x - 1, b.y - 1, b.s + 2, b.s + 2, contorno); });
        blocos.forEach(function (b) {
            for (var r = 0; r < b.s; r++) {
                var f = (b.y + r - y0) / Math.max(1, alt - 1);
                ret(ctx, b.x, b.y + r, b.s, 1, cores[Math.max(0, Math.min(cores.length - 1, Math.floor(f * cores.length)))]);
            }
        });
    }

    // ---------- Placas néon ----------
    function placa(txt, vertical, k, hue, estilo) {
        var bl = vertical ? textoV(txt, MINI, k, k + 1) : texto(txt, MINI, k, k);
        var acento = (!vertical && txt.indexOf('É') >= 0) ? 2 * k : 0;
        return { bl: bl, w: bl.largura + 4, h: bl.altura + 4 + acento, hue: hue, estilo: estilo, acento: acento };
    }
    function porPlaca(p, x, y, hMin) {
        p.x = x; p.y = y;
        if (hMin) p.h = Math.max(p.h, hMin);
        mover(p.bl, x + 2, y + 2 + p.acento);
        return p;
    }
    function desenharPlaca(ctx, p, ligada) {
        var H = p.hue;
        if (p.estilo === 'cheia') {
            if (ligada) ret(ctx, p.x - 2, p.y - 2, p.w + 4, p.h + 4, hsl(H, 100, 60, 0.16));
            ret(ctx, p.x, p.y, p.w, p.h, ligada ? hsl(H, 95, 58) : hsl(H, 35, 22));
            if (ligada) { ret(ctx, p.x, p.y, p.w, 1, hsl(H, 100, 84)); ret(ctx, p.x, p.y, 1, p.h, hsl(H, 100, 80)); }
            p.bl.forEach(function (b) { ret(ctx, b.x, b.y, b.s, b.s, ligada ? hsl(H, 80, 15) : hsl(H, 30, 12)); });
        } else {
            if (ligada) ret(ctx, p.x - 2, p.y - 2, p.w + 4, p.h + 4, hsl(H, 100, 60, 0.13));
            ret(ctx, p.x, p.y, p.w, p.h, 'rgba(14,7,24,.88)');
            moldura(ctx, p.x, p.y, p.w, p.h, ligada ? hsl(H, 100, 64) : hsl(H, 40, 26));
            if (ligada) neon(ctx, p.bl, hsl(H, 100, 62, 0.2), null, hsl(H, 100, 84));
            else p.bl.forEach(function (b) { ret(ctx, b.x, b.y, b.s, b.s, hsl(H, 35, 28)); });
        }
    }
    // Cada placa falha de vez em quando, como um néon velho
    function placaLigada(i, t) { return aleat(i * 31 + 7, Math.floor(t / 2)) > 0.035; }

    // ---------- Chuva ----------
    function criarGotas(E, densidade, semente) {
        var n = Math.round(E.W * E.H / densidade), g = [];
        for (var i = 0; i < n; i++) g.push({
            x: aleat(i, semente) * E.W, y: aleat(i, semente + 1) * (E.H + 10),
            v: 2 + aleat(i, semente + 2) * 2.5, l: 2 + Math.floor(aleat(i, semente + 3) * 3)
        });
        return g;
    }
    function desenharChuva(ctx, E, gotas, cor) {
        var H = E.H + 10, W = E.W;
        gotas.forEach(function (g) {
            var y = ((g.y + E.t * g.v) % H) - 5;
            var x = (((g.x - (y + 5) * 0.3) % W) + W) % W;
            for (var j = 0; j < g.l; j++) ret(ctx, Math.round(x - j * 0.3), Math.round(y) + j, 1, 1, cor);
        });
    }

    // ---------- Silhuetas ----------
    function palmeira(c, bx, by, alt, dir, cor) {
        var tx = bx + dir * alt * 0.22, ty = by - alt, qx = bx + dir * alt * 0.02, qy = by - alt * 0.55;
        var n = Math.ceil(alt * 1.6), i, s, x, y;
        for (i = 0; i <= n; i++) {   // tronco curvo
            s = i / n;
            x = (1 - s) * (1 - s) * bx + 2 * (1 - s) * s * qx + s * s * tx;
            y = (1 - s) * (1 - s) * by + 2 * (1 - s) * s * qy + s * s * ty;
            var w = Math.max(1, Math.round(alt / 28 * (1.4 - s * 0.6)));
            ret(c, Math.round(x - w / 2), Math.round(y), w, 1, cor);
        }
        [-175, -150, -122, -95, -62, -35, -8].forEach(function (a, k) {   // folhas
            var r = a * Math.PI / 180, len = alt * 0.36 * (0.8 + 0.4 * aleat(k, Math.round(bx))), m = Math.ceil(len * 1.5);
            for (var j = 0; j <= m; j++) {
                var q = j / m, fx = tx + Math.cos(r) * len * q, fy = ty + Math.sin(r) * len * q + 0.55 * len * q * q;
                ret(c, Math.round(fx), Math.round(fy), 1, 1, cor);
                if (q > 0.25 && j % 2 === 0) ret(c, Math.round(fx), Math.round(fy) + 1, 1, Math.max(1, Math.round(alt / 30 * (1 - q) * 3)), cor);
            }
        });
        ret(c, Math.round(tx) - 1, Math.round(ty), 3, 2, cor);
    }
    function pinheiro(c, x, base, alt, cor) {
        var andares = Math.max(2, Math.round(alt / 7)), ah = alt / andares;
        for (var r = 0; r < alt; r++) {
            var an = Math.floor(r / ah), dentro = (r - an * ah) / ah;
            var w = Math.round(1 + (an + 1) * alt * 0.06 + dentro * alt * 0.12);
            ret(c, x - Math.floor(w / 2), base - alt + r, w, 1, cor);
        }
        ret(c, x, base - 1, 1, 2, cor);
    }

    // =====================================================================
    //  OS 4 CENÁRIOS
    //  preparar → calcula posições | fundo → parte fixa (desenhada 1 vez)
    //  frame → o que se mexe | frente → parte fixa por cima de tudo
    // =====================================================================
    var TEMAS = {};

    // ---------- 1) Cidade à chuva ----------
    TEMAS.chuva = {
        preparar: function (E) {
            var W = E.W, H = E.H, est = E.estreito;
            E.box = { w: E.lw + 12, h: 31 };
            E.box.x = est ? Math.round((W - E.box.w) / 2) : 17;
            E.box.y = est ? 4 : 7;
            E.lx = E.box.x + 6; E.ly = E.box.y + 5;
            E.sb = { w: E.sw + 8, h: 14 };
            E.sb.x = est ? Math.round((W - E.sb.w) / 2) : E.box.x + 8;
            E.sb.y = E.box.y + E.box.h + 4;
            E.sx = E.sb.x + 4; E.sy = E.sb.y + 6;
            E.placas = [
                porPlaca(placa('24H', true, 2, 280, 'contorno'), est ? 2 : 4, -1, H + 4),
                porPlaca(placa('CINE', true, 2, 305, 'contorno'), W - (est ? 12 : 28), 5, H)
            ];
            E.torre = null;
            if (!est) {
                E.torre = { x: Math.round(W * 0.6), y: Math.round(H * 0.12), w: 13 };
                E.placas.push(porPlaca(placa('VHS', true, 1, 190, 'cheia'), E.torre.x + 3, E.torre.y + 7));
                E.placas.push(porPlaca(placa('TV', false, 2, 330, 'contorno'), Math.round(W * 0.74), Math.round(H * 0.3)));
            }
            E.gotas = criarGotas(E, 50, 100);
        },
        fundo: function (c, E) {
            var W = E.W, H = E.H, x, bw, bh, yy, xx, r;
            degrade(c, 0, 0, W, H, ['#12062a', '#220a48', '#37106a', '#521a8a', '#6d26a0', '#8433b0']);
            x = 0;   // prédios ao longe, no nevoeiro
            while (x < W) {
                bw = 5 + Math.floor(aleat(x, 11) * 11); bh = Math.round(H * (0.3 + aleat(x, 12) * 0.32));
                ret(c, x, H - bh, bw, bh, '#4c1c84');
                for (yy = H - bh + 2; yy < H; yy += 3) for (xx = x + 1; xx < x + bw - 1; xx += 2) {
                    if (aleat(xx, yy + 5) < 0.12) ret(c, xx, yy, 1, 1, '#9b6fe0');
                }
                x += bw;
            }
            if (E.torre) {   // torre alta com antena
                var t = E.torre;
                ret(c, t.x, t.y, t.w, H - t.y, '#1a0630');
                ret(c, t.x + 6, t.y - 7, 1, 7, '#1a0630');
                ret(c, t.x + 6, t.y - 8, 1, 1, '#ff3d6e');
            }
            x = -3;   // prédios mais perto, com janelas acesas
            while (x < W) {
                bw = 7 + Math.floor(aleat(x, 13) * 14); bh = Math.round(H * (0.16 + aleat(x, 14) * 0.28));
                ret(c, x, H - bh, bw, bh, '#22093c');
                for (yy = H - bh + 2; yy < H; yy += 3) for (xx = x + 1; xx < x + bw - 1; xx += 2) {
                    r = aleat(xx, yy);
                    if (r < 0.13) ret(c, xx, yy, 1, 1, r < 0.04 ? '#ff6ec7' : r < 0.08 ? '#7fe7ff' : '#ffd38a');
                }
                x += bw + 1;
            }
            // cabos elétricos
            [[0.05, 0.22, 0.14], [0.2, 0.02, 0.16], [0.32, 0.26, 0.1]].forEach(function (k) {
                var ya = H * k[0], yb = H * k[1], sag = H * k[2];
                for (var px = 0; px < W; px++) {
                    var u = px / (W - 1);
                    ret(c, px, Math.round(ya + (yb - ya) * u + sag * 4 * u * (1 - u)), 1, 1, '#0c0318');
                }
            });
        },
        frame: function (ctx, E, h) {
            E.placas.forEach(function (p, i) { desenharPlaca(ctx, p, placaLigada(i, E.t)); });
            // placa principal: caixa cheia na cor do avatar, letras brancas
            var b = E.box, ap = function (i) { return i === E.pisca.letra; };
            ret(ctx, b.x - 3, b.y - 3, b.w + 6, b.h + 6, hsl(h, 100, 60, 0.14));
            ret(ctx, b.x - 1, b.y - 1, b.w + 2, b.h + 2, hsl(h, 100, 60, 0.3));
            ret(ctx, b.x, b.y, b.w, b.h, hsl(h, 100, 74));
            ret(ctx, b.x + 1, b.y + 1, b.w - 2, b.h - 2, hsl(h, 85, 46));
            E.letreiro.forEach(function (k) { ret(ctx, k.x + 1, k.y + 1, k.s, k.s, hsl(h, 90, 22)); });
            E.letreiro.forEach(function (k) { ret(ctx, k.x, k.y, k.s, k.s, ap(k.i) ? hsl(h, 60, 68) : '#ffffff'); });
            // placa pequena verde-água
            var s = E.sb;
            ret(ctx, s.x - 2, s.y - 2, s.w + 4, s.h + 4, 'rgba(70,255,200,.12)');
            ret(ctx, s.x, s.y, s.w, s.h, 'rgba(6,24,26,.92)');
            moldura(ctx, s.x, s.y, s.w, s.h, '#5dffcf');
            neon(ctx, E.sub, 'rgba(93,255,207,.16)', null, '#c4fff0');
            // chuva + gotas a brilhar
            desenharChuva(ctx, E, E.gotas, 'rgba(225,205,255,.38)');
            var n = Math.round(E.W * E.H / 230);
            for (var i = 0; i < n; i++) {
                ret(ctx, Math.floor(aleat(i, E.t * 3 + 1) * E.W), Math.floor(aleat(i + 999, E.t * 3 + 2) * E.H), 1, 1, 'rgba(255,255,255,.8)');
            }
        }
    };

    // ---------- 2) Pôr do sol retro (synthwave) ----------
    TEMAS.synthwave = {
        preparar: function (E) {
            var W = E.W, H = E.H;
            E.yh = Math.round(H * 0.66); E.R = Math.round(H * 0.37); E.cx = Math.round(W / 2);
            E.ly = 3;
            E.estrelas = [];
            for (var i = 0; i < 14; i++) E.estrelas.push({ x: Math.floor(aleat(i, 81) * W), y: 2 + Math.floor(aleat(i, 82) * E.yh * 0.55) });
        },
        fundo: function (c, E) {
            var W = E.W, H = E.H, yh = E.yh, R = E.R, cx = E.cx, i, x, y;
            degrade(c, 0, 0, W, yh, ['#0b0320', '#1c0838', '#360d58', '#5e1470', '#93207a', '#c93a86']);
            for (i = 0; i < W * yh / 45; i++) {   // estrelas fixas
                x = Math.floor(aleat(i, 3) * W); y = Math.floor(aleat(i, 4) * yh * 0.7);
                var a = aleat(i, 5);
                ret(c, x, y, 1, 1, a > 0.85 ? '#ffffff' : a > 0.5 ? '#c9b6ff' : '#6d4fa8');
            }
            // brilho e anéis à volta do sol
            disco(c, cx, yh, R + 12, 'rgba(255,70,170,.07)', yh);
            disco(c, cx, yh, R + 6, 'rgba(255,90,170,.1)', yh);
            anel(c, cx, yh, R + 9, 'rgba(255,150,220,.35)', yh);
            anel(c, cx, yh, R + 16, 'rgba(190,120,255,.2)', yh);
            // sol às riscas
            var riscas = {}, pos = 1, gr = 3, passo = 3;
            while (pos < R * 0.5) { for (var q = 0; q < gr; q++) riscas[pos + q] = 1; pos += gr + passo; passo++; if (gr > 1) gr--; }
            for (y = yh - R; y < yh; y++) {
                if (riscas[yh - y]) continue;
                var dx = Math.floor(Math.sqrt(R * R - (y - yh) * (y - yh)));
                linhaD(c, cx - dx, cx + dx + 1, y, ['#fff4a0', '#ffd25a', '#ff9a4a', '#ff5a78', '#ff3d9a'], (y - (yh - R)) / R);
            }
            // montanhas em arame
            for (var lado = 0; lado < 2; lado++) {
                var lim = cx - R - 4, ant = null;
                for (var j = 0; j < lim; j++) {
                    x = lado ? W - 1 - j : j;
                    var u = j / lim, n = 0.55 + 0.25 * Math.sin(j * 0.19 + lado * 2) + 0.2 * Math.sin(j * 0.071 + 1.3 + lado);
                    var alt = Math.round(Math.pow(1 - u, 0.9) * H * 0.42 * n);
                    if (alt <= 0) { ant = null; continue; }
                    var topo = yh - alt;
                    ret(c, x, topo, 1, alt, j % 5 === 0 ? '#3b2382' : '#170a36');
                    for (y = topo; y < yh; y++) if ((yh - y) % 3 === 0) ret(c, x, y, 1, 1, '#5634b0');
                    if (ant === null) ant = topo;
                    ret(c, x, Math.min(topo, ant), 1, Math.abs(topo - ant) + 1, '#c08cff');
                    ant = topo;
                }
            }
            palmeira(c, cx - R - 9, yh + 1, Math.round(H * 0.22), -1, '#1a0630');
            palmeira(c, cx + R + 11, yh + 1, Math.round(H * 0.18), 1, '#1a0630');
            // chão com linhas para o horizonte
            degrade(c, 0, yh, W, H, ['#40106a', '#250a48', '#13052a']);
            var sp = Math.max(10, Math.round(W / 8));
            for (i = -14; i <= 14; i++) {
                var xb = cx + i * sp, px = null;
                for (y = yh + 1; y < H; y++) {
                    var f = (y - yh) / (H - yh), xx = Math.round(cx + (xb - cx) * f);
                    var a0 = px === null ? xx : (xx > px ? px + 1 : xx), a1 = px === null ? xx : (xx < px ? px - 1 : xx);
                    ret(c, Math.min(a0, a1), y, Math.abs(a1 - a0) + 1, 1, 'rgba(225,80,255,' + (0.25 + 0.65 * f).toFixed(2) + ')');
                    px = xx;
                }
            }
        },
        frame: function (ctx, E, h) {
            var W = E.W, H = E.H, yh = E.yh, R = E.R, cx = E.cx, j;
            // linhas horizontais a vir na nossa direção
            var fase = (E.t * 0.05) % 1, n = 7;
            for (j = 0; j < n; j++) {
                var u = (j + fase) / n;
                ret(ctx, 0, yh + 1 + Math.round((H - yh) * u * u), W, 1, 'rgba(225,80,255,' + (0.2 + 0.7 * u).toFixed(2) + ')');
            }
            ret(ctx, 0, yh, W, 1, '#ff9ae6');
            ret(ctx, 0, yh + 1, W, 1, 'rgba(255,120,220,.35)');
            // reflexo do sol no chão
            for (j = 0; j < 6; j++) {
                var y = yh + 2 + j * 2;
                if (y >= H) break;
                var w = Math.round(R * (1.1 - j * 0.16) * (0.75 + 0.5 * aleat(j, E.t)));
                if (w <= 0) continue;
                ret(ctx, cx - Math.round(w / 2) + Math.round((aleat(j + 9, E.t) - 0.5) * 3), y, w, 1, j % 2 ? 'rgba(255,190,90,.75)' : 'rgba(255,80,160,.65)');
            }
            // estrelas a cintilar
            E.estrelas.forEach(function (s, i) {
                var v = aleat(i, Math.floor((E.t + i * 2) / 3));
                if (v < 0.6) return;
                ret(ctx, s.x, s.y, 1, 1, '#ffffff');
                if (v > 0.85) { ret(ctx, s.x - 1, s.y, 3, 1, 'rgba(255,220,255,.7)'); ret(ctx, s.x, s.y - 1, 1, 3, 'rgba(255,220,255,.7)'); }
            });
            // TAVDEX cromado anos 80
            textoGrad(ctx, E.letreiro, E.ly, 21,
                ['#e9fdff', '#bdf1ff', '#83d6ff', '#5aa8ff', '#ffffff', '#2a1250', '#5a2390', '#a33fc0', '#ff6fd8'],
                hsl(h, 100, 62), { dx: 1, dy: 2, cor: '#12031f' }, hsl(h, 100, 60, 0.07));
            E.sub.forEach(function (b) { ret(ctx, b.x - 1, b.y - 1, 3, 3, '#12031f'); });
            E.sub.forEach(function (b) { ret(ctx, b.x, b.y, 1, 1, '#8ff7ff'); });
        },
        frente: function (c, E) {   // palmeiras grandes à frente
            var W = E.W, H = E.H, est = E.estreito;
            palmeira(c, Math.round(W * (est ? 0.04 : 0.05)), H + 2, Math.round(H * (est ? 0.85 : 1.05)), 1, '#08020f');
            palmeira(c, Math.round(W * (est ? 0.96 : 0.95)), H + 2, Math.round(H * (est ? 0.8 : 0.95)), -1, '#08020f');
        }
    };

    // ---------- 3) Beco néon ----------
    TEMAS.beco = {
        preparar: function (E) {
            var W = E.W, H = E.H, est = E.estreito;
            E.vx = Math.round(W / 2); E.vy = Math.round(H * 0.48);
            E.xi = Math.round(W * 0.36); E.xr = W - 1 - E.xi;
            E.yti = Math.round(-12 + (E.vy + 12) * E.xi / E.vx);
            E.ybi = Math.round(H + 4 + (E.vy - H - 4) * E.xi / E.vx);
            E.ly = est ? 6 : 7;
            E.box = { x: E.lx - 6, y: E.ly - 5, w: E.lw + 12, h: 31 };
            E.sb = { w: E.sw + 8, h: 14 };
            E.sb.x = Math.round((W - E.sb.w) / 2); E.sb.y = E.box.y + E.box.h + 3;
            E.sx = E.sb.x + 4; E.sy = E.sb.y + 6;
            // [distância à borda (fração da largura), altura (fração), texto, vertical?, tamanho, cor, estilo]
            var esq = [
                [0.01, 0.02, 'CINE', true, 2, 330, 'cheia'],
                [0.075, 0.1, 'VHS', true, 2, 355, 'contorno'],
                [0.14, 0.18, '24H', false, 1, 280, 'cheia'],
                [0.17, 0.32, 'DVD', true, 1, 310, 'contorno'],
                [0.23, 0.22, 'FILME', true, 1, 340, 'cheia'],
                [0.285, 0.45, 'PLAY', false, 1, 0, 'contorno']
            ];
            var dir = [
                [0.015, 0.04, 'TV', false, 2, 0, 'contorno'],
                [0.02, 0.3, 'ESTREIA', true, 1, 320, 'cheia'],
                [0.09, 0.08, 'PIPOCAS', true, 1, 345, 'contorno'],
                [0.15, 0.2, 'CINE', true, 1, 280, 'cheia'],
                [0.21, 0.14, 'SÉRIES', false, 1, 300, 'contorno'],
                [0.27, 0.34, '24H', true, 1, 190, 'cheia']
            ];
            var quantas = est ? 3 : 6;
            E.placas = [];
            esq.slice(0, quantas).forEach(function (d) {
                E.placas.push(porPlaca(placa(d[2], d[3], d[4], d[5], d[6]), Math.round(d[0] * W), Math.round(d[1] * H)));
            });
            dir.slice(0, quantas).forEach(function (d) {
                var p = placa(d[2], d[3], d[4], d[5], d[6]);
                E.placas.push(porPlaca(p, W - Math.round(d[0] * W) - p.w, Math.round(d[1] * H)));
            });
            E.gotas = criarGotas(E, 140, 300);
        },
        fundo: function (c, E) {
            var W = E.W, H = E.H, xi = E.xi, xr = E.xr, ybi = E.ybi, vx = E.vx, vy = E.vy, x, y, u;
            degrade(c, 0, 0, W, ybi + 1, ['#05030b', '#0d0720', '#1b0b35', '#2c1150']);
            x = xi - 8;   // prédios ao fundo do beco
            while (x < xr + 8) {
                var bw = 5 + Math.floor(aleat(x, 21) * 8), topo = Math.round(E.yti - 4 + aleat(x, 22) * H * 0.28);
                ret(c, x, topo, bw, ybi - topo + 1, '#140a24');
                for (y = topo + 2; y < ybi; y += 3) for (var xx = x + 1; xx < x + bw - 1; xx += 2) {
                    var r = aleat(xx, y + 3);
                    if (r < 0.16) ret(c, xx, y, 1, 1, r < 0.06 ? '#ff5fb8' : r < 0.11 ? '#6ad8ff' : '#ffcf8a');
                }
                x += bw + 1;
            }
            ret(c, vx + 7, E.yti + 2, 2, Math.round(H * 0.2), '#b65cff');
            // chão molhado com linhas para o fundo
            degrade(c, 0, ybi, W, H, ['#1a1030', '#0e0919', '#08060f']);
            for (var g = -6; g <= 6; g++) {
                var xb = vx + g * Math.round(W / 10);
                for (y = ybi + 1; y < H; y++) {
                    u = (y - ybi) / (H - ybi);
                    ret(c, Math.round(vx + (xb - vx) * u), y, 1, 1, 'rgba(140,100,220,.12)');
                }
            }
            // fachadas em perspetiva, com janelas e beirais
            var faixas = [-0.08, 0.1, 0.28, 0.46, 0.64, 0.82, 1].map(function (f) { return f * H; });
            for (var lado = 0; lado < 2; lado++) {
                var X = function (j) { return lado ? W - 1 - j : j; };
                for (var j = 0; j <= xi; j++) {
                    u = j / vx;
                    var yt = Math.round(-12 + (vy + 12) * u), yb = Math.round(H + 4 + (vy - H - 4) * u);
                    ret(c, X(j), yt, 1, yb - yt, lado ? '#130b20' : '#100919');
                }
                for (var f = 0; f < faixas.length - 1; f++) for (var col = 0; col < 7; col++) {
                    var rr = aleat(col + lado * 17, f + 50);
                    if (rr > 0.42) continue;
                    var xa = Math.round(xi * (1 - Math.pow(0.7, col + 0.25))), xe = Math.round(xi * (1 - Math.pow(0.7, col + 0.8)));
                    var cor = rr < 0.12 ? 'rgba(255,170,110,.5)' : rr < 0.24 ? 'rgba(255,90,190,.45)' : 'rgba(120,90,255,.4)';
                    for (var xw = xa; xw <= xe; xw++) {
                        var ya = Math.round(faixas[f] + (vy - faixas[f]) * xw / vx) + 1;
                        var yz = Math.round(faixas[f + 1] + (vy - faixas[f + 1]) * xw / vx) - 2;
                        if (yz > ya) ret(c, X(xw), ya, 1, yz - ya, cor);
                    }
                }
                for (f = 0; f < faixas.length; f++) for (var xl = 0; xl <= xi; xl++) {
                    ret(c, X(xl), Math.round(faixas[f] + (vy - faixas[f]) * xl / vx), 1, 1, '#241838');
                }
            }
            // pessoa ao fundo
            var py = ybi + 3;
            ret(c, vx, py, 2, 2, '#030106'); ret(c, vx - 1, py + 2, 4, 4, '#030106');
            ret(c, vx - 1, py + 6, 1, 3, '#030106'); ret(c, vx + 2, py + 6, 1, 3, '#030106');
        },
        frame: function (ctx, E, h) {
            var ybi = E.ybi, H = E.H, b = E.box, s = E.sb, t2 = Math.floor(E.t / 2);
            E.placas.forEach(function (p, i) { desenharPlaca(ctx, p, placaLigada(i, E.t)); });
            // reflexos no chão molhado (o letreiro ao contrário, a tremer)
            [[E.letreiro, hsl(h, 100, 66, 0.18)], [E.sub, 'rgba(100,240,255,.1)']].forEach(function (par) {
                par[0].forEach(function (k) {
                    var ry = 2 * ybi - k.y + 4;
                    if (ry >= H || ry < ybi) return;
                    ret(ctx, k.x + Math.round((aleat(ry, t2) - 0.5) * 3), ry, k.s, Math.min(k.s, H - ry), par[1]);
                });
            });
            for (var i = 0; i < 26; i++) {
                var gx = Math.floor(E.xi * 0.6 + aleat(i, t2 + 5) * (E.W - E.xi * 1.2)), gy = ybi + 1 + Math.floor(aleat(i + 50, t2) * (H - ybi));
                ret(ctx, gx, gy, 1 + (i % 2), 1, i % 3 === 0 ? 'rgba(100,240,255,.35)' : 'rgba(255,90,190,.35)');
            }
            // letreiro TAVDEX pendurado
            ret(ctx, b.x + 6, 0, 1, b.y, '#2b2340'); ret(ctx, b.x + b.w - 7, 0, 1, b.y, '#2b2340');
            ret(ctx, b.x - 3, b.y - 3, b.w + 6, b.h + 6, hsl(h, 100, 60, 0.1));
            ret(ctx, b.x, b.y, b.w, b.h, '#0b0612');
            moldura(ctx, b.x, b.y, b.w, b.h, hsl(h, 70, 36));
            neon(ctx, E.letreiro, hsl(h, 100, 62, 0.14), hsl(h, 100, 58), hsl(h, 100, 88),
                function (i) { return i === E.pisca.letra; }, { contorno: hsl(h, 45, 22), nucleo: hsl(h, 35, 32) });
            ret(ctx, s.x + 8, b.y + b.h, 1, s.y - b.y - b.h, '#2b2340'); ret(ctx, s.x + s.w - 9, b.y + b.h, 1, s.y - b.y - b.h, '#2b2340');
            ret(ctx, s.x - 2, s.y - 2, s.w + 4, s.h + 4, 'rgba(90,230,255,.1)');
            ret(ctx, s.x, s.y, s.w, s.h, '#0b0612');
            moldura(ctx, s.x, s.y, s.w, s.h, '#4fe3ff');
            neon(ctx, E.sub, 'rgba(90,230,255,.16)', null, '#c6f8ff');
            desenharChuva(ctx, E, E.gotas, 'rgba(200,180,255,.25)');
        }
    };

    // ---------- 4) Montanhas ao anoitecer ----------
    TEMAS.montanhas = {
        preparar: function (E) {
            var W = E.W, H = E.H;
            E.yh = Math.round(H * 0.66); E.R = Math.round(H * 0.2); E.cx = Math.round(W / 2); E.cy = E.yh - 9;
            E.ly = 4;
            E.lago = function (y) { return Math.round(W * 0.03 + (y - E.yh) / (H - E.yh) * W * 0.18); };
            E.brilhos = [];
            for (var i = 0; i < 8; i++) E.brilhos.push({ x: Math.floor(aleat(i, 61) * W), y: 3 + Math.floor(aleat(i, 62) * E.yh * 0.5), c: ['#ffb3e6', '#a8b8ff', '#ffffff'][i % 3] });
        },
        fundo: function (c, E) {
            var W = E.W, H = E.H, yh = E.yh, cx = E.cx, R = E.R, x, y, i, ant;
            degrade(c, 0, 0, W, yh, ['#120722', '#1f0c38', '#371355', '#5e1a6e', '#8f2479', '#c7357c', '#ec6187']);
            for (i = 0; i < W * yh / 40; i++) {   // estrelas pequenas
                x = Math.floor(aleat(i, 31) * W); y = Math.floor(aleat(i, 32) * yh * 0.5);
                ret(c, x, y, 1, 1, aleat(i, 33) > 0.6 ? '#cdb8ff' : '#7e64b8');
            }
            for (var b = 0; b < 6; b++) {   // nuvens às riscas
                var by = Math.round(yh * (0.32 + b * 0.1));
                for (var s = 0; s < W / 50; s++) {
                    var sx = Math.floor(aleat(b, s * 3) * W), len = 20 + Math.floor(aleat(b, s * 3 + 1) * 60), gr = 1 + Math.floor(aleat(b, s * 3 + 2) * 2);
                    ret(c, sx, by, len, gr, 'rgba(48,10,70,.55)');
                    ret(c, sx + 3, by - 1, len - 6, 1, 'rgba(255,150,200,.22)');
                }
            }
            // sol cor-de-rosa
            disco(c, cx, E.cy, R + 7, 'rgba(255,150,200,.1)', 999);
            for (var dy = -R; dy <= R; dy++) {
                var dx = Math.floor(Math.sqrt(R * R - dy * dy));
                linhaD(c, cx - dx, cx + dx + 1, E.cy + dy, ['#ffe0ee', '#ffb3d4', '#ff8fc0'], (dy + R) / (2 * R));
            }
            // duas camadas de montanhas (vale ao centro)
            [[0.08, 0.26, 0.045, 0.13, '#6a2672', '#b44a8c', 0], [0.04, 0.14, 0.07, 0.19, '#3c1350', '#7a2a74', 3]].forEach(function (m) {
                ant = null;
                for (x = 0; x < W; x++) {
                    var n = 0.5 + 0.3 * Math.sin(x * m[2] + 0.5 + m[6]) + 0.2 * Math.sin(x * m[3] + 2 + m[6]);
                    var vale = 0.35 + 0.65 * Math.min(1, Math.abs(x - cx) / (W * 0.35));
                    var topo = yh - Math.round(H * (m[0] + m[1] * n) * vale);
                    ret(c, x, topo, 1, yh - topo + 1, m[4]);
                    if (ant !== null && topo < ant) ret(c, x, topo, 1, 1, m[5]);
                    ant = topo;
                }
            });
            // terra e lago
            ret(c, 0, yh, W, H - yh, '#1a0824');
            for (y = yh; y < H; y++) {
                var hw = E.lago(y);
                linhaD(c, cx - hw, cx + hw, y, ['#7d2a7c', '#5a1e66', '#3e1550'], (y - yh) / (H - yh));
            }
            for (x = 0; x < W; x += 3 + Math.floor(aleat(x, 70) * 4)) {   // pinheiros ao longe
                if (Math.abs(x - cx) < E.lago(yh + 4) + 3) continue;
                pinheiro(c, x, yh + 5, 6 + Math.floor(aleat(x, 71) * 10), '#2a0e36');
            }
        },
        frame: function (ctx, E, h) {
            var W = E.W, H = E.H, yh = E.yh, cx = E.cx, t = E.t, i, y;
            // estrelas grandes a cintilar
            E.brilhos.forEach(function (s, k) {
                var v = aleat(k, Math.floor((t + k * 3) / 4));
                if (v < 0.35) return;
                var braco = v > 0.75 ? 2 : 1;
                ret(ctx, s.x, s.y, 1, 1, '#ffffff');
                ret(ctx, s.x - braco, s.y, braco, 1, s.c); ret(ctx, s.x + 1, s.y, braco, 1, s.c);
                ret(ctx, s.x, s.y - braco, 1, braco, s.c); ret(ctx, s.x, s.y + 1, 1, braco, s.c);
            });
            // estrela cadente de vez em quando
            var per = 80, p = t % per;
            if (p < 14) {
                var ciclo = Math.floor(t / per), f = p / 14;
                var sx = W * (0.1 + aleat(ciclo, 1) * 0.5), sy = 3 + aleat(ciclo, 2) * 6, ex = sx + W * 0.25, ey = sy + yh * 0.35;
                var x = sx + (ex - sx) * f, yy = sy + (ey - sy) * f, len = Math.hypot(ex - sx, ey - sy), ux = (ex - sx) / len, uy = (ey - sy) / len;
                for (var q = 0; q < 12; q++) ret(ctx, Math.round(x - ux * q), Math.round(yy - uy * q), 1, 1, 'rgba(255,230,255,' + ((1 - q / 12) * 0.9).toFixed(2) + ')');
            }
            // lago a brilhar
            for (y = yh + 1; y < H; y++) {
                var hw = E.lago(y), n = Math.max(1, Math.round(hw / 3));
                for (i = 0; i < n; i++) {
                    if (aleat(i * 7 + y, t) < 0.5) continue;
                    ret(ctx, cx - hw + Math.floor(aleat(i + y * 13, t * 3 + 1) * 2 * hw), y, 1 + (i % 2), 1, i % 3 ? '#ffc0e0' : '#ff7ab8');
                }
            }
            for (i = 0; i < 4; i++) {   // reflexo do sol
                var w = Math.round(E.R * (1.2 - i * 0.25) * (0.8 + 0.4 * aleat(i, t)));
                if (w > 0) ret(ctx, cx - Math.round(w / 2), yh + 1 + i * 2, w, 1, 'rgba(255,200,225,.7)');
            }
            // TAVDEX como título de jogo
            textoGrad(ctx, E.letreiro, E.ly, 21,
                [hsl(h, 100, 94), hsl(h, 100, 86), hsl(h, 100, 78), hsl(h, 95, 68), hsl(h, 90, 58)],
                '#1f0828', { dx: 0, dy: 2, cor: '#12041a' }, hsl(h, 100, 72, 0.07));
            E.sub.forEach(function (b) { ret(ctx, b.x - 1, b.y - 1, 3, 3, '#1f0828'); });
            E.sub.forEach(function (b) { ret(ctx, b.x, b.y, 1, 1, '#ffe0f0'); });
        },
        frente: function (c, E) {   // pinheiros grandes à frente
            var W = E.W, H = E.H, cx = E.cx, hw = E.lago(H - 1);
            for (var x = -4; x < W + 4; x += 4 + Math.floor(aleat(x + 9, 72) * 5)) {
                if (Math.abs(x - cx) < hw * 0.9) continue;
                var alt = Math.round(H * (0.18 + aleat(x, 73) * 0.24));
                pinheiro(c, x, H + 1, alt, aleat(x, 74) < 0.5 ? '#10051a' : '#1a0926');
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

        function nomeTema() { return TEMAS[banner.getAttribute('data-tema')] ? banner.getAttribute('data-tema') : 'chuva'; }
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
