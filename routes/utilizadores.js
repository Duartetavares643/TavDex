// =====================================================================
//  TavDex – utilizadores, seguidores e definições (Fase 2)
//  Endereço base: /api/utilizadores
//  GET    /?q=                    procurar utilizadores (chat, pesquisa)
//  GET    /eu/definicoes          dados da página Definições
//  PUT    /eu/perfil              alterar perfil
//  PUT    /eu/email               mudar email
//  PUT    /eu/password            alterar ou definir palavra-passe
//  DELETE /eu/google              desligar a conta Google
//  DELETE /eu/sessoes/:id         terminar uma sessão noutro dispositivo
//  DELETE /eu/sessoes             terminar todas as outras sessões
//  DELETE /eu                     apagar a conta
//  GET    /:nome                  perfil público
//  POST   /:id/seguir             seguir / deixar de seguir
// =====================================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const { linha, linhas, executar } = require('../db');
const a = require('./ajudas');
const { exigirLogin, terminarSessao } = require('./middleware');
const { enviarEmail } = require('./email');
const { SQL_PROJETOS, listaDe, recomendacoes } = require('./consultas');

const router = express.Router();
const REGRA_NOME = /^[A-Za-z0-9_.]{3,20}$/;

function compararPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(password, hash.replace(/^\$2y\$/, '$2a$'));
}

// Pede a palavra-passe atual antes de mudanças sensíveis (se a conta tiver uma)
async function confirmarPassword(u, password) {
  if (!u.password_hash) return;
  if (!(await compararPassword(String(password || ''), u.password_hash))) a.falha(400, 'A palavra-passe atual está errada.');
}

// ---------------------------------------------------------------------
// Procurar utilizadores pelo nome
// ---------------------------------------------------------------------
router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 40);
  if (q.length < 1) return res.json({ utilizadores: [] });
  const lista = await linhas(`SELECT id, nome, cor, papel FROM utilizadores
    WHERE nome LIKE ? AND bloqueado = 0 ORDER BY nome LIMIT 20`, ['%' + q + '%']);
  res.json({ utilizadores: lista });
});

// ---------------------------------------------------------------------
// Definições (só o próprio)
// ---------------------------------------------------------------------
router.get('/eu/definicoes', exigirLogin, async (req, res) => {
  const u = req.u;
  const sessoes = await linhas(`SELECT id, dispositivo, ip, criado_em, ultimo_acesso FROM sessoes
    WHERE utilizador_id = ? ORDER BY ultimo_acesso DESC`, [u.id]);
  sessoes.forEach(s => { s.atual = s.id === req.sessaoId; });
  const atividade = await linhas(`SELECT tipo, ip, dispositivo, criado_em FROM atividade_conta
    WHERE utilizador_id = ? ORDER BY criado_em DESC LIMIT 15`, [u.id]);
  const silenciadas = (await linhas('SELECT tipo FROM notif_silenciadas WHERE utilizador_id = ?', [u.id])).map(r => r.tipo);
  res.json({
    nome: u.nome, email: u.email, bio: u.bio, localizacao: u.localizacao, cor: u.cor,
    notif_email: !!u.notif_email, tem_password: !!u.password_hash, google_email: u.google_id ? u.google_email : null,
    sessoes, atividade, silenciadas,
  });
});

router.put('/eu/perfil', exigirLogin, async (req, res) => {
  const nome = a.texto(req.body.nome, 'Nome de utilizador', 3, 20);
  if (!REGRA_NOME.test(nome)) a.falha(400, 'O nome de utilizador só pode ter letras, números, _ e .');
  const outro = await linha('SELECT id FROM utilizadores WHERE nome = ? AND id <> ?', [nome, req.u.id]);
  if (outro) a.falha(400, 'Esse nome de utilizador já existe.');
  const cor = a.inteiro(req.body.cor, 'Cor', 0, 359);
  const localizacao = a.texto(req.body.localizacao, 'Localização', 0, 40);
  const bio = a.texto(req.body.bio, 'Bio', 0, 160);
  const notifEmail = a.booleano(req.body.notif_email) ? 1 : 0;

  await executar('UPDATE utilizadores SET nome = ?, cor = ?, localizacao = ?, bio = ?, notif_email = ? WHERE id = ?',
    [nome, cor, localizacao, bio, notifEmail, req.u.id]);
  res.json({ ok: true, nome });
});

router.put('/eu/email', exigirLogin, async (req, res) => {
  const novo = a.email(req.body.email);
  await confirmarPassword(req.u, req.body.password);
  if (novo === req.u.email) a.falha(400, 'Esse já é o teu email.');
  if (await linha('SELECT id FROM utilizadores WHERE email = ?', [novo])) a.falha(400, 'Já existe uma conta com esse email.');

  await executar('UPDATE utilizadores SET email = ? WHERE id = ?', [novo, req.u.id]);
  await a.registarAtividade(req, req.u.id, 'email_alterado');
  // Aviso para o email antigo (se não foi o dono, fica a saber)
  await enviarEmail(req.u.email, 'TavDex – o teu email foi alterado',
    `Olá ${req.u.nome},\n\nO email da tua conta TavDex foi alterado para ${novo}.\nSe não foste tu, recupera a conta e contacta um administrador.`);
  res.json({ ok: true });
});

router.put('/eu/password', exigirLogin, async (req, res) => {
  await confirmarPassword(req.u, req.body.atual);
  const nova = a.texto(req.body.nova, 'Palavra-passe nova', 8, 72);
  const hash = await bcrypt.hash(nova, 10);
  await executar('UPDATE utilizadores SET password_hash = ? WHERE id = ?', [hash, req.u.id]);
  // Por segurança, termina as sessões dos outros dispositivos
  await executar('DELETE FROM sessoes WHERE utilizador_id = ? AND id <> ?', [req.u.id, req.sessaoId]);
  await a.registarAtividade(req, req.u.id, req.u.password_hash ? 'palavra_passe_alterada' : 'palavra_passe_definida');
  res.json({ ok: true });
});

router.delete('/eu/google', exigirLogin, async (req, res) => {
  // Sem palavra-passe, a conta ficava sem forma de entrar
  if (!req.u.password_hash) a.falha(400, 'Define primeiro uma palavra-passe, senão ficas sem forma de entrar.');
  await executar('UPDATE utilizadores SET google_id = NULL, google_email = NULL WHERE id = ?', [req.u.id]);
  await a.registarAtividade(req, req.u.id, 'google_desligado');
  res.json({ ok: true });
});

router.delete('/eu/sessoes/:id', exigirLogin, async (req, res) => {
  const id = a.inteiro(req.params.id, 'Sessão', 1, 2147483647);
  if (id === req.sessaoId) a.falha(400, 'Para terminar esta sessão usa "Terminar sessão".');
  await executar('DELETE FROM sessoes WHERE id = ? AND utilizador_id = ?', [id, req.u.id]);
  res.json({ ok: true });
});

router.delete('/eu/sessoes', exigirLogin, async (req, res) => {
  await executar('DELETE FROM sessoes WHERE utilizador_id = ? AND id <> ?', [req.u.id, req.sessaoId]);
  await a.registarAtividade(req, req.u.id, 'sessoes_terminadas');
  res.json({ ok: true });
});

router.delete('/eu', exigirLogin, async (req, res) => {
  // Para confirmar, o utilizador escreve o seu @nome
  const confirmacao = String(req.body.confirmacao || '').trim().replace(/^@/, '');
  if (confirmacao !== req.u.nome) a.falha(400, 'Escreve o teu @nome para confirmar.');
  if (req.u.papel === 'admin') {
    const admins = await linha("SELECT COUNT(*) AS n FROM utilizadores WHERE papel = 'admin'");
    if (admins.n <= 1) a.falha(400, 'És o único administrador: nomeia outro antes de apagar a conta.');
  }
  // As tabelas ligadas têm ON DELETE CASCADE, por isso apaga tudo do utilizador
  await executar('DELETE FROM utilizadores WHERE id = ?', [req.u.id]);
  await terminarSessao(req);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------
// Perfil público (qualquer visitante pode ver)
// ---------------------------------------------------------------------
router.get('/:nome', async (req, res) => {
  const p = await linha('SELECT id, nome, cor, papel, bio, localizacao, criado_em FROM utilizadores WHERE nome = ?', [String(req.params.nome)]);
  if (!p) a.falha(404, 'Utilizador não encontrado.');
  const id = p.id;
  const meu = !!req.u && req.u.id === id;

  const [seguidores, aSeguir, favoritos, paraVer, vistos, avaliacoes, projetos, generos] = await Promise.all([
    linhas(`SELECT u.id, u.nome, u.cor, u.papel FROM seguidores s JOIN utilizadores u ON u.id = s.seguidor_id
            WHERE s.seguido_id = ? ORDER BY s.criado_em DESC`, [id]),
    linhas(`SELECT u.id, u.nome, u.cor, u.papel FROM seguidores s JOIN utilizadores u ON u.id = s.seguido_id
            WHERE s.seguidor_id = ? ORDER BY s.criado_em DESC`, [id]),
    listaDe(id, 'favorito'),
    listaDe(id, 'ver'),
    listaDe(id, 'visto'),
    linhas(`SELECT a.id, a.nota, a.review, a.spoiler, a.criado_em, t.id AS titulo_id, t.nome AS titulo
            FROM avaliacoes a JOIN titulos t ON t.id = a.titulo_id WHERE a.utilizador_id = ? ORDER BY a.criado_em DESC`, [id]),
    linhas(`${SQL_PROJETOS} WHERE p.dono_id = ? OR p.id IN (SELECT projeto_id FROM projeto_equipa WHERE utilizador_id = ?)
            ORDER BY p.criado_em DESC`, [id, id]),
    // Géneros preferidos: géneros dos favoritos e das avaliações com 4 ou 5 estrelas
    linhas(`SELECT g.nome, COUNT(*) AS n FROM generos g JOIN titulo_generos tg ON tg.genero_id = g.id
            WHERE tg.titulo_id IN (SELECT titulo_id FROM listas WHERE utilizador_id = ? AND tipo = 'favorito')
               OR tg.titulo_id IN (SELECT titulo_id FROM avaliacoes WHERE utilizador_id = ? AND nota >= 4)
            GROUP BY g.nome ORDER BY n DESC, g.nome LIMIT 5`, [id, id]),
  ]);

  res.json({
    perfil: p,
    meu,
    sigo: !!req.u && seguidores.some(s => s.id === req.u.id),
    seguidores, aSeguir, favoritos, paraVer, vistos, avaliacoes, projetos, generos,
    recomendados: meu ? await recomendacoes(id, 10) : [],
  });
});

// ---------------------------------------------------------------------
// Seguir / deixar de seguir
// ---------------------------------------------------------------------
router.post('/:id/seguir', exigirLogin, async (req, res) => {
  const id = a.inteiro(req.params.id, 'Utilizador', 1, 2147483647);
  if (id === req.u.id) a.falha(400, 'Não te podes seguir a ti próprio.');
  const alvo = await linha('SELECT id FROM utilizadores WHERE id = ?', [id]);
  if (!alvo) a.falha(404, 'Utilizador não encontrado.');

  const jaSigo = await linha('SELECT 1 FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?', [req.u.id, id]);
  if (jaSigo) {
    await executar('DELETE FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?', [req.u.id, id]);
  } else {
    await executar('INSERT INTO seguidores (seguidor_id, seguido_id) VALUES (?, ?)', [req.u.id, id]);
    await a.notificar(id, 'seguidor', `${req.u.nome} começou a seguir-te.`, `perfil.html?u=${encodeURIComponent(req.u.nome)}`, req.u.id);
  }
  res.json({ sigo: !jaSigo });
});

module.exports = router;
