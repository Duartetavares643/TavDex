// =====================================================================
//  TavDex – middleware de autenticação e sessões
//  utilizadorAtual corre em todos os pedidos à API e põe em req.u o
//  utilizador com sessão iniciada (ou null).
//  exigirLogin / exigirAdmin protegem as rotas da API;
//  exigirLoginPagina protege as páginas (redireciona para o login).
//
//  Duração das sessões ("Manter sessão iniciada" no login):
//   · desligado: o cookie acaba ao fechar o browser e a sessão termina
//     depois de 12 horas sem atividade;
//   · ligado: a sessão dura 30 dias, renovados com a atividade, e nunca
//     mais de 90 dias no total.
// =====================================================================
const { linha, executar } = require('../db');
const { sha256, tokenAleatorio, ipDe, dispositivoDe, falha } = require('./ajudas');

// Opções do cookie da sessão. São as MESMAS no server.js (express-session) e no
// logout (res.clearCookie): se forem diferentes, o browser não apaga o cookie.
const HTTPS = (process.env.URL_SITE || '').startsWith('https');
const NOME_COOKIE = 'tavdex.sid';
const OPCOES_COOKIE = { path: '/', httpOnly: true, sameSite: 'lax', secure: HTTPS };

// Durações das sessões (ver o topo do ficheiro)
const HORAS_SEM_ATIVIDADE = 12;   // sem "Manter sessão": termina depois de 12 h sem atividade
const DIAS_MANTER = 30;           // com "Manter sessão": 30 dias, renovados com a atividade
const DIAS_MAXIMO = 90;           // ... mas nunca mais de 90 dias desde o login
const MS_MANTER = DIAS_MANTER * 24 * 60 * 60 * 1000;   // os 30 dias em milissegundos (para o cookie)

// Procura a sessão deste browser na tabela sessoes e diz se já expirou
async function procurarSessao(req) {
  const { uid, token } = req.session || {};
  if (!uid || !token) return null;
  return linha(`SELECT id, manter,
      (expira_em IS NOT NULL AND expira_em < NOW())                              AS expirou_data,
      (manter = 0 AND ultimo_acesso < NOW() - INTERVAL ${HORAS_SEM_ATIVIDADE} HOUR) AS expirou_inatividade,
      (criado_em < NOW() - INTERVAL ${DIAS_MAXIMO} DAY)                         AS expirou_maximo,
      (ultimo_acesso < NOW() - INTERVAL 5 MINUTE)                                AS renovar
    FROM sessoes WHERE token_hash = ? AND utilizador_id = ?`, [sha256(token), uid]);
}

// true se a sessão encontrada já expirou por um dos três motivos acima
const expirada = s => !!(s && (s.expirou_data || s.expirou_inatividade || s.expirou_maximo));

// Lê a sessão e confirma que:
//  1) a linha da sessão ainda existe na tabela sessoes (não foi terminada noutro dispositivo);
//  2) não expirou;
//  3) a conta existe e não está bloqueada.
async function utilizadorAtual(req, res, next) {
  req.u = null;
  if (!req.session || !req.session.uid || !req.session.token) return next();

  const sessao = await procurarSessao(req);
  if (expirada(sessao)) {
    // Expirou: passa a visitante e avisa no pedido seguinte (GET /api/auth/eu)
    await executar('DELETE FROM sessoes WHERE id = ?', [sessao.id]);
    delete req.session.uid;
    delete req.session.token;
    req.session.aviso = 'A tua sessão expirou. Inicia sessão outra vez.';
    return next();
  }

  const u = sessao ? await linha('SELECT * FROM utilizadores WHERE id = ?', [req.session.uid]) : null;
  if (!u || u.bloqueado) {
    // Sessão terminada (noutro dispositivo), conta apagada ou bloqueada: passa a visitante
    if (sessao) await executar('DELETE FROM sessoes WHERE id = ?', [sessao.id]);
    delete req.session.uid;
    delete req.session.token;
    if (!sessao) req.session.aviso = 'A tua sessão foi terminada. Inicia sessão outra vez.';
    return next();
  }

  // Atualiza a "última atividade" no máximo de 5 em 5 minutos (evita escrever em cada pedido).
  // Com "Manter sessão iniciada", os 30 dias recomeçam a contar (sem passar dos 90 no total).
  if (sessao.renovar) {
    await executar(`UPDATE sessoes SET ultimo_acesso = NOW(),
        expira_em = IF(manter = 1, LEAST(NOW() + INTERVAL ${DIAS_MANTER} DAY, criado_em + INTERVAL ${DIAS_MAXIMO} DAY), expira_em)
      WHERE id = ?`, [sessao.id]);
    if (sessao.manter) req.session.cookie.maxAge = MS_MANTER;   // o browser recebe o cookie com a data nova
    req.session.renovadaEm = Date.now();                        // marca a sessão como alterada (para ser guardada)
  }
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

// API: só deixa passar administradores
function exigirAdmin(req, res, next) {
  if (!req.u) falha(401, 'Inicia sessão para continuar.', { codigo: 'login_necessario' });
  if (req.u.papel !== 'admin') falha(403, 'Esta área é só para administradores.');
  next();
}

// Páginas privadas: sem sessão válida, vai para o login e guarda a página para voltar depois.
// "no-store": o browser não guarda a página, por isso o botão Retroceder depois de
// terminar sessão não mostra dados da conta.
// (Os dados verdadeiros são sempre protegidos pela API com exigirLogin.)
async function exigirLoginPagina(req, res, next) {
  res.set('Cache-Control', 'no-store');
  const sessao = await procurarSessao(req);
  if (sessao && !expirada(sessao)) return next();
  res.redirect('/login.html?voltar=' + encodeURIComponent(req.originalUrl));
}

// Inicia a sessão de um utilizador (depois de login, confirmação do email ou Google).
//  via    = 'palavra_passe' ou 'google' (aparece nas Sessões ativas)
//  manter = "Manter sessão iniciada" (30 dias) ou não (até fechar o browser / 12 horas sem atividade)
// Gera um ID de sessão novo (contra "session fixation") e grava a linha em sessoes.
function iniciarSessao(req, u, via = 'palavra_passe', manter = false) {
  return new Promise((resolve, reject) => {
    req.session.regenerate(async erro => {
      if (erro) return reject(erro);
      try {
        const token = tokenAleatorio();
        await executar(`INSERT INTO sessoes (utilizador_id, token_hash, dispositivo, ip, via, manter, expira_em)
          VALUES (?, ?, ?, ?, ?, ?, ${manter ? `NOW() + INTERVAL ${DIAS_MANTER} DAY` : 'NULL'})`,
          [u.id, sha256(token), dispositivoDe(req), ipDe(req), via, manter ? 1 : 0]);
        await executar('UPDATE utilizadores SET ultimo_login = NOW() WHERE id = ?', [u.id]);
        req.session.uid = u.id;
        req.session.token = token;
        // Cookie: 30 dias, ou "de sessão" (o browser apaga-o ao fechar)
        if (manter) req.session.cookie.maxAge = MS_MANTER;
        else req.session.cookie.expires = false;
        req.session.save(e => (e ? reject(e) : resolve()));
      } catch (e) { reject(e); }
    });
  });
}

// Termina a sessão atual (logout ou conta apagada):
//  1) apaga a linha em sessoes (a sessão deixa de valer em qualquer sítio);
//  2) destrói a sessão do Express (sessoes_express);
//  3) apaga o cookie no browser, com as mesmas opções com que foi criado.
// A mensagem para mostrar a seguir vai na resposta JSON (já não fica na sessão).
async function terminarSessao(req, res) {
  if (req.session && req.session.token) await executar('DELETE FROM sessoes WHERE token_hash = ?', [sha256(req.session.token)]);
  if (req.session) await new Promise(resolve => req.session.destroy(() => resolve()));
  res.clearCookie(NOME_COOKIE, OPCOES_COOKIE);
}

module.exports = {
  utilizadorAtual, exigirLogin, exigirAdmin, exigirLoginPagina, iniciarSessao, terminarSessao,
  NOME_COOKIE, OPCOES_COOKIE,
};
