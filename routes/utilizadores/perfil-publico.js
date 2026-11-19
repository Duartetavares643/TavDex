// =====================================================================
//  TavDex – perfil público e seguidores (Passo 9)       Base: /api/utilizadores
//  GET    /?q=                    procurar utilizadores (chat, pesquisa)
//  GET    /:nome/seguidores       mais seguidores / a seguir ("Ver mais")
//  GET    /:nome                  perfil público
//  POST   /:id/seguir             seguir / deixar de seguir (também em POST /api/seguir/:id)
// =====================================================================
const express = require('express');
const { linha, linhas, executar } = require('../../db');
const a = require('../ajudas');
const { exigirLogin } = require('../middleware');
const { SQL_PROJETOS, listaDe, recomendacoes } = require('../consultas');

const router = express.Router();
const MAX_ID = 2147483647;   // maior valor de uma coluna INT (ids)
const COLUNAS = a.colunasPublicas('u');   // só as colunas que todos podem ver

// ---------------------------------------------------------------------
// Procurar utilizadores pelo nome
// ---------------------------------------------------------------------
router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim().replace(/^@/, '').slice(0, 40);
  if (q.length < 1) return res.json({ utilizadores: [] });
  const lista = await linhas(`SELECT ${COLUNAS} FROM utilizadores u
    WHERE (u.nome LIKE ? OR u.nome_exibicao LIKE ?) AND u.bloqueado = 0 ORDER BY u.nome LIMIT 20`, ['%' + q + '%', '%' + q + '%']);
  res.json({ utilizadores: lista });
});

// ---------------------------------------------------------------------
// Perfil público (qualquer visitante pode ver)
// ---------------------------------------------------------------------
// Seguidores ou "a seguir" de uma conta, 20 de cada vez ("Ver mais")
const POR_PAGINA_SEGUIDORES = 20;
// tipo = "seguidores" (quem segue a conta) ou "a_seguir" (quem a conta segue)
function listaSeguidores(id, tipo, pagina = 1) {
  const [juntar, filtrar] = tipo === 'seguidores' ? ['s.seguidor_id', 's.seguido_id'] : ['s.seguido_id', 's.seguidor_id'];
  const desde = (Math.max(1, pagina) - 1) * POR_PAGINA_SEGUIDORES;
  return linhas(`SELECT ${COLUNAS} FROM seguidores s JOIN utilizadores u ON u.id = ${juntar}
    WHERE ${filtrar} = ? ORDER BY s.criado_em DESC LIMIT ${POR_PAGINA_SEGUIDORES} OFFSET ${desde}`, [id]);
}

// Procura o perfil pelo @nome (sem distinguir maiúsculas: /perfil/duarte = @Duarte)
async function procurarPerfil(nome) {
  return linha(`SELECT id, nome, nome_exibicao, cor, tema_banner, foto_versao, banner_versao, papel, bio, localizacao, criado_em,
      mostrar_listas, mostrar_seguidores
    FROM utilizadores WHERE nome = ?`, [String(nome).replace(/^@/, '').slice(0, 40)]);
}

// @nome antigo (mudado há menos de 30 dias)? Devolve o @nome novo, ou null
async function nomeNovo(nomeAntigo) {
  const r = await linha(`SELECT u.nome FROM nomes_antigos n JOIN utilizadores u ON u.id = n.utilizador_id
    WHERE n.nome = ? AND n.data >= NOW() - INTERVAL 30 DAY`, [String(nomeAntigo).replace(/^@/, '').slice(0, 40)]);
  return r ? r.nome : null;
}

// Mais seguidores ou "a seguir" (botão "Ver mais"): ?tipo=seguidores|a_seguir&p=2
// Respeita a privacidade, tal como o perfil.
router.get('/:nome/seguidores', async (req, res) => {
  const p = await procurarPerfil(req.params.nome);
  if (!p) a.falha(404, 'Este perfil não existe.');
  const meu = !!req.u && req.u.id === p.id;
  if (!meu && !p.mostrar_seguidores) return res.json({ utilizadores: [], privado: true });
  const tipo = req.query.tipo === 'a_seguir' ? 'a_seguir' : 'seguidores';
  const pagina = Math.max(1, Math.min(500, Math.floor(Number(req.query.p)) || 1));
  res.json({ utilizadores: await listaSeguidores(p.id, tipo, pagina) });
});

// Perfil público: dados, números, listas, resumo e relação com quem está a ver
router.get('/:nome', async (req, res) => {
  const p = await procurarPerfil(req.params.nome);
  if (!p) {
    // @nome antigo: a página vai para o perfil novo
    const novo = await nomeNovo(req.params.nome);
    if (novo) return res.json({ redirecionar: novo });
    a.falha(404, 'Este perfil não existe.');
  }
  p.tema_banner = a.temaBanner(p.tema_banner);
  const id = p.id;
  const meu = !!req.u && req.u.id === id;
  // Privacidade escolhida nas Definições (o dono vê sempre tudo).
  // É a API que esconde: não chega esconder no browser.
  const verListas = meu || !!p.mostrar_listas;
  const verSeguidores = meu || !!p.mostrar_seguidores;

  const [nSeg, nASeg, seguidores, aSeguir, favoritos, paraVer, vistos, avaliacoes, projetos, generos, distribuicao, generosAvaliados, escolhidos, relacao] = await Promise.all([
    linha('SELECT COUNT(*) AS n FROM seguidores WHERE seguido_id = ?', [id]),
    linha('SELECT COUNT(*) AS n FROM seguidores WHERE seguidor_id = ?', [id]),
    verSeguidores ? listaSeguidores(id, 'seguidores') : [],
    verSeguidores ? listaSeguidores(id, 'a_seguir') : [],
    verListas ? listaDe(id, 'favorito') : [],
    verListas ? listaDe(id, 'ver') : [],
    listaDe(id, 'visto'),   // o número de vistos aparece sempre; a lista só com permissão
    linhas(`SELECT a.id, a.nota, a.review, a.spoiler, a.criado_em, t.id AS titulo_id, t.nome AS titulo
            FROM avaliacoes a JOIN titulos t ON t.id = a.titulo_id WHERE a.utilizador_id = ? ORDER BY a.criado_em DESC`, [id]),
    linhas(`${SQL_PROJETOS} WHERE p.dono_id = ? OR p.id IN (SELECT projeto_id FROM projeto_equipa WHERE utilizador_id = ?)
            ORDER BY p.criado_em DESC`, [id, id]),
    // Géneros preferidos: géneros dos favoritos e das avaliações com 4 ou 5 estrelas
    linhas(`SELECT g.nome, COUNT(*) AS n FROM generos g JOIN titulo_generos tg ON tg.genero_id = g.id
            WHERE tg.titulo_id IN (SELECT titulo_id FROM listas WHERE utilizador_id = ? AND tipo = 'favorito')
               OR tg.titulo_id IN (SELECT titulo_id FROM avaliacoes WHERE utilizador_id = ? AND nota >= 4)
            GROUP BY g.nome ORDER BY n DESC, g.nome LIMIT 5`, [id, id]),
    // Resumo: quantas avaliações de cada nota (1 a 5 estrelas)
    linhas('SELECT nota, COUNT(*) AS n FROM avaliacoes WHERE utilizador_id = ? GROUP BY nota', [id]),
    // Resumo: os 3 géneros que mais avalia
    linhas(`SELECT g.nome, COUNT(*) AS n FROM avaliacoes a JOIN titulo_generos tg ON tg.titulo_id = a.titulo_id
            JOIN generos g ON g.id = tg.genero_id WHERE a.utilizador_id = ? GROUP BY g.nome ORDER BY n DESC, g.nome LIMIT 3`, [id]),
    // Géneros favoritos escolhidos pela pessoa (etiquetas por baixo da biografia)
    linhas(`SELECT g.id, g.nome FROM utilizador_generos ug JOIN generos g ON g.id = ug.genero_id
            WHERE ug.utilizador_id = ? ORDER BY g.nome`, [id]),
    // Eu sigo esta pessoa? Ela segue-me? (independente da privacidade das listas)
    req.u ? linha(`SELECT EXISTS(SELECT 1 FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?) AS sigo,
                          EXISTS(SELECT 1 FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?) AS segue_me`,
      [req.u.id, id, id, req.u.id]) : null,
  ]);

  // Média das estrelas que dá e distribuição de 1 a 5
  const porNota = [1, 2, 3, 4, 5].map(n => Number((distribuicao.find(d => Number(d.nota) === n) || {}).n || 0));
  const total = porNota.reduce((s, n) => s + n, 0);
  const mediaNotas = total ? porNota.reduce((s, n, i) => s + n * (i + 1), 0) / total : null;

  // O dono vê tudo, mas com a nota "Só tu vês isto" nas listas que escondeu dos outros
  const privacidade = {
    listas: !verListas, seguidores: !verSeguidores,
    so_tu_listas: meu && !p.mostrar_listas, so_tu_seguidores: meu && !p.mostrar_seguidores,
  };
  delete p.mostrar_listas;
  delete p.mostrar_seguidores;
  res.json({
    perfil: p,
    meu,
    sigo: !!(relacao && relacao.sigo),
    segue_te: !meu && !!(relacao && relacao.segue_me),
    contagens: {
      seguidores: nSeg.n, a_seguir: nASeg.n, avaliacoes: avaliacoes.length,
      vistos: vistos.length, projetos: projetos.length,
    },
    // listas/seguidores = escondidos a quem vê (o dono escolheu não mostrar)
    privacidade,
    resumo: { media: mediaNotas, por_nota: porNota, generos: generosAvaliados, recentes: avaliacoes.slice(0, 5) },
    generos_escolhidos: escolhidos,
    seguidores, aSeguir, favoritos, paraVer,
    vistos: verListas ? vistos : [],
    avaliacoes, projetos, generos,
    por_pagina_seguidores: POR_PAGINA_SEGUIDORES,
    recomendados: meu ? await recomendacoes(id, 10) : [],
  });
});

// ---------------------------------------------------------------------
// Seguir / deixar de seguir (alterna). Devolve { a_seguir, seguidores }.
// ---------------------------------------------------------------------
async function seguir(req, res) {
  const id = a.inteiro(req.params.id, 'Utilizador', 1, MAX_ID);
  if (id === req.u.id) a.falha(400, 'Não te podes seguir a ti próprio.');
  const alvo = await linha('SELECT id FROM utilizadores WHERE id = ?', [id]);
  if (!alvo) a.falha(404, 'Este perfil não existe.');

  const jaSigo = await linha('SELECT 1 FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?', [req.u.id, id]);
  if (jaSigo) {
    await executar('DELETE FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?', [req.u.id, id]);
  } else {
    await executar('INSERT INTO seguidores (seguidor_id, seguido_id) VALUES (?, ?)', [req.u.id, id]);
    // Notificação (não é criada se a pessoa silenciou este tipo)
    await a.notificar(id, 'seguidor', `@${req.u.nome} começou a seguir-te.`, `perfil.html?u=${encodeURIComponent(req.u.nome)}`, req.u.id);
  }
  const n = await linha('SELECT COUNT(*) AS n FROM seguidores WHERE seguido_id = ?', [id]);
  res.json({ a_seguir: !jaSigo, sigo: !jaSigo, seguidores: n.n });
}
// Seguir / deixar de seguir (o mesmo que POST /api/seguir/:id)
router.post('/:id/seguir', exigirLogin, seguir);

module.exports = router;
module.exports.seguir = seguir;
module.exports.nomeNovo = nomeNovo;
