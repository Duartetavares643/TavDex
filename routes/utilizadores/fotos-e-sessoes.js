// =====================================================================
//  TavDex – foto de perfil, imagem do banner e sessões ativas   Base: /api/utilizadores
//  POST   /eu/foto                carregar a foto (multipart, campo "foto")
//  DELETE /eu/foto                remover a foto
//  POST   /eu/banner              carregar a imagem do banner (multipart, campo "banner")
//  DELETE /eu/banner              remover a imagem do banner
//  DELETE /eu/sessoes/:id         terminar uma sessão noutro dispositivo
//  DELETE /eu/sessoes             terminar todas as outras sessões
//  GET    /:id/foto               a foto de perfil (JPEG, pública)
//  GET    /:id/banner             a imagem do banner (JPEG, pública)
// =====================================================================
const express = require('express');
const { linha, executar } = require('../../db');
const a = require('../ajudas');
const { exigirLogin } = require('../middleware');
const { receberFoto, processarFoto, receberBanner, processarBanner } = require('../fotos');

const router = express.Router();
const MAX_ID = 2147483647;   // maior valor de uma coluna INT (ids)

// Foto de perfil: validada pelo conteúdo, recortada e reduzida a 256×256 JPEG
router.post('/eu/foto', exigirLogin, receberFoto, async (req, res) => {
  const foto = await processarFoto(req.file && req.file.buffer);
  const versao = Math.floor(Date.now() / 1000);
  // A foto antiga é substituída (apagada) pela nova
  await executar('UPDATE utilizadores SET foto = ?, foto_versao = ? WHERE id = ?', [foto, versao, req.u.id]);
  res.json({ ok: true, foto_versao: versao, mensagem: 'Foto atualizada.' });
});

// Remover a foto (volta a aparecer a inicial com a cor do avatar)
router.delete('/eu/foto', exigirLogin, async (req, res) => {
  await executar('UPDATE utilizadores SET foto = NULL, foto_versao = 0 WHERE id = ?', [req.u.id]);
  res.json({ ok: true, mensagem: 'Foto removida.' });
});

// Banner com uma imagem própria: validada pelo conteúdo e guardada em 1500×500 JPEG.
// Enquanto houver imagem, ela aparece no lugar do cenário desenhado.
router.post('/eu/banner', exigirLogin, receberBanner, async (req, res) => {
  const banner = await processarBanner(req.file && req.file.buffer);
  const versao = Math.floor(Date.now() / 1000);
  await executar('UPDATE utilizadores SET banner = ?, banner_versao = ? WHERE id = ?', [banner, versao, req.u.id]);
  res.json({ ok: true, banner_versao: versao, mensagem: 'Banner atualizado.' });
});

// Remover a imagem do banner (volta ao cenário escolhido)
router.delete('/eu/banner', exigirLogin, async (req, res) => {
  await executar('UPDATE utilizadores SET banner = NULL, banner_versao = 0 WHERE id = ?', [req.u.id]);
  res.json({ ok: true, mensagem: 'Imagem do banner removida.' });
});

// Terminar uma sessão noutro dispositivo
router.delete('/eu/sessoes/:id', exigirLogin, async (req, res) => {
  const id = a.inteiro(req.params.id, 'Sessão', 1, MAX_ID);
  if (id === req.sessaoId) a.falha(400, 'Para terminar esta sessão usa "Terminar sessão".');
  // "AND utilizador_id = ?": ninguém consegue terminar sessões de outra pessoa
  const s = await linha('SELECT dispositivo FROM sessoes WHERE id = ? AND utilizador_id = ?', [id, req.u.id]);
  if (!s) a.falha(404, 'Essa sessão já não existe.');
  await executar('DELETE FROM sessoes WHERE id = ? AND utilizador_id = ?', [id, req.u.id]);
  await a.registarAtividade(req, req.u.id, 'sessao_terminada', `Sessão terminada noutro dispositivo (${s.dispositivo})`);
  res.json({ ok: true });
});

// Terminar todas as sessões menos esta
router.delete('/eu/sessoes', exigirLogin, async (req, res) => {
  await executar('DELETE FROM sessoes WHERE utilizador_id = ? AND id <> ?', [req.u.id, req.sessaoId]);
  await a.registarAtividade(req, req.u.id, 'sessoes_terminadas', 'Sessões terminadas noutros dispositivos');
  res.json({ ok: true });
});

// ---------------------------------------------------------------------
// Foto de perfil (pública). O ?v= muda quando a foto muda, por isso o
// browser pode guardá-la em cache durante muito tempo.
// ---------------------------------------------------------------------
router.get('/:id/foto', async (req, res) => {
  const id = a.inteiro(req.params.id, 'Utilizador', 1, MAX_ID);
  const r = await linha('SELECT foto FROM utilizadores WHERE id = ?', [id]);
  if (!r || !r.foto) return res.status(404).end();
  res.set('Content-Type', 'image/jpeg');
  res.set('Cache-Control', req.query.v ? 'public, max-age=31536000, immutable' : 'no-cache');
  res.send(r.foto);
});

// Imagem do banner (pública), com a mesma cache da foto
router.get('/:id/banner', async (req, res) => {
  const id = a.inteiro(req.params.id, 'Utilizador', 1, MAX_ID);
  const r = await linha('SELECT banner FROM utilizadores WHERE id = ?', [id]);
  if (!r || !r.banner) return res.status(404).end();
  res.set('Content-Type', 'image/jpeg');
  res.set('Cache-Control', req.query.v ? 'public, max-age=31536000, immutable' : 'no-cache');
  res.send(r.banner);
});

module.exports = router;
