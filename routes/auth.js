// =====================================================================
//  TavDex – autenticação (Passos 5 a 8)       Endereço base: /api/auth
//  GET  /eu               quem tem a sessão iniciada (ou null) + avisos pendentes
//  POST /registar         criar conta
//  POST /login            entrar com @nome ou email + palavra-passe
//  POST /logout           terminar a sessão
//  POST /recuperar        pedir o link para repor a palavra-passe
//  GET  /repor/:token     o link ainda é válido?
//  POST /repor            definir a palavra-passe nova a partir do link
//  O login com o Google está em routes/google.js (/api/auth/google).
// =====================================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const { linha, executar } = require('../db');
const a = require('./ajudas');
const { iniciarSessao, terminarSessao } = require('./middleware');
const { enviarEmail, modeloEmail } = require('./email');

const router = express.Router();
const URL_SITE = process.env.URL_SITE || 'http://localhost:3000';

// Regras do @nome: 3 a 30 letras, números, _ ou .
const REGRA_NOME = /^[A-Za-z0-9_.]{3,30}$/;

// Os hashes criados pelo PHP começam por $2y$; o algoritmo é o mesmo do $2a$
// do bcryptjs, por isso basta trocar o prefixo antes de comparar.
function compararPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(password, hash.replace(/^\$2y\$/, '$2a$'));
}

// Hash de uma palavra-passe qualquer, só para comparar quando a conta não existe
const HASH_FALSO = bcrypt.hashSync('conta-que-nao-existe', 10);

// Palavra-passe nova: 8 a 72 caracteres (o bcrypt só usa os primeiros 72), com letras e números
function validarPassword(p, nome = 'Palavra-passe') {
  const t = String(p ?? '');
  if (t.length < 8) a.falha(400, `${nome}: mínimo de 8 caracteres.`);
  if (t.length > 72) a.falha(400, `${nome}: máximo de 72 caracteres.`);
  if (!/[A-Za-zÀ-ÿ]/.test(t) || !/[0-9]/.test(t)) a.falha(400, `${nome}: tem de ter letras e números.`);
  return t;
}

// @nome: tira o "@" do início e valida
function validarNome(valor) {
  const nome = a.texto(String(valor ?? '').trim().replace(/^@/, ''), 'Nome de utilizador', 3, 30);
  if (!REGRA_NOME.test(nome)) a.falha(400, 'O @nome só pode ter letras, números, _ e .');
  return nome;
}

// ---------------------------------------------------------------------
// Quem sou eu? (usado pela barra de navegação em todas as páginas)
// Também entrega, uma vez, o aviso guardado na sessão (ex.: "Sessão terminada…").
// ---------------------------------------------------------------------
router.get('/eu', async (req, res) => {
  const aviso = req.session.aviso || null;
  if (aviso) delete req.session.aviso;
  // google = o login com o Google está configurado? (senão os botões avisam em vez de dar erro)
  const google = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  if (!req.u) return res.json({ u: null, aviso, google });
  const n = await linha('SELECT COUNT(*) AS n FROM notificacoes WHERE utilizador_id = ? AND lida = 0', [req.u.id]);
  res.json({ u: { ...a.publico(req.u), por_ler: n.n }, aviso, google });
});

// ---------------------------------------------------------------------
// Registo (Passo 5) – devolve todos os erros juntos: { erros: { campo: mensagem } }
// ---------------------------------------------------------------------
router.post('/registar', async (req, res) => {
  // Campo-armadilha: as pessoas não o veem, os robôs preenchem-no
  if (req.body.website) a.falha(400, 'Pedido inválido.');

  const v = new a.Validacao();
  const nomeExibicao = v.campo('nome_exibicao', () => a.texto(req.body.nome_exibicao, 'Nome', 2, 50));
  const nome = v.campo('nome', () => validarNome(req.body.nome));
  const email = v.campo('email', () => a.email(req.body.email));
  const password = v.campo('password', () => validarPassword(req.body.password));
  if (String(req.body.password2 ?? '') !== String(req.body.password ?? '')) v.erro('password2', 'As palavras-passe não são iguais.');
  if (!a.booleano(req.body.aceito)) v.erro('aceito', 'Tens de aceitar as regras da comunidade TavDex.');

  // Únicos (o MySQL compara sem distinguir maiúsculas: "Duarte" = "duarte")
  if (nome && await linha('SELECT id FROM utilizadores WHERE nome = ?', [nome])) v.erro('nome', 'Esse @nome já está a ser usado.');
  if (email && await linha('SELECT id FROM utilizadores WHERE email = ?', [email])) v.erro('email', 'Já existe uma conta com esse email.');
  v.verificar();

  // Anti-spam: no máximo 20 contas novas em 10 minutos no site todo
  const recentes = await linha('SELECT COUNT(*) AS n FROM utilizadores WHERE criado_em >= NOW() - INTERVAL 10 MINUTE');
  if (recentes.n >= 20) a.falha(429, 'Muitos registos neste momento. Tenta daqui a uns minutos.');

  const hash = await bcrypt.hash(password, 10);
  const cor = a.corAleatoria();
  const r = await executar('INSERT INTO utilizadores (nome, nome_exibicao, email, password_hash, cor) VALUES (?, ?, ?, ?, ?)',
    [nome, nomeExibicao, email, hash, cor]);

  const u = await linha('SELECT * FROM utilizadores WHERE id = ?', [r.insertId]);
  await iniciarSessao(req, u, 'palavra_passe');
  await a.registarAtividade(req, u.id, 'registo', 'Conta criada');
  res.status(201).json({ u: a.publico(u), mensagem: `Conta criada! Bem-vindo ao TavDex, ${nomeExibicao}.` });
});

// ---------------------------------------------------------------------
// Login (Passo 6) – bloqueio com 5 falhas na conta ou 20 no mesmo IP em 15 minutos
// ---------------------------------------------------------------------
const ERRO_LOGIN = 'Nome de utilizador/email ou palavra-passe incorretos.';

router.post('/login', async (req, res) => {
  const login = a.texto(req.body.login, 'Nome de utilizador ou email', 1, 120).replace(/^@/, '');
  const password = a.texto(req.body.password, 'Palavra-passe', 1, 200);
  const ip = a.ipDe(req);

  const u = await linha('SELECT * FROM utilizadores WHERE nome = ? OR email = ?', [login, login.toLowerCase()]);
  // As falhas contam-se por conta (pelo email) e por IP
  const chave = u ? u.email : login.toLowerCase();

  const porConta = await linha('SELECT COUNT(*) AS n FROM tentativas_login WHERE email = ? AND criado_em >= NOW() - INTERVAL 15 MINUTE', [chave]);
  const porIp = await linha('SELECT COUNT(*) AS n FROM tentativas_login WHERE ip = ? AND criado_em >= NOW() - INTERVAL 15 MINUTE', [ip]);
  if (porConta.n >= 5 || porIp.n >= 20) {
    a.falha(429, 'Demasiadas tentativas falhadas. Espera 15 minutos ou recupera a palavra-passe.', { codigo: 'bloqueado' });
  }

  // Mesmo sem conta compara com um hash falso, para a resposta demorar o mesmo
  // tempo (assim não se descobre que contas existem pelo tempo de resposta)
  const certa = await compararPassword(password, u && u.password_hash ? u.password_hash : HASH_FALSO) && !!u?.password_hash;
  if (!u || !certa) {
    await executar('INSERT INTO tentativas_login (email, ip) VALUES (?, ?)', [chave, ip]);
    if (u) await a.registarAtividade(req, u.id, 'login_falhado', 'Tentativa de login falhada');
    const restam = Math.max(0, 4 - porConta.n);   // depois desta falha
    if (restam === 0) a.falha(429, 'Demasiadas tentativas falhadas. Espera 15 minutos ou recupera a palavra-passe.', { codigo: 'bloqueado' });
    a.falha(400, ERRO_LOGIN + (restam <= 2 ? ` Restam ${restam} tentativa${restam > 1 ? 's' : ''} antes do bloqueio.` : ''));
  }
  if (u.bloqueado) a.falha(403, 'Esta conta foi suspensa. Contacta a administração do TavDex.');

  // Login certo: limpa as falhas (desta conta e deste IP) e inicia a sessão
  await executar('DELETE FROM tentativas_login WHERE email = ? OR ip = ?', [chave, ip]);
  await iniciarSessao(req, u, 'palavra_passe');
  await a.registarAtividade(req, u.id, 'login', `Sessão iniciada com palavra-passe · ${a.dispositivoDe(req)}`);
  res.json({ u: a.publico(u) });
});

// ---------------------------------------------------------------------
// Logout (Passo 7) – só por POST com token CSRF (um link não termina a sessão)
// ---------------------------------------------------------------------
router.post('/logout', async (req, res) => {
  if (req.u) await a.registarAtividade(req, req.u.id, 'logout', 'Sessão terminada');
  await terminarSessao(req, 'Sessão terminada. Podes continuar a explorar o TavDex sem conta.');
  res.json({ ok: true });
});

// ---------------------------------------------------------------------
// Recuperação da palavra-passe (Passo 8)
// ---------------------------------------------------------------------
router.post('/recuperar', async (req, res) => {
  const email = a.email(req.body.email);
  // A resposta é sempre igual, exista a conta ou não (não revela que emails têm conta)
  const resposta = {
    ok: true,
    mensagem: `Se existir uma conta TavDex com o email ${email}, vais receber dentro de momentos um link para definir uma nova palavra-passe. O link é válido durante 30 minutos.`,
  };

  const u = await linha('SELECT id, nome, nome_exibicao, bloqueado FROM utilizadores WHERE email = ?', [email]);
  if (!u || u.bloqueado) return res.json(resposta);

  // No máximo 3 pedidos por hora por conta
  const pedidos = await linha('SELECT COUNT(*) AS n FROM recuperacoes WHERE utilizador_id = ? AND criado_em >= NOW() - INTERVAL 1 HOUR', [u.id]);
  if (pedidos.n >= 3) return res.json(resposta);

  // Um pedido novo anula os links anteriores
  await executar('UPDATE recuperacoes SET usado = 1 WHERE utilizador_id = ? AND usado = 0', [u.id]);

  // Token: 32 bytes aleatórios; na base de dados fica só o SHA-256
  const token = a.tokenAleatorio();
  await executar('INSERT INTO recuperacoes (utilizador_id, token_hash, expira_em) VALUES (?, ?, NOW() + INTERVAL 30 MINUTE)',
    [u.id, a.sha256(token)]);
  await a.registarAtividade(req, u.id, 'recuperacao_pedida', 'Pedido de recuperação da palavra-passe');

  const link = `${URL_SITE}/repor.html?token=${token}`;
  const nome = u.nome_exibicao || u.nome;
  await enviarEmail(email, 'TavDex – definir uma nova palavra-passe',
    `Olá ${nome},\n\nPediste para definir uma nova palavra-passe no TavDex.\nAbre este link (válido durante 30 minutos):\n${link}\n\nSe não foste tu, ignora este email: a tua palavra-passe continua igual.`,
    modeloEmail({
      titulo: 'Definir uma nova palavra-passe',
      paragrafos: [`Olá ${nome},`, 'Pediste para definir uma nova palavra-passe no TavDex. O link é válido durante 30 minutos e só pode ser usado uma vez.'],
      botao: { texto: 'Definir nova palavra-passe', url: link },
      nota: 'Se não foste tu, ignora este email: a tua palavra-passe continua igual.',
    }));
  res.json(resposta);
});

// Procura um pedido de recuperação válido (não usado e dentro dos 30 minutos)
function pedidoValido(token) {
  if (!/^[a-f0-9]{64}$/.test(String(token))) return null;
  return linha('SELECT * FROM recuperacoes WHERE token_hash = ? AND usado = 0 AND expira_em > NOW()', [a.sha256(token)]);
}

// A página "Nova palavra-passe" pergunta logo se o link ainda serve
router.get('/repor/:token', async (req, res) => {
  res.json({ valido: !!(await pedidoValido(req.params.token)) });
});

router.post('/repor', async (req, res) => {
  const pedido = await pedidoValido(req.body.token);
  if (!pedido) a.falha(400, 'Este link não é válido ou já expirou.', { codigo: 'link_invalido' });

  const v = new a.Validacao();
  const password = v.campo('password', () => validarPassword(req.body.password));
  if (String(req.body.password2 ?? req.body.password ?? '') !== String(req.body.password ?? '')) v.erro('password2', 'As palavras-passe não são iguais.');
  v.verificar();

  const uid = pedido.utilizador_id;
  const hash = await bcrypt.hash(password, 10);
  // Quem abriu o link do email tem acesso ao email: fica confirmado
  await executar('UPDATE utilizadores SET password_hash = ?, email_verificado = 1 WHERE id = ?', [hash, uid]);
  // O link só se usa uma vez; todas as sessões abertas terminam; as falhas de login são esquecidas
  await executar('UPDATE recuperacoes SET usado = 1 WHERE utilizador_id = ?', [uid]);
  await executar('DELETE FROM sessoes WHERE utilizador_id = ?', [uid]);
  await executar('DELETE FROM tentativas_login WHERE email = (SELECT email FROM utilizadores WHERE id = ?)', [uid]);
  await a.registarAtividade(req, uid, 'palavra_passe_reposta', 'Palavra-passe definida pelo link do email');
  res.json({ ok: true, mensagem: 'Palavra-passe alterada! Por segurança, terminámos todas as sessões desta conta.' });
});

module.exports = router;
module.exports.compararPassword = compararPassword;
module.exports.validarPassword = validarPassword;
module.exports.validarNome = validarNome;
