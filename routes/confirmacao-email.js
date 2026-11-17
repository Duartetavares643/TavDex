// =====================================================================
//  TavDex – confirmação do email por link (registo e mudança de email)
//  Endereço base: /api/confirmacao
//   GET  /            estado da página "Confirma o teu email" (email escondido, segundos até poder reenviar)
//   POST /reenviar    enviar outro link (a conta da sessão, ou { email } com resposta sempre igual)
//   GET  /:token      o link é válido? (a página mostra o botão "Confirmar email")
//   POST /            { token } confirma o email (no registo também inicia sessão)
//
//  Segurança:
//   · o token tem 32 bytes aleatórios; na base de dados fica SÓ o hash SHA-256;
//   · vale 24 horas e só uma vez; um envio novo anula os links anteriores dessa conta;
//   · o link do email abre uma página com um botão: a confirmação é por POST, para os
//     antivírus de email que abrem os links sozinhos não gastarem o token;
//   · no máximo 5 envios por hora por conta, com 60 segundos entre envios.
// =====================================================================
const express = require('express');
const { linha, executar } = require('../db');
const a = require('./ajudas');
const { iniciarSessao } = require('./middleware');
const { enviarEmail, modeloEmail } = require('./email');

const router = express.Router();
const URL_SITE = process.env.URL_SITE || 'http://localhost:3000';
const MAX_POR_HORA = 5;
const ESPERA_SEGUNDOS = 60;
const MAX_POR_IP = 10;   // pedidos "com o email escrito" por IP numa hora

// ---------------------------------------------------------------------
// Pode enviar mais um link a esta conta? { pode, espera (segundos), motivo }
// ---------------------------------------------------------------------
async function limiteEnvios(uid) {
  const r = await linha(`SELECT COUNT(*) AS n, TIMESTAMPDIFF(SECOND, MAX(data_pedido), NOW()) AS desde
    FROM verificacao_email WHERE utilizador_id = ? AND data_pedido >= NOW() - INTERVAL 1 HOUR`, [uid]);
  if (r.n >= MAX_POR_HORA) return { pode: false, espera: 0, motivo: 'Já pediste 5 emails na última hora. Tenta mais tarde.' };
  if (r.desde !== null && r.desde < ESPERA_SEGUNDOS) {
    const espera = ESPERA_SEGUNDOS - r.desde;
    return { pode: false, espera, motivo: `Espera ${espera} segundos antes de pedir outro email.` };
  }
  return { pode: true, espera: 0 };
}

// ---------------------------------------------------------------------
// Cria um link novo (anula os anteriores dessa conta) e envia o email
//  tipo = 'registo' (confirmar a conta) ou 'mudanca' (confirmar o email novo)
// ---------------------------------------------------------------------
async function enviarConfirmacao(req, u, email, tipo = 'registo') {
  await executar('UPDATE verificacao_email SET usado = 1 WHERE utilizador_id = ? AND usado = 0', [u.id]);
  const token = a.tokenAleatorio();
  await executar(`INSERT INTO verificacao_email (utilizador_id, email, token, ip, expira_em)
    VALUES (?, ?, ?, ?, NOW() + INTERVAL 24 HOUR)`, [u.id, email, a.sha256(token), a.ipDe(req)]);

  const link = `${URL_SITE}/confirmar-email/${token}`;
  const nome = u.nome_exibicao || u.nome;
  const registo = tipo === 'registo';
  const titulo = registo ? 'Confirma o teu email' : 'Confirma o teu novo email';
  const paragrafos = registo
    ? [`Olá ${nome},`, `Obrigado por te juntares ao TavDex! Para ativar a tua conta (@${u.nome}), confirma que este email é teu.`,
      'O link é válido durante 24 horas e só pode ser usado uma vez.']
    : [`Olá ${nome},`, `Pediste para mudar o email da tua conta TavDex (@${u.nome}) para este endereço. Confirma que é teu para terminar a mudança.`,
      'O link é válido durante 24 horas e só pode ser usado uma vez.'];
  const nota = registo
    ? 'Se não criaste uma conta no TavDex, ignora este email.'
    : 'Se não pediste esta mudança, ignora este email: o email da conta continua igual.';
  await enviarEmail(email, `TavDex – ${titulo.toLowerCase()}`,
    `${paragrafos.join('\n\n')}\n\nAbre este link para confirmar:\n${link}\n\n${nota}`,
    modeloEmail({ titulo, paragrafos, botao: { texto: 'Confirmar email', url: link }, nota }));
}

// Conta "por confirmar" guardada na sessão depois do registo (ou de um login por confirmar)
async function contaDaSessao(req) {
  const id = req.session.porConfirmar;
  if (!id) return null;
  const u = await linha('SELECT * FROM utilizadores WHERE id = ?', [id]);
  return u && !u.email_verificado && !u.bloqueado ? u : null;
}

// ---------------------------------------------------------------------
// Página "Quase pronto! Enviámos um link para d•••••@gmail.com"
// ---------------------------------------------------------------------
router.get('/', async (req, res) => {
  const u = await contaDaSessao(req);
  if (!u) return res.json({ conta: false });
  const limite = await limiteEnvios(u.id);
  res.json({ conta: true, email: a.esconderEmail(u.email), espera: limite.espera });
});

// ---------------------------------------------------------------------
// Reenviar o email de confirmação
// ---------------------------------------------------------------------
const RESPOSTA_IGUAL = 'Se existir uma conta por confirmar com esse email, enviámos um link novo. Vê também a pasta de spam ou de promoções.';

router.post('/reenviar', async (req, res) => {
  const u = await contaDaSessao(req);
  if (!u) {
    // Sem conta na sessão (ex.: o link expirou e a pessoa escreve o email).
    // A resposta é SEMPRE igual, para não revelar que emails têm conta.
    const email = a.email(req.body.email);
    const porIp = await linha('SELECT COUNT(*) AS n FROM verificacao_email WHERE ip = ? AND data_pedido >= NOW() - INTERVAL 1 HOUR', [a.ipDe(req)]);
    const conta = porIp.n < MAX_POR_IP
      ? await linha('SELECT * FROM utilizadores WHERE email = ? AND email_verificado = 0 AND bloqueado = 0', [email])
      : null;
    if (conta && (await limiteEnvios(conta.id)).pode) await enviarConfirmacao(req, conta, conta.email, 'registo');
    return res.json({ ok: true, mensagem: RESPOSTA_IGUAL });
  }

  const limite = await limiteEnvios(u.id);
  if (!limite.pode) a.falha(429, limite.motivo, { codigo: 'espera' });
  await enviarConfirmacao(req, u, u.email, 'registo');
  await a.registarAtividade(req, u.id, 'confirmacao_reenviada', 'Email de confirmação reenviado');
  res.json({ ok: true, espera: ESPERA_SEGUNDOS, mensagem: `Enviámos um novo link para ${a.esconderEmail(u.email)}.` });
});

// ---------------------------------------------------------------------
// O link é válido? Devolve { p (pedido), u (conta), tipo } ou null
//  registo = o email do link é o da conta e ainda não está confirmado
//  mudanca = o email do link é o email pendente da conta
// (O token é procurado pelo hash: nunca se compara o token verdadeiro.)
// ---------------------------------------------------------------------
async function pedidoValido(token) {
  if (!/^[a-f0-9]{64}$/.test(String(token))) return null;
  const p = await linha('SELECT * FROM verificacao_email WHERE token = ? AND usado = 0 AND expira_em > NOW()', [a.sha256(token)]);
  if (!p) return null;
  const u = await linha('SELECT * FROM utilizadores WHERE id = ?', [p.utilizador_id]);
  if (!u || u.bloqueado) return null;
  let tipo = null;
  if (p.email === u.email && !u.email_verificado) tipo = 'registo';
  else if (u.email_pendente && p.email === u.email_pendente) tipo = 'mudanca';
  return tipo ? { p, u, tipo } : null;
}

router.get('/:token', async (req, res) => {
  const r = await pedidoValido(req.params.token);
  if (!r) return res.json({ valido: false });
  res.json({ valido: true, tipo: r.tipo, email: a.esconderEmail(r.p.email) });
});

// ---------------------------------------------------------------------
// Confirmar (POST, com CSRF)
// ---------------------------------------------------------------------
router.post('/', async (req, res) => {
  const r = await pedidoValido(req.body.token);
  if (!r) a.falha(400, 'Este link não é válido ou já expirou.', { codigo: 'link_invalido' });
  const { p, u, tipo } = r;
  // O link só serve uma vez (e os outros links desta conta deixam de servir)
  await executar('UPDATE verificacao_email SET usado = 1 WHERE utilizador_id = ?', [u.id]);

  if (tipo === 'registo') {
    await executar('UPDATE utilizadores SET email_verificado = 1 WHERE id = ?', [u.id]);
    await a.registarAtividade(req, u.id, 'email_confirmado', 'Email confirmado');
    // Inicia sessão neste browser (quem abriu o link tem acesso ao email)
    await iniciarSessao(req, u, 'palavra_passe');
    await a.registarAtividade(req, u.id, 'login', `Sessão iniciada depois de confirmar o email · ${a.dispositivoDe(req)}`);
    return res.json({ ok: true, tipo, mensagem: `Email confirmado! Bem-vindo ao TavDex, ${u.nome_exibicao || u.nome}.` });
  }

  // Mudança de email: volta a verificar que ninguém ficou entretanto com este email
  const novo = p.email;
  const antigo = u.email;
  if (await linha('SELECT id FROM utilizadores WHERE email = ? AND id <> ?', [novo, u.id])) {
    await executar('UPDATE utilizadores SET email_pendente = NULL WHERE id = ?', [u.id]);
    a.falha(409, 'Este email já está a ser usado por outra conta. Escolhe outro nas Definições.');
  }
  try {
    await executar('UPDATE utilizadores SET email = ?, email_pendente = NULL, email_verificado = 1 WHERE id = ?', [novo, u.id]);
  } catch (erro) {
    if (erro.code === 'ER_DUP_ENTRY') a.falha(409, 'Este email já está a ser usado por outra conta. Escolhe outro nas Definições.');
    throw erro;
  }
  await a.registarAtividade(req, u.id, 'email_alterado', `Email alterado de ${antigo} para ${novo}`);
  // Aviso para o email antigo (se não foi o dono, fica a saber)
  const nome = u.nome_exibicao || u.nome;
  await enviarEmail(antigo, 'TavDex – o email da tua conta foi alterado',
    `Olá ${nome},\n\nO email da tua conta TavDex (@${u.nome}) foi alterado para ${a.esconderEmail(novo)}.\nSe não foste tu, recupera a conta e contacta a administração do TavDex.`,
    modeloEmail({
      titulo: 'O email da tua conta foi alterado',
      paragrafos: [`Olá ${nome},`, `O email da tua conta TavDex (@${u.nome}) foi alterado para ${a.esconderEmail(novo)}.`],
      nota: 'Se não foste tu, recupera a conta e contacta a administração do TavDex.',
    }));
  res.json({ ok: true, tipo, mensagem: 'Email confirmado! O email da tua conta foi alterado.' });
});

// ---------------------------------------------------------------------
// Limpeza (ao arrancar e de 24 em 24 horas, no server.js):
// contas criadas com email e palavra-passe que nunca foram confirmadas em 7 dias
// são apagadas, para libertar o email e o @nome. Nunca apaga contas Google.
// ---------------------------------------------------------------------
async function limparContasPorConfirmar() {
  await executar(`DELETE FROM utilizadores
    WHERE email_verificado = 0 AND google_id IS NULL AND criado_em < NOW() - INTERVAL 7 DAY`);
  await executar('DELETE FROM verificacao_email WHERE expira_em < NOW() - INTERVAL 1 DAY');
}

module.exports = router;
module.exports.enviarConfirmacao = enviarConfirmacao;
module.exports.limiteEnvios = limiteEnvios;
module.exports.limparContasPorConfirmar = limparContasPorConfirmar;
