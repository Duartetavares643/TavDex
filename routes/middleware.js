// =====================================================================
//  TavDex – middleware de autenticação
//  utilizadorAtual corre em TODOS os pedidos e põe em req.u o utilizador
//  com sessão iniciada (ou null). exigirLogin e exigirAdmin protegem rotas.
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
    // Sessão terminada, conta apagada ou bloqueada: perde a sessão
    if (sessao) await executar('DELETE FROM sessoes WHERE id = ?', [sessao.id]);
    delete req.session.uid;
    delete req.session.token;
    return next();
  }

  // Atualiza o "último acesso" no máximo de 5 em 5 minutos (evita escrever em cada pedido)
  await executar('UPDATE sessoes SET ultimo_acesso = NOW() WHERE id = ? AND ultimo_acesso < NOW() - INTERVAL 5 MINUTE', [sessao.id]);
  req.u = u;
  req.sessaoId = sessao.id;
  next();
}

// Só deixa passar quem tem sessão iniciada
function exigirLogin(req, res, next) {
  if (!req.u) falha(401, 'Inicia sessão para continuar.');
  next();
}

// Só deixa passar administradores
function exigirAdmin(req, res, next) {
  if (!req.u) falha(401, 'Inicia sessão para continuar.');
  if (req.u.papel !== 'admin') falha(403, 'Esta área é só para administradores.');
  next();
}

// Inicia a sessão de um utilizador (depois de login, registo ou Google).
// Gera uma sessão nova (contra "session fixation") e grava a linha em sessoes.
function iniciarSessao(req, u) {
  return new Promise((resolve, reject) => {
    req.session.regenerate(async erro => {
      if (erro) return reject(erro);
      try {
        const token = tokenAleatorio();
        await executar('INSERT INTO sessoes (utilizador_id, token_hash, dispositivo, ip) VALUES (?, ?, ?, ?)',
          [u.id, sha256(token), dispositivoDe(req), ipDe(req)]);
        req.session.uid = u.id;
        req.session.token = token;
        req.session.save(e => (e ? reject(e) : resolve()));
      } catch (e) { reject(e); }
    });
  });
}

// Termina a sessão atual (logout)
async function terminarSessao(req) {
  if (req.session.token) await executar('DELETE FROM sessoes WHERE token_hash = ?', [sha256(req.session.token)]);
  await new Promise(resolve => req.session.destroy(() => resolve()));
}

module.exports = { utilizadorAtual, exigirLogin, exigirAdmin, iniciarSessao, terminarSessao };
