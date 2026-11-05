// =====================================================================
//  TavDex – autenticação (Fase 2)            Endereço base: /api/auth
//  GET  /eu               quem tem a sessão iniciada (ou null)
//  POST /registar         criar conta
//  POST /login            entrar com nome ou email + palavra-passe
//  POST /logout           terminar a sessão
//  POST /recuperar        pedir o link para repor a palavra-passe
//  POST /repor            definir a palavra-passe nova a partir do link
//  GET  /google           entrar (ou ligar a conta) com o Google
//  GET  /google/callback  o Google volta aqui depois do login
// =====================================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const { linha, executar } = require('../db');
const a = require('./ajudas');
const { iniciarSessao, terminarSessao } = require('./middleware');
const { enviarEmail } = require('./email');

const router = express.Router();
const URL_SITE = process.env.URL_SITE || 'http://localhost:3000';

// Regras do nome de utilizador: 3 a 20 letras, números, _ ou .
const REGRA_NOME = /^[A-Za-z0-9_.]{3,20}$/;

// Os hashes criados pelo PHP começam por $2y$; o algoritmo é o mesmo do $2a$
// do bcryptjs, por isso basta trocar o prefixo antes de comparar.
function compararPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(password, hash.replace(/^\$2y\$/, '$2a$'));
}

// Hash de uma palavra-passe qualquer, só para comparar quando a conta não existe
const HASH_FALSO = bcrypt.hashSync('conta-que-nao-existe', 10);

// Valida a palavra-passe nova (o bcrypt só usa os primeiros 72 caracteres)
function validarPassword(p) {
  return a.texto(p, 'Palavra-passe', 8, 72);
}

// Só aceita voltar para páginas do próprio site (ex.: "/titulo.html?id=3")
function voltarSeguro(v) {
  return typeof v === 'string' && v.startsWith('/') && !v.startsWith('//') ? v : '/';
}

// ---------------------------------------------------------------------
// Quem sou eu? (usado pela barra de navegação em todas as páginas)
// ---------------------------------------------------------------------
router.get('/eu', async (req, res) => {
  if (!req.u) return res.json({ u: null });
  const n = await linha('SELECT COUNT(*) AS n FROM notificacoes WHERE utilizador_id = ? AND lida = 0', [req.u.id]);
  res.json({ u: { ...a.publico(req.u), por_ler: n.n } });
});

// ---------------------------------------------------------------------
// Registo
// ---------------------------------------------------------------------
router.post('/registar', async (req, res) => {
  // Campo-armadilha: as pessoas não o veem, os robôs preenchem-no
  if (req.body.website) a.falha(400, 'Pedido inválido.');

  const nome = a.texto(req.body.nome, 'Nome de utilizador', 3, 20);
  if (!REGRA_NOME.test(nome)) a.falha(400, 'O nome de utilizador só pode ter letras, números, _ e .');
  const email = a.email(req.body.email);
  const password = validarPassword(req.body.password);

  if (await linha('SELECT id FROM utilizadores WHERE nome = ?', [nome])) a.falha(400, 'Esse nome de utilizador já existe.');
  if (await linha('SELECT id FROM utilizadores WHERE email = ?', [email])) a.falha(400, 'Já existe uma conta com esse email.');

  // Anti-spam: no máximo 20 contas novas em 10 minutos no site todo
  const recentes = await linha('SELECT COUNT(*) AS n FROM utilizadores WHERE criado_em >= NOW() - INTERVAL 10 MINUTE');
  if (recentes.n >= 20) a.falha(429, 'Muitos registos neste momento. Tenta daqui a uns minutos.');

  const hash = await bcrypt.hash(password, 10);
  const cor = Math.floor(Math.random() * 360);
  const r = await executar('INSERT INTO utilizadores (nome, email, password_hash, cor) VALUES (?, ?, ?, ?)', [nome, email, hash, cor]);

  const u = { id: r.insertId, nome, cor, papel: 'utilizador' };
  await iniciarSessao(req, u);
  await a.registarAtividade(req, u.id, 'registo');
  res.status(201).json({ u: a.publico(u) });
});

// ---------------------------------------------------------------------
// Login (com bloqueio após 5 falhas em 15 minutos)
// ---------------------------------------------------------------------
router.post('/login', async (req, res) => {
  const login = a.texto(req.body.login, 'Nome ou email', 1, 120);
  const password = a.texto(req.body.password, 'Palavra-passe', 1, 200);
  const ip = a.ipDe(req);

  const u = await linha('SELECT * FROM utilizadores WHERE nome = ? OR email = ?', [login, login.toLowerCase()]);
  // As falhas contam-se por conta (pelo email) e por IP
  const chave = u ? u.email : login.toLowerCase();

  const porConta = await linha('SELECT COUNT(*) AS n FROM tentativas_login WHERE email = ? AND criado_em >= NOW() - INTERVAL 15 MINUTE', [chave]);
  const porIp = await linha('SELECT COUNT(*) AS n FROM tentativas_login WHERE ip = ? AND criado_em >= NOW() - INTERVAL 15 MINUTE', [ip]);
  if (porConta.n >= 5 || porIp.n >= 20) {
    a.falha(429, 'Demasiadas tentativas falhadas. Espera 15 minutos ou recupera a palavra-passe.');
  }

  // Mesmo sem conta compara com um hash falso, para a resposta demorar o mesmo
  // tempo (assim não se descobre que contas existem pelo tempo de resposta)
  const certa = await compararPassword(password, u && u.password_hash ? u.password_hash : HASH_FALSO) && !!u?.password_hash;
  if (!u || !certa) {
    await executar('INSERT INTO tentativas_login (email, ip) VALUES (?, ?)', [chave, ip]);
    if (u) await a.registarAtividade(req, u.id, 'login_falhado');
    const restam = Math.max(0, 4 - porConta.n);
    a.falha(400, 'Dados de acesso errados.' + (restam <= 2 ? ` Restam ${restam} tentativa(s).` : ''));
  }
  if (u.bloqueado) a.falha(403, 'Esta conta foi bloqueada por um administrador.');

  // Login certo: limpa as falhas desta conta e inicia a sessão
  await executar('DELETE FROM tentativas_login WHERE email = ?', [chave]);
  await iniciarSessao(req, u);
  await a.registarAtividade(req, u.id, 'login');
  res.json({ u: a.publico(u) });
});

// ---------------------------------------------------------------------
// Logout (por POST, com token CSRF, para nenhum site de fora o conseguir fazer)
// ---------------------------------------------------------------------
router.post('/logout', async (req, res) => {
  if (req.u) await a.registarAtividade(req, req.u.id, 'logout');
  await terminarSessao(req);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------
// Recuperação da palavra-passe
// ---------------------------------------------------------------------
router.post('/recuperar', async (req, res) => {
  const email = a.email(req.body.email);
  const resposta = { ok: true, mensagem: 'Se existir uma conta com esse email, enviámos um link para repor a palavra-passe.' };

  const u = await linha('SELECT id, nome, bloqueado FROM utilizadores WHERE email = ?', [email]);
  // A resposta é sempre igual, para não revelar que emails têm conta
  if (!u || u.bloqueado) return res.json(resposta);

  // No máximo 3 pedidos em 15 minutos por conta (o link dura 30 min)
  const pedidos = await linha('SELECT COUNT(*) AS n FROM recuperacoes WHERE utilizador_id = ? AND expira_em > NOW() + INTERVAL 15 MINUTE', [u.id]);
  if (pedidos.n >= 3) return res.json(resposta);

  const token = a.tokenAleatorio();
  await executar('INSERT INTO recuperacoes (utilizador_id, token_hash, expira_em) VALUES (?, ?, NOW() + INTERVAL 30 MINUTE)',
    [u.id, a.sha256(token)]);
  await enviarEmail(email, 'TavDex – repor a palavra-passe',
    `Olá ${u.nome},\n\nPara definires uma palavra-passe nova abre este link (válido durante 30 minutos):\n` +
    `${URL_SITE}/repor.html?token=${token}\n\nSe não foste tu a pedir, ignora este email.`);
  res.json(resposta);
});

router.post('/repor', async (req, res) => {
  const token = a.texto(req.body.token, 'Link', 64, 64);
  const password = validarPassword(req.body.password);

  const pedido = await linha('SELECT * FROM recuperacoes WHERE token_hash = ? AND usado = 0 AND expira_em > NOW()', [a.sha256(token)]);
  if (!pedido) a.falha(400, 'O link é inválido ou já expirou. Pede um novo.');

  const hash = await bcrypt.hash(password, 10);
  await executar('UPDATE utilizadores SET password_hash = ? WHERE id = ?', [hash, pedido.utilizador_id]);
  // O link só se usa uma vez, e todas as sessões abertas terminam
  await executar('UPDATE recuperacoes SET usado = 1 WHERE utilizador_id = ?', [pedido.utilizador_id]);
  await executar('DELETE FROM sessoes WHERE utilizador_id = ?', [pedido.utilizador_id]);
  await executar('DELETE FROM tentativas_login WHERE email = (SELECT email FROM utilizadores WHERE id = ?)', [pedido.utilizador_id]);
  await a.registarAtividade(req, pedido.utilizador_id, 'palavra_passe_reposta');
  res.json({ ok: true });
});

// ---------------------------------------------------------------------
// Login com o Google (OAuth 2.0)
// ---------------------------------------------------------------------
function clienteGoogle() {
  return new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, `${URL_SITE}/api/auth/google/callback`);
}

// Passo 1: manda o utilizador para a página de login do Google
router.get('/google', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) return res.redirect('/login.html?erro=' + encodeURIComponent('O login com o Google não está configurado.'));
  const estado = a.tokenAleatorio();   // protege contra pedidos forjados (CSRF no OAuth)
  req.session.google = {
    estado,
    voltar: voltarSeguro(req.query.voltar),
    ligar: req.query.ligar === '1' && req.u ? req.u.id : null,   // ligar a uma conta que já tem sessão
  };
  const url = clienteGoogle().generateAuthUrl({ scope: ['openid', 'email', 'profile'], state: estado, prompt: 'select_account' });
  req.session.save(() => res.redirect(url));
});

// Passo 2: o Google devolve um código, que trocamos pelos dados da conta
router.get('/google/callback', async (req, res) => {
  const pedido = req.session.google;
  delete req.session.google;
  const erro = msg => res.redirect('/login.html?erro=' + encodeURIComponent(msg));
  if (!pedido || req.query.state !== pedido.estado || !req.query.code) return erro('O login com o Google falhou. Tenta outra vez.');

  let dados;
  try {
    const cliente = clienteGoogle();
    const { tokens } = await cliente.getToken(String(req.query.code));
    const bilhete = await cliente.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
    dados = bilhete.getPayload();   // sub = id da conta Google, email, email_verified, name
  } catch (e) {
    return erro('Não foi possível confirmar a conta Google.');
  }
  const googleId = String(dados.sub);
  const googleEmail = String(dados.email || '').toLowerCase();

  // a) Ligar o Google a uma conta que já tem sessão (página Definições)
  if (pedido.ligar) {
    const outra = await linha('SELECT id FROM utilizadores WHERE google_id = ? AND id <> ?', [googleId, pedido.ligar]);
    if (outra) return res.redirect('/definicoes.html?erro=' + encodeURIComponent('Essa conta Google já está ligada a outro utilizador.'));
    await executar('UPDATE utilizadores SET google_id = ?, google_email = ? WHERE id = ?', [googleId, googleEmail, pedido.ligar]);
    await a.registarAtividade(req, pedido.ligar, 'google_ligado');
    return res.redirect('/definicoes.html?ok=' + encodeURIComponent('Conta Google ligada.'));
  }

  // b) Já existe uma conta ligada a este Google?
  let u = await linha('SELECT * FROM utilizadores WHERE google_id = ?', [googleId]);

  // c) Existe uma conta com o mesmo email? Liga as duas (só se o Google confirmou o email)
  if (!u && googleEmail && dados.email_verified) {
    u = await linha('SELECT * FROM utilizadores WHERE email = ?', [googleEmail]);
    if (u) {
      await executar('UPDATE utilizadores SET google_id = ?, google_email = ? WHERE id = ?', [googleId, googleEmail, u.id]);
      await a.registarAtividade(req, u.id, 'google_ligado');
    }
  }

  // d) Senão, cria uma conta nova (sem palavra-passe)
  if (!u) {
    if (!googleEmail || !dados.email_verified) return erro('A conta Google não tem um email confirmado.');
    let base = googleEmail.split('@')[0].replace(/[^A-Za-z0-9_.]/g, '').slice(0, 16);
    if (base.length < 3) base = 'user' + base;
    let nome = base;
    for (let i = 2; await linha('SELECT id FROM utilizadores WHERE nome = ?', [nome]); i++) nome = base + i;
    const cor = Math.floor(Math.random() * 360);
    const r = await executar('INSERT INTO utilizadores (nome, email, google_id, google_email, cor) VALUES (?, ?, ?, ?, ?)',
      [nome, googleEmail, googleId, googleEmail, cor]);
    u = await linha('SELECT * FROM utilizadores WHERE id = ?', [r.insertId]);
    await a.registarAtividade(req, u.id, 'registo_google');
  }

  if (u.bloqueado) return erro('Esta conta foi bloqueada por um administrador.');
  await iniciarSessao(req, u);
  await a.registarAtividade(req, u.id, 'login_google');
  res.redirect(pedido.voltar);
});

module.exports = router;
