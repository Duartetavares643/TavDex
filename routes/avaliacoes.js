// =====================================================================
//  TavDex – avaliações, listas e recomendações (Fase 6)   Base: /api
//  PUT    /avaliacoes/titulo/:id    avaliar (1–5 estrelas + review opcional)
//  DELETE /avaliacoes/titulo/:id    apagar a minha avaliação desse título
//  DELETE /avaliacoes/:id           apagar uma avaliação (autor ou admin)
//  GET    /listas                   as minhas listas (favoritos, a ver, vistos)
//  POST   /listas/:id/:tipo         pôr / tirar um título de uma lista
//  GET    /recomendacoes            recomendações para mim
// =====================================================================
const express = require('express');
const { linha, executar } = require('../db');
const a = require('./ajudas');
const { exigirLogin } = require('./middleware');
const { listaDe, recomendacoes } = require('./consultas');

const router = express.Router();
const MAX_ID = 2147483647;

async function obterTitulo(id) {
  const t = await linha('SELECT id, nome FROM titulos WHERE id = ?', [a.inteiro(id, 'Título', 1, MAX_ID)]);
  if (!t) a.falha(404, 'Filme ou série não encontrado.');
  return t;
}

// ---------------------------------------------------------------------
// Avaliações (uma por utilizador e por título)
// ---------------------------------------------------------------------
router.put('/avaliacoes/titulo/:id', exigirLogin, async (req, res) => {
  const t = await obterTitulo(req.params.id);
  const nota = a.inteiro(req.body.nota, 'Classificação', 1, 5);
  const review = a.texto(req.body.review, 'Review', 0, 2000) || null;
  if (review && a.nLinks(review) > 2 && req.u.papel !== 'admin') a.falha(400, 'A review tem demasiados links (máximo 2).');
  const spoiler = review && a.booleano(req.body.spoiler) ? 1 : 0;

  const existe = await linha('SELECT id FROM avaliacoes WHERE utilizador_id = ? AND titulo_id = ?', [req.u.id, t.id]);
  if (existe) {
    await executar('UPDATE avaliacoes SET nota = ?, review = ?, spoiler = ?, editado_em = NOW() WHERE id = ?', [nota, review, spoiler, existe.id]);
  } else {
    await executar('INSERT INTO avaliacoes (utilizador_id, titulo_id, nota, review, spoiler) VALUES (?, ?, ?, ?, ?)',
      [req.u.id, t.id, nota, review, spoiler]);
    // Quem avalia já viu: marca como visto e tira da lista "a ver"
    await executar("INSERT IGNORE INTO listas (utilizador_id, titulo_id, tipo) VALUES (?, ?, 'visto')", [req.u.id, t.id]);
    await executar("DELETE FROM listas WHERE utilizador_id = ? AND titulo_id = ? AND tipo = 'ver'", [req.u.id, t.id]);
  }
  res.json({ ok: true, editada: !!existe });
});

router.delete('/avaliacoes/titulo/:id', exigirLogin, async (req, res) => {
  const t = await obterTitulo(req.params.id);
  await executar('DELETE FROM avaliacoes WHERE utilizador_id = ? AND titulo_id = ?', [req.u.id, t.id]);
  res.json({ ok: true });
});

router.delete('/avaliacoes/:id', exigirLogin, async (req, res) => {
  const id = a.inteiro(req.params.id, 'Avaliação', 1, MAX_ID);
  const av = await linha('SELECT utilizador_id FROM avaliacoes WHERE id = ?', [id]);
  if (!av) a.falha(404, 'Avaliação não encontrada.');
  if (av.utilizador_id !== req.u.id && req.u.papel !== 'admin') a.falha(403, 'Não podes apagar esta avaliação.');
  await executar('DELETE FROM avaliacoes WHERE id = ?', [id]);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------
// Listas pessoais: 'favorito', 'ver' (a ver) e 'visto'
// ---------------------------------------------------------------------
const TIPOS_LISTA = ['favorito', 'ver', 'visto'];

router.get('/listas', exigirLogin, async (req, res) => {
  const [favorito, ver, visto] = await Promise.all(TIPOS_LISTA.map(tipo => listaDe(req.u.id, tipo)));
  res.json({ favorito, ver, visto });
});

// Funciona como um interruptor: se já está na lista, sai; senão, entra
router.post('/listas/:id/:tipo', exigirLogin, async (req, res) => {
  const t = await obterTitulo(req.params.id);
  const tipo = a.escolha(req.params.tipo, TIPOS_LISTA, 'Lista');
  const esta = await linha('SELECT 1 FROM listas WHERE utilizador_id = ? AND titulo_id = ? AND tipo = ?', [req.u.id, t.id, tipo]);
  if (esta) {
    await executar('DELETE FROM listas WHERE utilizador_id = ? AND titulo_id = ? AND tipo = ?', [req.u.id, t.id, tipo]);
  } else {
    await executar('INSERT INTO listas (utilizador_id, titulo_id, tipo) VALUES (?, ?, ?)', [req.u.id, t.id, tipo]);
    // Marcar como visto tira da lista "a ver"
    if (tipo === 'visto') await executar("DELETE FROM listas WHERE utilizador_id = ? AND titulo_id = ? AND tipo = 'ver'", [req.u.id, t.id]);
  }
  res.json({ tipo, ativo: !esta });
});

// ---------------------------------------------------------------------
// Recomendações
// ---------------------------------------------------------------------
router.get('/recomendacoes', exigirLogin, async (req, res) => {
  res.json({ titulos: await recomendacoes(req.u.id, 24) });
});

module.exports = router;
