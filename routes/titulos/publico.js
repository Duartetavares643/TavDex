// =====================================================================
//  TavDex – catálogo de filmes e séries: parte pública (Fase 5)   Base: /api/titulos
//    GET /                     catálogo (pesquisa, filtros, ordenação, paginação)
//    GET /opcoes               géneros, plataformas e anos (para os filtros)
//    GET /inicio               filas da página inicial
//    GET /pesquisa?q=          pesquisa geral (títulos, projetos, pessoas, utilizadores)
//    GET /:id                  página de um filme/série
// =====================================================================
const express = require('express');
const { linha, linhas } = require('../../db');
const a = require('../ajudas');
const { SQL_TITULOS, SQL_PROJETOS, recomendacoes } = require('../consultas');

const router = express.Router();
const MAX_ID = 2147483647;   // maior valor de uma coluna INT (ids)
const ANO_MAX = new Date().getFullYear() + 5;   // ano mais alto aceite (estreias anunciadas)
const GENEROS_INICIO = ['Ação', 'Drama', 'Ficção Científica'];   // filas da página inicial

// Ordenações permitidas. Não se pode pôr "?" no ORDER BY, por isso o
// utilizador escolhe uma chave e o SQL vem SEMPRE desta lista fixa.
const ORDENS = {
  recentes: 'v.ano DESC, v.id DESC',
  nome: 'v.nome ASC',
  ano: 'v.ano ASC, v.nome',
  nota: 'v.media IS NULL, v.media DESC, v.total_avaliacoes DESC',
  populares: 'v.total_avaliacoes DESC, v.media DESC',
};

// ---------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------
router.get('/', async (req, res) => {
  const filtros = [];
  const valores = [];
  const q = String(req.query.q || '').trim().slice(0, 80);
  if (q) { filtros.push('(v.nome LIKE ? OR v.realizador LIKE ?)'); valores.push(`%${q}%`, `%${q}%`); }
  if (req.query.tipo === 'filme' || req.query.tipo === 'serie') { filtros.push('v.tipo = ?'); valores.push(req.query.tipo); }
  if (req.query.genero) {
    filtros.push('v.id IN (SELECT titulo_id FROM titulo_generos WHERE genero_id = ?)');
    valores.push(a.inteiro(req.query.genero, 'Género', 1, MAX_ID));
  }
  if (req.query.plataforma) {
    filtros.push('v.id IN (SELECT titulo_id FROM titulo_plataformas WHERE plataforma_id = ?)');
    valores.push(a.inteiro(req.query.plataforma, 'Plataforma', 1, MAX_ID));
  }
  if (req.query.ano) { filtros.push('v.ano = ?'); valores.push(a.inteiro(req.query.ano, 'Ano', 1888, ANO_MAX)); }
  const onde = filtros.length ? ' WHERE ' + filtros.join(' AND ') : '';
  const ordem = ORDENS[req.query.ordem] || ORDENS.recentes;

  const pg = a.paginacao(req, 24);
  const total = await linha(`SELECT COUNT(*) AS n FROM vw_titulos_avaliacao v${onde}`, valores);
  const titulos = await linhas(`${SQL_TITULOS}${onde} ORDER BY ${ordem}${pg.sql}`, valores);
  res.json({ titulos, total: total.n, pagina: pg.pagina, porPagina: pg.porPagina });
});

// Géneros, plataformas, anos e a lista simples de títulos (para filtros e menus de escolha)
router.get('/opcoes', async (req, res) => {
  const [generos, plataformas, anos, titulos] = await Promise.all([
    linhas('SELECT id, nome FROM generos ORDER BY nome'),
    linhas('SELECT id, nome, cor, url, logo FROM plataformas ORDER BY nome'),
    linhas('SELECT DISTINCT ano FROM titulos ORDER BY ano DESC'),
    linhas('SELECT id, nome, ano, tipo FROM titulos ORDER BY nome'),
  ]);
  res.json({ generos, plataformas, anos: anos.map(r => r.ano), titulos, ordens: Object.keys(ORDENS) });
});

// ---------------------------------------------------------------------
// Página inicial: destaques e filas de cartazes
// ---------------------------------------------------------------------
router.get('/inicio', async (req, res) => {
  const comNotas = 'WHERE v.total_avaliacoes >= 3';
  const [destaques, top10, populares, novidades, projetos, generos] = await Promise.all([
    linhas(`${SQL_TITULOS} ${comNotas} ORDER BY v.media DESC LIMIT 5`),
    linhas(`${SQL_TITULOS} ${comNotas} ORDER BY v.media DESC, v.total_avaliacoes DESC LIMIT 10`),
    linhas(`${SQL_TITULOS} ORDER BY v.total_avaliacoes DESC, v.nome LIMIT 12`),
    linhas(`${SQL_TITULOS} ORDER BY v.ano DESC, v.id DESC LIMIT 12`),
    linhas(`${SQL_PROJETOS} ORDER BY p.criado_em DESC LIMIT 4`),
    // Uma fila por género: Ação, Drama e Ficção Científica (pela ordem do anteprojeto)
    linhas(`SELECT g.id, g.nome FROM generos g WHERE g.nome IN (?, ?, ?) ORDER BY FIELD(g.nome, ?, ?, ?)`,
      [...GENEROS_INICIO, ...GENEROS_INICIO]),
  ]);
  // Se algum destes géneros não existir, completa com os géneros com mais títulos
  if (generos.length < GENEROS_INICIO.length) {
    const extra = await linhas(`SELECT g.id, g.nome, COUNT(*) AS n FROM generos g JOIN titulo_generos tg ON tg.genero_id = g.id
            GROUP BY g.id, g.nome ORDER BY n DESC, g.nome LIMIT 6`);
    for (const g of extra) {
      if (generos.length >= GENEROS_INICIO.length) break;
      if (!generos.some(x => x.id === g.id)) generos.push(g);
    }
  }
  for (const g of generos) {
    g.titulos = await linhas(`${SQL_TITULOS} WHERE v.id IN (SELECT titulo_id FROM titulo_generos WHERE genero_id = ?)
                              ORDER BY v.media DESC LIMIT 12`, [g.id]);
  }
  // Os destaques mostram também os géneros e o número de temporadas
  for (const t of destaques) {
    t.generos = (await linhas('SELECT g.nome FROM generos g JOIN titulo_generos tg ON tg.genero_id = g.id WHERE tg.titulo_id = ? ORDER BY g.nome', [t.id])).map(g => g.nome);
    t.temporadas = (await linha('SELECT COUNT(*) AS n FROM temporadas WHERE titulo_id = ?', [t.id])).n;
  }

  let minhaLista = [];
  let recomendados = [];
  if (req.u) {
    // "A minha lista": para ver + favoritos que ainda não vi
    minhaLista = await linhas(`${SQL_TITULOS} WHERE v.id IN (SELECT titulo_id FROM listas WHERE utilizador_id = ? AND tipo IN ('ver','favorito'))
                               AND v.id NOT IN (SELECT titulo_id FROM listas WHERE utilizador_id = ? AND tipo = 'visto')
                               ORDER BY v.nome LIMIT 12`, [req.u.id, req.u.id]);
    recomendados = await recomendacoes(req.u.id, 12);
  }
  res.json({ destaques, top10, populares, novidades, projetos, generos, minhaLista, recomendados });
});

// ---------------------------------------------------------------------
// Pesquisa geral (barra do topo)
// ---------------------------------------------------------------------
router.get('/pesquisa', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 80);
  if (q.length < 2) return res.json({ q, titulos: [], projetos: [], pessoas: [], utilizadores: [] });
  const like = `%${q}%`;
  const [titulos, projetos, pessoas, utilizadores] = await Promise.all([
    linhas(`${SQL_TITULOS} WHERE v.nome LIKE ? OR v.realizador LIKE ? ORDER BY v.total_avaliacoes DESC LIMIT 24`, [like, like]),
    linhas(`${SQL_PROJETOS} WHERE p.titulo LIKE ? OR p.sinopse LIKE ? ORDER BY p.criado_em DESC LIMIT 12`, [like, like]),
    linhas(`SELECT p.id, p.nome, p.foto,
              (SELECT GROUP_CONCAT(DISTINCT t.nome ORDER BY t.nome SEPARATOR ', ')
                 FROM titulo_pessoas tp JOIN titulos t ON t.id = tp.titulo_id WHERE tp.pessoa_id = p.id) AS titulos,
              (SELECT MIN(tp.titulo_id) FROM titulo_pessoas tp WHERE tp.pessoa_id = p.id) AS titulo_id
            FROM pessoas p WHERE p.nome LIKE ? ORDER BY p.nome LIMIT 12`, [like]),
    linhas('SELECT id, nome, cor, papel FROM utilizadores WHERE nome LIKE ? AND bloqueado = 0 ORDER BY nome LIMIT 12', [like]),
  ]);
  res.json({ q, titulos, projetos, pessoas, utilizadores });
});

// ---------------------------------------------------------------------
// Página de um filme/série
// ---------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  const id = a.inteiro(req.params.id, 'Título', 1, MAX_ID);
  const t = await linha(`${SQL_TITULOS} WHERE v.id = ?`, [id]);
  if (!t) a.falha(404, 'Filme ou série não encontrado.');
  const uid = req.u ? req.u.id : 0;

  const [generos, plataformas, pessoas, temporadas, avaliacoes, distribuicao, listas, semelhantes] = await Promise.all([
    linhas('SELECT g.id, g.nome FROM generos g JOIN titulo_generos tg ON tg.genero_id = g.id WHERE tg.titulo_id = ? ORDER BY g.nome', [id]),
    linhas(`SELECT p.id, p.nome, p.cor, p.url, p.logo, tp.link FROM plataformas p
            JOIN titulo_plataformas tp ON tp.plataforma_id = p.id WHERE tp.titulo_id = ? ORDER BY p.nome`, [id]),
    linhas(`SELECT p.id, p.nome, p.foto, tp.funcao, tp.personagem, tp.ordem FROM titulo_pessoas tp
            JOIN pessoas p ON p.id = tp.pessoa_id WHERE tp.titulo_id = ? ORDER BY tp.funcao = 'ator', tp.ordem, p.nome`, [id]),
    linhas('SELECT * FROM temporadas WHERE titulo_id = ? ORDER BY numero', [id]),
    linhas(`SELECT a.id, a.nota, a.review, a.spoiler, a.criado_em, a.editado_em, u.id AS utilizador_id, u.nome, u.cor, u.foto_versao
            FROM avaliacoes a JOIN utilizadores u ON u.id = a.utilizador_id
            WHERE a.titulo_id = ? ORDER BY a.utilizador_id = ? DESC, a.criado_em DESC`, [id, uid]),
    linhas('SELECT nota, COUNT(*) AS n FROM avaliacoes WHERE titulo_id = ? GROUP BY nota', [id]),
    linhas('SELECT tipo FROM listas WHERE utilizador_id = ? AND titulo_id = ?', [uid, id]),
    // Semelhantes: títulos com mais géneros em comum
    linhas(`${SQL_TITULOS} WHERE v.id <> ? AND v.id IN (SELECT tg.titulo_id FROM titulo_generos tg
              WHERE tg.genero_id IN (SELECT genero_id FROM titulo_generos WHERE titulo_id = ?))
            ORDER BY (SELECT COUNT(*) FROM titulo_generos tg WHERE tg.titulo_id = v.id
              AND tg.genero_id IN (SELECT genero_id FROM titulo_generos WHERE titulo_id = ?)) DESC, v.media DESC LIMIT 12`, [id, id, id]),
  ]);

  // Episódios de todas as temporadas (de uma vez)
  if (temporadas.length) {
    const ids = temporadas.map(s => s.id);
    const episodios = await linhas(`SELECT * FROM episodios WHERE temporada_id IN (${a.marcadores(ids)}) ORDER BY numero`, ids);
    temporadas.forEach(s => { s.lista_episodios = episodios.filter(e => e.temporada_id === s.id); });
  }

  res.json({
    titulo: t, generos, plataformas, pessoas, temporadas, avaliacoes, semelhantes,
    distribuicao: [1, 2, 3, 4, 5].map(n => ({ nota: n, n: (distribuicao.find(d => d.nota === n) || { n: 0 }).n })),
    minha_avaliacao: avaliacoes.find(x => x.utilizador_id === uid) || null,
    listas: { favorito: listas.some(l => l.tipo === 'favorito'), ver: listas.some(l => l.tipo === 'ver'), visto: listas.some(l => l.tipo === 'visto') },
  });
});

module.exports = router;
