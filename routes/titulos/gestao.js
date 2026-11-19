// =====================================================================
//  TavDex – gestão do catálogo (só administradores)      Base: /api/titulos
//    POST /  ·  PUT /:id  ·  DELETE /:id                   filmes e séries
//    POST /generos  ·  DELETE /generos/:id                 géneros
//    GET /pessoas/lista?q=  ·  POST /pessoas  ·  DELETE /pessoas/:id
//    POST /:id/pessoas  ·  DELETE /:id/pessoas/:pessoa/:funcao   elenco e equipa
//    POST /plataformas  ·  PUT/DELETE /plataformas/:id
//    PUT /:id/plataformas                                  onde ver
//    POST /:id/temporadas  ·  DELETE /temporadas/:id
//    POST /temporadas/:id/episodios  ·  DELETE /episodios/:id
//  Todas as rotas usam exigirAdmin.
// =====================================================================
const express = require('express');
const { pool, linha, linhas, executar } = require('../../db');
const a = require('../ajudas');
const { exigirAdmin } = require('../middleware');

const router = express.Router();
const MAX_ID = 2147483647;   // maior valor de uma coluna INT (ids)
const ANO_MAX = new Date().getFullYear() + 5;   // ano mais alto aceite (estreias anunciadas)

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

// Editar um título (admin)
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

// Apagar um título (admin)
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

// Apagar um género (admin)
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

// Criar uma pessoa (ator, realizador, …) para o elenco (admin)
router.post('/pessoas', exigirAdmin, async (req, res) => {
  const nome = a.texto(req.body.nome, 'Nome', 2, 100);
  const r = await executar('INSERT INTO pessoas (nome, foto) VALUES (?, ?)', [nome, a.urlImagem(req.body.foto)]);
  res.status(201).json({ id: r.insertId });
});

// Apagar uma pessoa (admin)
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

// Tirar uma pessoa do elenco de um título (admin)
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

// Criar uma plataforma de streaming (admin)
router.post('/plataformas', exigirAdmin, async (req, res) => {
  const d = dadosPlataforma(req.body);
  if (await linha('SELECT id FROM plataformas WHERE nome = ?', [d.nome])) a.falha(400, 'Essa plataforma já existe.');
  const r = await executar('INSERT INTO plataformas (nome, cor, url, logo) VALUES (?, ?, ?, ?)', [d.nome, d.cor, d.url, d.logo]);
  res.status(201).json({ id: r.insertId });
});

// Editar uma plataforma (admin)
router.put('/plataformas/:id', exigirAdmin, async (req, res) => {
  const d = dadosPlataforma(req.body);
  await executar('UPDATE plataformas SET nome = ?, cor = ?, url = ?, logo = ? WHERE id = ?',
    [d.nome, d.cor, d.url, d.logo, a.inteiro(req.params.id, 'Plataforma', 1, MAX_ID)]);
  res.json({ ok: true });
});

// Apagar uma plataforma (admin)
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

// Apagar uma temporada e os seus episódios (admin)
router.delete('/temporadas/:id', exigirAdmin, async (req, res) => {
  await executar('DELETE FROM temporadas WHERE id = ?', [a.inteiro(req.params.id, 'Temporada', 1, MAX_ID)]);
  res.json({ ok: true });
});

// Acrescentar um episódio a uma temporada (admin)
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

// Apagar um episódio (admin)
router.delete('/episodios/:id', exigirAdmin, async (req, res) => {
  await executar('DELETE FROM episodios WHERE id = ?', [a.inteiro(req.params.id, 'Episódio', 1, MAX_ID)]);
  res.json({ ok: true });
});

module.exports = router;
