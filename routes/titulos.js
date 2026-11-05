// =====================================================================
//  TavDex – catálogo de filmes e séries (Fase 5)     Base: /api/titulos
//  Público:
//    GET /                     catálogo (pesquisa, filtros, ordenação, paginação)
//    GET /inicio               filas da página inicial
//    GET /pesquisa?q=          pesquisa geral (títulos, projetos, pessoas, utilizadores)
//    GET /opcoes               géneros, plataformas e anos (para os filtros)
//    GET /:id                  página de um filme/série
//  Só administradores:
//    POST/PUT/DELETE /, /:id                  filmes e séries
//    POST /generos · DELETE /generos/:id      géneros
//    GET /pessoas/lista?q= · POST /pessoas · DELETE /pessoas/:id
//    POST /:id/pessoas · DELETE /:id/pessoas/:pessoa/:funcao   elenco e equipa
//    POST /plataformas · PUT/DELETE /plataformas/:id
//    PUT /:id/plataformas                     onde ver
//    POST /:id/temporadas · DELETE /temporadas/:id
//    POST /temporadas/:id/episodios · DELETE /episodios/:id
// =====================================================================
const express = require('express');
const { pool, linha, linhas, executar } = require('../db');
const a = require('./ajudas');
const { exigirAdmin } = require('./middleware');
const { SQL_TITULOS, SQL_PROJETOS, recomendacoes } = require('./consultas');

const router = express.Router();
const MAX_ID = 2147483647;
const ANO_MAX = new Date().getFullYear() + 5;

// Ordenações permitidas. Não se pode pôr "?" no ORDER BY, por isso o
// utilizador escolhe uma chave e o SQL vem SEMPRE desta lista fixa.
const ORDENS = {
  recentes: 'v.ano DESC, v.id DESC',
  nome: 'v.nome ASC',
  ano: 'v.ano ASC, v.nome',
  nota: 'v.media IS NULL, v.media DESC, v.total_avaliacoes DESC',
  populares: 'v.total_avaliacoes DESC, v.media DESC',
};

// =====================================================================
// PÚBLICO
// =====================================================================

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
    // Os 3 géneros com mais títulos têm uma fila própria
    linhas(`SELECT g.id, g.nome, COUNT(*) AS n FROM generos g JOIN titulo_generos tg ON tg.genero_id = g.id
            GROUP BY g.id, g.nome ORDER BY n DESC, g.nome LIMIT 3`),
  ]);
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
    linhas(`SELECT a.id, a.nota, a.review, a.spoiler, a.criado_em, a.editado_em, u.id AS utilizador_id, u.nome, u.cor
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

// =====================================================================
// ADMINISTRAÇÃO (CRUD)  –  tudo o que está abaixo pede exigirAdmin
// =====================================================================

// Lê e valida os dados de um filme/série
function dadosTitulo(b) {
  const tipo = a.escolha(b.tipo, ['filme', 'serie'], 'Tipo');
  return {
    nome: a.texto(b.nome, 'Nome', 1, 150),
    tipo,
    ano: a.inteiro(b.ano, 'Ano', 1888, ANO_MAX),
    duracao_min: tipo === 'filme' ? a.inteiroOuNulo(b.duracao_min, 'Duração', 1, 1000) : null,
    idade: a.escolha(b.idade, ['M/3', 'M/6', 'M/12', 'M/14', 'M/16', 'M/18'], 'Classificação etária'),
    sinopse: a.texto(b.sinopse, 'Sinopse', 10, 3000),
    realizador: a.texto(b.realizador, 'Realizador / criador', 0, 100),
    cartaz: a.urlImagem(b.cartaz),
    fundo: a.urlImagem(b.fundo),
    em_curso: tipo === 'serie' && a.booleano(b.em_curso) ? 1 : 0,
    generos: Array.isArray(b.generos) ? b.generos.map(g => a.inteiro(g, 'Género', 1, MAX_ID)).slice(0, 10) : [],
  };
}

// Grava os géneros de um título (apaga os antigos e insere os novos)
async function gravarGeneros(ligacao, tituloId, generos) {
  await ligacao.execute('DELETE FROM titulo_generos WHERE titulo_id = ?', [tituloId]);
  for (const g of new Set(generos)) {
    await ligacao.execute('INSERT INTO titulo_generos (titulo_id, genero_id) VALUES (?, ?)', [tituloId, g]);
  }
}

// Executa uma função dentro de uma transação
async function emTransacao(funcao) {
  const ligacao = await pool.getConnection();
  try {
    await ligacao.beginTransaction();
    const resultado = await funcao(ligacao);
    await ligacao.commit();
    return resultado;
  } catch (erro) {
    await ligacao.rollback();
    throw erro;
  } finally {
    ligacao.release();
  }
}

// ---------------------------------------------------------------------
// Filmes e séries
// ---------------------------------------------------------------------
router.post('/', exigirAdmin, async (req, res) => {
  const d = dadosTitulo(req.body);
  const id = await emTransacao(async ligacao => {
    const [r] = await ligacao.execute(`INSERT INTO titulos (nome, tipo, ano, duracao_min, idade, sinopse, realizador, cartaz, fundo, em_curso)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [d.nome, d.tipo, d.ano, d.duracao_min, d.idade, d.sinopse, d.realizador, d.cartaz, d.fundo, d.em_curso]);
    await gravarGeneros(ligacao, r.insertId, d.generos);
    return r.insertId;
  });
  res.status(201).json({ id });
});

router.put('/:id', exigirAdmin, async (req, res) => {
  const id = a.inteiro(req.params.id, 'Título', 1, MAX_ID);
  if (!(await linha('SELECT id FROM titulos WHERE id = ?', [id]))) a.falha(404, 'Título não encontrado.');
  const d = dadosTitulo(req.body);
  await emTransacao(async ligacao => {
    await ligacao.execute(`UPDATE titulos SET nome = ?, tipo = ?, ano = ?, duracao_min = ?, idade = ?, sinopse = ?,
      realizador = ?, cartaz = ?, fundo = ?, em_curso = ? WHERE id = ?`,
      [d.nome, d.tipo, d.ano, d.duracao_min, d.idade, d.sinopse, d.realizador, d.cartaz, d.fundo, d.em_curso, id]);
    await gravarGeneros(ligacao, id, d.generos);
  });
  res.json({ ok: true });
});

router.delete('/:id', exigirAdmin, async (req, res) => {
  const id = a.inteiro(req.params.id, 'Título', 1, MAX_ID);
  await executar('DELETE FROM titulos WHERE id = ?', [id]);   // avaliações, listas, temporadas... em cascata
  res.json({ ok: true });
});

// ---------------------------------------------------------------------
// Géneros
// ---------------------------------------------------------------------
router.post('/generos', exigirAdmin, async (req, res) => {
  const nome = a.texto(req.body.nome, 'Género', 2, 40);
  if (await linha('SELECT id FROM generos WHERE nome = ?', [nome])) a.falha(400, 'Esse género já existe.');
  const r = await executar('INSERT INTO generos (nome) VALUES (?)', [nome]);
  res.status(201).json({ id: r.insertId });
});

router.delete('/generos/:id', exigirAdmin, async (req, res) => {
  await executar('DELETE FROM generos WHERE id = ?', [a.inteiro(req.params.id, 'Género', 1, MAX_ID)]);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------
// Pessoas (elenco e equipa)
// ---------------------------------------------------------------------
router.get('/pessoas/lista', exigirAdmin, async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 60);
  const pessoas = await linhas(`SELECT p.id, p.nome, p.foto, (SELECT COUNT(*) FROM titulo_pessoas tp WHERE tp.pessoa_id = p.id) AS n_titulos
    FROM pessoas p WHERE p.nome LIKE ? ORDER BY p.nome LIMIT 100`, [`%${q}%`]);
  res.json({ pessoas });
});

router.post('/pessoas', exigirAdmin, async (req, res) => {
  const nome = a.texto(req.body.nome, 'Nome', 2, 100);
  const r = await executar('INSERT INTO pessoas (nome, foto) VALUES (?, ?)', [nome, a.urlImagem(req.body.foto)]);
  res.status(201).json({ id: r.insertId });
});

router.delete('/pessoas/:id', exigirAdmin, async (req, res) => {
  await executar('DELETE FROM pessoas WHERE id = ?', [a.inteiro(req.params.id, 'Pessoa', 1, MAX_ID)]);
  res.json({ ok: true });
});

const FUNCOES = ['ator', 'realizacao', 'argumento', 'producao', 'musica'];

// Junta uma pessoa a um título. Se a pessoa ainda não existir (pelo nome), é criada.
router.post('/:id/pessoas', exigirAdmin, async (req, res) => {
  const id = a.inteiro(req.params.id, 'Título', 1, MAX_ID);
  const nome = a.texto(req.body.nome, 'Nome', 2, 100);
  const funcao = a.escolha(req.body.funcao, FUNCOES, 'Função');
  const personagem = funcao === 'ator' ? a.texto(req.body.personagem, 'Personagem', 0, 100) : '';
  const ordem = a.inteiroOuNulo(req.body.ordem, 'Ordem', 0, 999) || 0;

  let pessoa = await linha('SELECT id FROM pessoas WHERE nome = ?', [nome]);
  if (!pessoa) pessoa = { id: (await executar('INSERT INTO pessoas (nome) VALUES (?)', [nome])).insertId };
  await executar(`INSERT INTO titulo_pessoas (titulo_id, pessoa_id, funcao, personagem, ordem) VALUES (?, ?, ?, ?, ?)
                  ON DUPLICATE KEY UPDATE personagem = VALUES(personagem), ordem = VALUES(ordem)`, [id, pessoa.id, funcao, personagem, ordem]);
  res.status(201).json({ ok: true });
});

router.delete('/:id/pessoas/:pessoa/:funcao', exigirAdmin, async (req, res) => {
  await executar('DELETE FROM titulo_pessoas WHERE titulo_id = ? AND pessoa_id = ? AND funcao = ?', [
    a.inteiro(req.params.id, 'Título', 1, MAX_ID), a.inteiro(req.params.pessoa, 'Pessoa', 1, MAX_ID), a.escolha(req.params.funcao, FUNCOES, 'Função')]);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------
// Plataformas ("onde ver")
// ---------------------------------------------------------------------
function dadosPlataforma(b) {
  const cor = String(b.cor || '#888888');
  if (!/^#[0-9A-Fa-f]{6}$/.test(cor)) a.falha(400, 'Cor inválida (usa o formato #RRGGBB).');
  const url = String(b.url || '').trim();
  if (url && !/^https:\/\/\S+$/.test(url)) a.falha(400, 'O site tem de começar por https://');
  return { nome: a.texto(b.nome, 'Nome', 2, 40), cor, url: url.slice(0, 200), logo: a.urlImagem(b.logo) };
}

router.post('/plataformas', exigirAdmin, async (req, res) => {
  const d = dadosPlataforma(req.body);
  if (await linha('SELECT id FROM plataformas WHERE nome = ?', [d.nome])) a.falha(400, 'Essa plataforma já existe.');
  const r = await executar('INSERT INTO plataformas (nome, cor, url, logo) VALUES (?, ?, ?, ?)', [d.nome, d.cor, d.url, d.logo]);
  res.status(201).json({ id: r.insertId });
});

router.put('/plataformas/:id', exigirAdmin, async (req, res) => {
  const d = dadosPlataforma(req.body);
  await executar('UPDATE plataformas SET nome = ?, cor = ?, url = ?, logo = ? WHERE id = ?',
    [d.nome, d.cor, d.url, d.logo, a.inteiro(req.params.id, 'Plataforma', 1, MAX_ID)]);
  res.json({ ok: true });
});

router.delete('/plataformas/:id', exigirAdmin, async (req, res) => {
  await executar('DELETE FROM plataformas WHERE id = ?', [a.inteiro(req.params.id, 'Plataforma', 1, MAX_ID)]);
  res.json({ ok: true });
});

// Define onde se pode ver um título: lista [{ plataforma_id, link }]
router.put('/:id/plataformas', exigirAdmin, async (req, res) => {
  const id = a.inteiro(req.params.id, 'Título', 1, MAX_ID);
  const lista = Array.isArray(req.body.plataformas) ? req.body.plataformas.slice(0, 20) : [];
  const dados = lista.map(p => {
    const link = String(p.link || '').trim();
    if (link && !/^https:\/\/\S+$/.test(link)) a.falha(400, 'Os links têm de começar por https://');
    return { plataforma: a.inteiro(p.plataforma_id, 'Plataforma', 1, MAX_ID), link: link.slice(0, 255) };
  });
  await emTransacao(async ligacao => {
    await ligacao.execute('DELETE FROM titulo_plataformas WHERE titulo_id = ?', [id]);
    for (const p of dados) {
      await ligacao.execute('INSERT IGNORE INTO titulo_plataformas (titulo_id, plataforma_id, link) VALUES (?, ?, ?)', [id, p.plataforma, p.link]);
    }
  });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------
// Temporadas e episódios
// ---------------------------------------------------------------------
router.post('/:id/temporadas', exigirAdmin, async (req, res) => {
  const id = a.inteiro(req.params.id, 'Título', 1, MAX_ID);
  const t = await linha('SELECT tipo FROM titulos WHERE id = ?', [id]);
  if (!t || t.tipo !== 'serie') a.falha(400, 'Só as séries têm temporadas.');
  const numero = a.inteiro(req.body.numero, 'Número', 1, 100);
  if (await linha('SELECT id FROM temporadas WHERE titulo_id = ? AND numero = ?', [id, numero])) a.falha(400, 'Essa temporada já existe.');
  await executar('INSERT INTO temporadas (titulo_id, numero, ano, episodios) VALUES (?, ?, ?, ?)',
    [id, numero, a.inteiro(req.body.ano, 'Ano', 1888, ANO_MAX), a.inteiro(req.body.episodios, 'Episódios', 1, 500)]);
  res.status(201).json({ ok: true });
});

router.delete('/temporadas/:id', exigirAdmin, async (req, res) => {
  await executar('DELETE FROM temporadas WHERE id = ?', [a.inteiro(req.params.id, 'Temporada', 1, MAX_ID)]);
  res.json({ ok: true });
});

router.post('/temporadas/:id/episodios', exigirAdmin, async (req, res) => {
  const temporada = a.inteiro(req.params.id, 'Temporada', 1, MAX_ID);
  if (!(await linha('SELECT id FROM temporadas WHERE id = ?', [temporada]))) a.falha(404, 'Temporada não encontrada.');
  const numero = a.inteiro(req.body.numero, 'Número', 1, 500);
  if (await linha('SELECT id FROM episodios WHERE temporada_id = ? AND numero = ?', [temporada, numero])) a.falha(400, 'Esse episódio já existe.');
  const data = String(req.body.data_estreia || '').trim();
  if (data && !/^\d{4}-\d{2}-\d{2}$/.test(data)) a.falha(400, 'Data inválida.');
  await executar('INSERT INTO episodios (temporada_id, numero, nome, duracao_min, data_estreia) VALUES (?, ?, ?, ?, ?)',
    [temporada, numero, a.texto(req.body.nome, 'Nome do episódio', 1, 150), a.inteiroOuNulo(req.body.duracao_min, 'Duração', 1, 600), data || null]);
  // Mantém o total de episódios da temporada certo
  await executar('UPDATE temporadas SET episodios = GREATEST(episodios, (SELECT COUNT(*) FROM episodios WHERE temporada_id = ?)) WHERE id = ?', [temporada, temporada]);
  res.status(201).json({ ok: true });
});

router.delete('/episodios/:id', exigirAdmin, async (req, res) => {
  await executar('DELETE FROM episodios WHERE id = ?', [a.inteiro(req.params.id, 'Episódio', 1, MAX_ID)]);
  res.json({ ok: true });
});

module.exports = router;
