// =====================================================================
//  TavDex – middleware de autenticação
//  utilizadorAtual corre em todos os pedidos à API e põe em req.u o
//  utilizador com sessão iniciada (ou null).
//  exigirLogin / exigirAdmin protegem as rotas da API;
//  exigirLoginPagina protege as páginas (redireciona para o login).
// =====================================================================
const { linha, executar } = require('../db');
const { sha256, tokenAleatorio, ipDe, dispositivoDe, falha } = require('./ajudas');

// Lê a sessão e confirma que:
//  1) a linha da sessão ainda existe na tabela sessoes (não foi terminada noutro dispositivo);
//  2) a conta existe e não está bloqueada.
async function utilizadorAtual(req, res, next) {
  req.u = null;
  const { uid, token } = req.session;
  if (!uid || !token) return next();

  const sessao = await linha('SELECT id FROM sessoes WHERE token_hash = ? AND utilizador_id = ?', [sha256(token), uid]);
  const u = sessao ? await linha('SELECT * FROM utilizadores WHERE id = ?', [uid]) : null;

  if (!u || u.bloqueado) {
    // Sessão terminada (noutro dispositivo), conta apagada ou bloqueada: passa a visitante
    if (sessao) await executar('DELETE FROM sessoes WHERE id = ?', [sessao.id]);
    delete req.session.uid;
    delete req.session.token;
    if (!sessao) req.session.aviso = 'A tua sessão foi terminada. Inicia sessão outra vez.';
    return next();
  }

  // Atualiza a "última atividade" no máximo de 5 em 5 minutos (evita escrever em cada pedido)
  await executar('UPDATE sessoes SET ultimo_acesso = NOW() WHERE id = ? AND ultimo_acesso < NOW() - INTERVAL 5 MINUTE', [sessao.id]);
  req.u = u;
  req.sessaoId = sessao.id;
  next();
}

// API: só deixa passar quem tem sessão iniciada.
// Responde 401 { erro: 'login_necessario', mensagem } e a página abre a janela "Inicia sessão para continuar".
function exigirLogin(req, res, next) {
  if (!req.u) falha(401, 'Inicia sessão para continuar.', { codigo: 'login_necessario' });
  next();
}
const exigirLoginApi = exigirLogin;   // o mesmo, com o nome usado no anteprojeto

// API: só deixa passar administradores
function exigirAdmin(req, res, next) {
  if (!req.u) falha(401, 'Inicia sessão para continuar.', { codigo: 'login_necessario' });
  if (req.u.papel !== 'admin') falha(403, 'Esta área é só para administradores.');
  next();
}

// Páginas: sem sessão, vai para o login e guarda a página para voltar depois.
// (Como as páginas são ficheiros HTML, aqui só se verifica se há sessão no cookie;
//  os dados verdadeiros são sempre protegidos pela API com exigirLogin.)
async function exigirLoginPagina(req, res, next) {
  const { uid, token } = req.session || {};
  const valida = uid && token && await linha('SELECT id FROM sessoes WHERE token_hash = ? AND utilizador_id = ?', [sha256(token), uid]);
  if (valida) return next();
  res.redirect('/login.html?voltar=' + encodeURIComponent(req.originalUrl));
}

// Inicia a sessão de um utilizador (depois de login, registo ou Google).
//  via = 'palavra_passe' ou 'google' (aparece nas Sessões ativas)
// Gera um ID de sessão novo (contra "session fixation") e grava a linha em sessoes.
function iniciarSessao(req, u, via = 'palavra_passe') {
  return new Promise((resolve, reject) => {
    req.session.regenerate(async erro => {
      if (erro) return reject(erro);
      try {
        const token = tokenAleatorio();
        await executar('INSERT INTO sessoes (utilizador_id, token_hash, dispositivo, ip, via) VALUES (?, ?, ?, ?, ?)',
          [u.id, sha256(token), dispositivoDe(req), ipDe(req), via]);
        await executar('UPDATE utilizadores SET ultimo_login = NOW() WHERE id = ?', [u.id]);
        req.session.uid = u.id;
        req.session.token = token;
        req.session.save(e => (e ? reject(e) : resolve()));
      } catch (e) { reject(e); }
    });
  });
}

// Termina a sessão atual (logout). Uma mensagem opcional fica para a próxima página.
async function terminarSessao(req, aviso = null) {
  if (req.session.token) await executar('DELETE FROM sessoes WHERE token_hash = ?', [sha256(req.session.token)]);
  await new Promise(resolve => req.session.regenerate(() => resolve()));
  if (aviso) {
    req.session.aviso = aviso;
    await new Promise(resolve => req.session.save(() => resolve()));
  }
}

module.exports = { utilizadorAtual, exigirLogin, exigirLoginApi, exigirAdmin, exigirLoginPagina, iniciarSessao, terminarSessao };
