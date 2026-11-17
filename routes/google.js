// =====================================================================
//  TavDex – login com o Google (OAuth 2.0 "authorization code" com PKCE)
//  Endereço base: /api/auth/google
//    GET /?voltar=/caminho       entrar ou criar conta com o Google
//    GET /?modo=ligar            ligar o Google à conta com sessão (Definições)
//    GET /callback               o Google volta aqui com um código
//  E também (montado no server.js):
//    POST /api/conta/google/desligar
//
//  Como funciona:
//   1. Mandamos o utilizador para a página de login do Google com um "state"
//      aleatório (contra pedidos forjados) e um "code_challenge" (PKCE).
//   2. O Google devolve um "code". Só o servidor o troca por um token,
//      enviando o segredo e o "code_verifier" (o código não serve a mais ninguém).
//   3. Com o token pedimos os dados da conta (sub, email, nome, foto).
//  Não se usa nenhuma biblioteca do Google: são só pedidos com fetch.
// =====================================================================
const crypto = require('crypto');
const express = require('express');
const { linha, executar } = require('../db');
const a = require('./ajudas');
const { iniciarSessao, exigirLogin } = require('./middleware');
const { fotoDoGoogle } = require('./fotos');

const router = express.Router();
const URL_SITE = process.env.URL_SITE || 'http://localhost:3000';

const URL_AUTORIZAR = 'https://accounts.google.com/o/oauth2/v2/auth';
const URL_TOKEN = 'https://oauth2.googleapis.com/token';
const URL_DADOS = 'https://openidconnect.googleapis.com/v1/userinfo';
const VALIDADE_PEDIDO = 10 * 60 * 1000;   // o utilizador tem 10 minutos para escolher a conta

const NAO_CONFIGURADO = 'O login com Google ainda não foi configurado.';
const SUSPENSA = 'Esta conta foi suspensa. Contacta a administração do TavDex.';

// O Google está configurado no .env?
function googleConfigurado() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

// Tem de ser EXATAMENTE igual ao URI registado na Google Cloud Console
function redirectUri() {
  return process.env.GOOGLE_REDIRECT_URI || `${URL_SITE}/api/auth/google/callback`;
}

// Base64 "seguro para URLs" (sem + / =), usado no PKCE
function base64url(bytes) {
  return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Junta uma mensagem (?ok= ou ?erro=) a um caminho interno
function comMensagem(caminho, tipo, mensagem) {
  const url = new URL(caminho, 'http://x');
  url.searchParams.set(tipo, mensagem);
  return url.pathname + url.search + url.hash;
}

// ---------------------------------------------------------------------
// Passo 1: mandar o utilizador para o Google
// ---------------------------------------------------------------------
router.get('/', (req, res) => {
  const modo = req.query.modo === 'ligar' || req.query.ligar === '1' ? 'ligar' : 'entrar';
  const voltar = a.voltarSeguro(req.query.voltar);

  if (!googleConfigurado()) {
    return res.redirect(modo === 'ligar'
      ? comMensagem('/definicoes.html?tab=seguranca', 'erro', NAO_CONFIGURADO)
      : comMensagem(`/login.html?voltar=${encodeURIComponent(voltar)}`, 'erro', NAO_CONFIGURADO));
  }
  // Para ligar é preciso ter sessão iniciada
  if (modo === 'ligar' && !req.u) return res.redirect('/login.html?voltar=' + encodeURIComponent('/definicoes.html?tab=seguranca'));

  const state = crypto.randomBytes(32).toString('hex');
  const verifier = base64url(crypto.randomBytes(32));                                  // PKCE: segredo deste pedido
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());   // PKCE: o que o Google recebe

  // manter = "Manter sessão iniciada" (a página envia a última escolha feita no login, ?manter=1)
  req.session.google = {
    state, verifier, modo, voltar, uid: modo === 'ligar' ? req.u.id : null, criado: Date.now(),
    manter: a.booleano(req.query.manter),
  };

  const parametros = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',   // mostra sempre a lista de contas Google
  });
  // Ao ligar uma conta Gmail, a página do Google já vem com esse email escolhido
  if (modo === 'ligar' && /@(gmail|googlemail)\.com$/i.test(req.u.email)) parametros.set('login_hint', req.u.email);

  req.session.save(() => res.redirect(`${URL_AUTORIZAR}?${parametros}`));
});

// ---------------------------------------------------------------------
// Passo 2: o Google volta com um código
// ---------------------------------------------------------------------
router.get('/callback', async (req, res) => {
  const pedido = req.session.google;
  delete req.session.google;   // o "state" só se usa uma vez

  const ligar = pedido && pedido.modo === 'ligar';
  const voltarComErro = mensagem => res.redirect(ligar
    ? comMensagem('/definicoes.html?tab=seguranca', 'erro', mensagem)
    : comMensagem(`/login.html?voltar=${encodeURIComponent(pedido ? pedido.voltar : '/')}`, 'erro', mensagem));

  // O utilizador carregou em "Cancelar" na página do Google
  if (req.query.error === 'access_denied') {
    return voltarComErro('Cancelaste o login com o Google. Podes tentar outra vez ou entrar com a palavra-passe.');
  }
  if (req.query.error) {
    console.error('Erro devolvido pelo Google:', req.query.error);
    return voltarComErro('O login com o Google falhou. Tenta outra vez.');
  }

  // Confirma o state (comparação em tempo constante) e a validade do pedido
  const state = String(req.query.state || '');
  const stateCerto = pedido && state.length === pedido.state.length &&
    crypto.timingSafeEqual(Buffer.from(state), Buffer.from(pedido.state));
  if (!stateCerto || !req.query.code || Date.now() - pedido.criado > VALIDADE_PEDIDO) {
    return voltarComErro('O pedido expirou. Tenta outra vez.');
  }
  if (!googleConfigurado()) return voltarComErro(NAO_CONFIGURADO);

  // Troca o código pelo token (só no servidor, com o segredo e o code_verifier)
  let dados;
  try {
    const respostaToken = await fetch(URL_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(req.query.code),
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri(),
        grant_type: 'authorization_code',
        code_verifier: pedido.verifier,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const token = await respostaToken.json();
    if (!respostaToken.ok) throw new Error(`token: ${token.error} ${token.error_description || ''}`);

    // Pede os dados da conta: sub (id), email, email_verified, name, picture
    const respostaDados = await fetch(URL_DADOS, {
      headers: { Authorization: `Bearer ${token.access_token}` },
      signal: AbortSignal.timeout(10000),
    });
    dados = await respostaDados.json();
    if (!respostaDados.ok || !dados.sub) throw new Error('userinfo: ' + JSON.stringify(dados));
  } catch (erro) {
    // O erro verdadeiro vai para a consola (ex.: redirect_uri_mismatch, invalid_client)
    console.error('Erro no login com o Google:', erro.message);
    return voltarComErro('Não foi possível confirmar a conta Google. Tenta outra vez.');
  }

  if (!dados.email_verified) return voltarComErro('Essa conta Google não tem o email confirmado.');
  const googleId = String(dados.sub).slice(0, 50);
  const googleEmail = String(dados.email || '').toLowerCase().slice(0, 120);

  // -------------------------------------------------------------------
  // Modo "ligar" (vindo das Definições, com sessão iniciada)
  // -------------------------------------------------------------------
  if (ligar) {
    if (!req.u || req.u.id !== pedido.uid) return res.redirect('/login.html?voltar=' + encodeURIComponent('/definicoes.html?tab=seguranca'));
    const outra = await linha('SELECT id FROM utilizadores WHERE google_id = ? AND id <> ?', [googleId, req.u.id]);
    if (outra) return voltarComErro('Essa conta Google já está ligada a outra conta TavDex.');
    await executar('UPDATE utilizadores SET google_id = ?, google_email = ? WHERE id = ?', [googleId, googleEmail, req.u.id]);
    await a.registarAtividade(req, req.u.id, 'google_ligado', `Conta Google ligada: ${googleEmail}`);
    return res.redirect(comMensagem('/definicoes.html?tab=seguranca', 'ok', 'Conta Google ligada.'));
  }

  // -------------------------------------------------------------------
  // Modo "entrar": os 3 casos
  // -------------------------------------------------------------------
  let u = await linha('SELECT * FROM utilizadores WHERE google_id = ?', [googleId]);
  let mensagem;
  let caso;

  if (u) {
    // Caso 1: esta conta Google já está ligada a uma conta TavDex
    caso = 1;
    mensagem = `Entraste com o Google como @${u.nome}.`;
  } else {
    u = await linha('SELECT * FROM utilizadores WHERE email = ?', [googleEmail]);
    if (u) {
      // Caso 2: já existe uma conta com o mesmo email -> liga as duas
      caso = 2;
      if (u.bloqueado) return voltarComErro(SUSPENSA);
      if (!u.email_verificado) {
        // Segurança: o email nunca tinha sido confirmado, por isso alguém pode ter
        // registado o email de outra pessoa. Apaga a palavra-passe antiga e termina
        // todas as sessões dessa conta: a partir de agora só o dono do Gmail entra.
        await executar('UPDATE utilizadores SET password_hash = NULL WHERE id = ?', [u.id]);
        await executar('DELETE FROM sessoes WHERE utilizador_id = ?', [u.id]);
      }
      await executar('UPDATE utilizadores SET google_id = ?, google_email = ?, email_verificado = 1 WHERE id = ?',
        [googleId, googleEmail, u.id]);
      await a.registarAtividade(req, u.id, 'google_ligado', 'Conta Google ligada automaticamente (mesmo email)');
      u = await linha('SELECT * FROM utilizadores WHERE id = ?', [u.id]);
      mensagem = `A tua conta Google foi ligada à conta @${u.nome}.`;
    } else {
      // Caso 3: não existe -> cria a conta (sem palavra-passe)
      caso = 3;
      let base = googleEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 26);
      if (base.length < 3) base = ('user' + base).slice(0, 26);
      // Primeiro @nome livre (nem de outra conta, nem reservado como "admin", nem @ antigo de alguém)
      let nome = base;
      for (let i = 2; await a.nomeIndisponivel(nome); i++) nome = base + i;
      const nomeExibicao = String(dados.name || nome).trim().slice(0, 50) || nome;
      const foto = await fotoDoGoogle(dados.picture);

      const r = await executar(`INSERT INTO utilizadores
          (nome, nome_exibicao, email, email_verificado, google_id, google_email, cor, foto, foto_versao)
          VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?)`,
        [nome, nomeExibicao, googleEmail, googleId, googleEmail, a.corAleatoria(), foto, foto ? Math.floor(Date.now() / 1000) : 0]);
      u = await linha('SELECT * FROM utilizadores WHERE id = ?', [r.insertId]);
      await a.registarAtividade(req, u.id, 'registo_google', 'Conta criada com o Google');
      mensagem = `Conta criada com o Google. Bem-vindo, ${nomeExibicao}! Podes mudar o teu @nome nas Definições.`;
    }
  }

  if (u.bloqueado) return voltarComErro(SUSPENSA);

  await iniciarSessao(req, u, 'google', !!pedido.manter);
  if (caso !== 3) await a.registarAtividade(req, u.id, 'login_google', `Sessão iniciada com o Google · ${a.dispositivoDe(req)}`);
  res.redirect(comMensagem(pedido.voltar, 'ok', mensagem));
});

// ---------------------------------------------------------------------
// Desligar o Google (Definições → Contas ligadas)
// ---------------------------------------------------------------------
async function desligarGoogle(req, res) {
  if (!req.u.google_id) a.falha(400, 'A tua conta não tem o Google ligado.');
  // Sem palavra-passe e sem Google, a conta ficava sem forma de entrar
  if (!req.u.password_hash) a.falha(400, 'Define primeiro uma palavra-passe. Sem ela e sem o Google ficavas sem forma de entrar.');
  await executar('UPDATE utilizadores SET google_id = NULL, google_email = NULL WHERE id = ?', [req.u.id]);
  await a.registarAtividade(req, req.u.id, 'google_desligado', `Conta Google desligada: ${req.u.google_email || ''}`);
  res.json({ ok: true, mensagem: 'Conta Google desligada.' });
}

const conta = express.Router();
conta.post('/google/desligar', exigirLogin, desligarGoogle);

module.exports = router;
module.exports.conta = conta;                 // montado em /api/conta
module.exports.desligarGoogle = desligarGoogle;
module.exports.googleConfigurado = googleConfigurado;
