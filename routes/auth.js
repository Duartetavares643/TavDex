// =====================================================================
//  TavDex – autenticação (Passos 5 a 8)       Endereço base: /api/auth
//  GET  /eu               quem tem a sessão iniciada (ou null) + avisos pendentes
//  POST /registar         criar conta (fica por confirmar: envia o link para o email)
//  POST /login            entrar com @nome ou email + palavra-passe (+ "Manter sessão iniciada")
//  POST /logout           terminar a sessão (apaga a sessão e o cookie)
//  POST /logout-todos     terminar a sessão em todos os dispositivos, incluindo este
//  POST /recuperar        pedir o link para repor a palavra-passe (com o email ou o @nome)
//  GET  /repor/:token     o link ainda é válido? (e para que conta é)
//  POST /repor            definir a palavra-passe nova a partir do link
//  O login com o Google está em routes/google.js (/api/auth/google) e a
//  confirmação do email em routes/confirmacao-email.js (/api/confirmacao).
// =====================================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const { linha, executar } = require('../db');
const a = require('./ajudas');
const { iniciarSessao, terminarSessao } = require('./middleware');
const { enviarEmail, modeloEmail } = require('./email');
const { validarPalavraPasse, cumpreRegras, dadosPessoais } = require('./palavras-passe');
const { enviarConfirmacao } = require('./confirmacao-email');

const router = express.Router();
const URL_SITE = process.env.URL_SITE || 'http://localhost:3000';

// Regras do @nome: 3 a 30 letras, números, _ ou .
const REGRA_NOME = /^[A-Za-z0-9_.]{3,30}$/;

// Anti-spam do registo: no máximo 15 contas novas por IP em 10 minutos.
// (Antes era um limite para o site todo, e um só robô conseguia impedir toda a gente de se registar.)
const REGISTOS_POR_IP = 15;

// Os hashes criados pelo PHP começam por $2y$; o algoritmo é o mesmo do $2a$
// do bcryptjs, por isso basta trocar o prefixo antes de comparar.
function compararPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(password, hash.replace(/^\$2y\$/, '$2a$'));
}

// Hash de uma palavra-passe qualquer, só para comparar quando a conta não existe
const HASH_FALSO = bcrypt.hashSync('conta-que-nao-existe', 10);

// Palavra-passe nova: as regras estão em routes/palavras-passe.js
// (10+ caracteres, maiúsculas, minúsculas, números e símbolos, nada pessoal,
//  não pode ser uma das mais comuns nem ter aparecido em fugas de dados)
const validarPassword = validarPalavraPasse;

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
  // Aviso "a tua palavra-passe já não cumpre as regras" (uma vez, depois do login)
  const palavraPasseFraca = !!req.session.avisoPalavraPasse;
  if (palavraPasseFraca) delete req.session.avisoPalavraPasse;
  const n = await linha('SELECT COUNT(*) AS n FROM notificacoes WHERE utilizador_id = ? AND lida = 0', [req.u.id]);
  res.json({ u: { ...a.publico(req.u), por_ler: n.n }, aviso, google, palavra_passe_fraca: palavraPasseFraca });
});

// ---------------------------------------------------------------------
// O email pode ser usado no registo? (a página pergunta ao sair do campo)
// Verifica o formato, se é temporário, se o domínio existe e recebe emails (DNS)
// e se já há uma conta com ele. No máximo 20 pedidos por minuto por IP.
// (Dizer que o email já tem conta é inevitável no registo; o limite trava quem
//  quisesse usar isto para descobrir emails.)
// ---------------------------------------------------------------------
const pedidosEmail = new Map();   // ip -> { n, ate }
// GET /email-disponivel?email=  →  o formulário de registo pergunta enquanto se escreve
router.get('/email-disponivel', async (req, res) => {
  const ip = a.ipDe(req);
  const agora = Date.now();
  const contagem = pedidosEmail.get(ip);
  if (!contagem || contagem.ate < agora) pedidosEmail.set(ip, { n: 1, ate: agora + 60000 });
  else if (++contagem.n > 20) a.falha(429, 'Demasiados pedidos. Espera um pouco.');
  if (pedidosEmail.size > 5000) for (const [k, v] of pedidosEmail) if (v.ate < agora) pedidosEmail.delete(k);

  let email;
  try {
    email = await a.validarEmail(req.query.email);
  } catch (erro) {
    if (!erro.publico) throw erro;
    return res.json({ valido: false, mensagem: erro.message });
  }
  if (await linha('SELECT id FROM utilizadores WHERE email = ? OR email_pendente = ?', [email, email])) {
    return res.json({ valido: false, existe: true, mensagem: 'Já existe uma conta com este email.' });
  }
  res.json({ valido: true, mensagem: '✓ Email válido: é para aqui que vamos enviar o link de confirmação.' });
});

// ---------------------------------------------------------------------
// Registo (Passo 5) – devolve todos os erros juntos: { erros: { campo: mensagem } }
// ---------------------------------------------------------------------
// Armadilha de tempo: a página de registo avisa o servidor quando abre.
// Uma pessoa demora pelo menos uns segundos a preencher o formulário; um robô envia-o logo.
// (TEMPO_MINIMO_REGISTO no .env, em segundos; os testes automáticos usam 0.)
router.post('/registo-inicio', (req, res) => {
  req.session.registoInicio = Date.now();
  res.json({ ok: true });
});

// Criar conta (fica por confirmar: só entra depois de abrir o link do email)
router.post('/registar', async (req, res) => {
  // Campo-armadilha: as pessoas não o veem, os robôs preenchem-no
  if (req.body.website) a.falha(400, 'Pedido inválido.');
  const minimo = Number(process.env.TEMPO_MINIMO_REGISTO ?? 3) * 1000;
  if (minimo > 0) {
    const inicio = req.session.registoInicio;
    if (!inicio) a.falha(400, 'Recarrega a página de registo e tenta outra vez.');
    if (Date.now() - inicio < minimo) a.falha(400, 'Preencheste o formulário depressa demais. Espera uns segundos e tenta outra vez.');
  }

  // Anti-spam por IP (contado pelos registos guardados na atividade das contas)
  const recentes = await linha(`SELECT COUNT(*) AS n FROM atividade_conta
    WHERE tipo = 'registo' AND ip = ? AND criado_em >= NOW() - INTERVAL 10 MINUTE`, [a.ipDe(req)]);
  if (recentes.n >= REGISTOS_POR_IP) a.falha(429, 'Muitos registos a partir desta ligação. Tenta daqui a uns minutos.');

  const v = new a.Validacao();
  const nomeExibicao = v.campo('nome_exibicao', () => a.nomeExibicao(req.body.nome_exibicao));
  const nome = v.campo('nome', () => validarNome(req.body.nome));
  const email = await v.campoAsync('email', () => a.validarEmail(req.body.email));
  // A palavra-passe não pode conter o @nome, o nome nem o email (por isso vai com esses dados)
  const password = await v.campoAsync('password', () => validarPassword(req.body.password,
    { nome: nome || req.body.nome, nomeExibicao: nomeExibicao || req.body.nome_exibicao, email: email || req.body.email }));
  if (String(req.body.password2 ?? '') !== String(req.body.password ?? '')) v.erro('password2', 'As palavras-passe não coincidem.');
  if (!a.booleano(req.body.aceito)) v.erro('aceito', 'Tens de aceitar as regras da comunidade TavDex.');

  // @nome livre (nem reservado, nem de outra conta, nem @ antigo de alguém há menos de 30 dias)
  if (nome) {
    const motivo = await a.nomeIndisponivel(nome);
    if (motivo) v.erro('nome', motivo);
  }
  // Email repetido: aqui é inevitável dizer que já existe (o registo tem limite por IP)
  if (email && await linha('SELECT id FROM utilizadores WHERE email = ? OR email_pendente = ?', [email, email])) {
    v.erro('email', 'Já existe uma conta com este email.');
  }
  v.verificar();

  const hash = await bcrypt.hash(password, 10);
  const cor = a.corAleatoria();
  const r = await executar(`INSERT INTO utilizadores (nome, nome_exibicao, email, password_hash, cor, palavra_passe_alterada_em, palavra_passe_fraca)
    VALUES (?, ?, ?, ?, ?, NOW(), 0)`, [nome, nomeExibicao, email, hash, cor]);

  // A conta fica por confirmar e NÃO entra logo: primeiro tem de abrir o link do email.
  // A sessão guarda só o id, para a página "Confirma o teu email" poder reenviar o link.
  const u = await linha('SELECT * FROM utilizadores WHERE id = ?', [r.insertId]);
  await a.registarAtividade(req, u.id, 'registo', 'Conta criada');
  await enviarConfirmacao(req, u, u.email, 'registo');
  req.session.porConfirmar = u.id;
  res.status(201).json({
    ok: true, por_confirmar: true, email: a.esconderEmail(u.email),
    mensagem: `Quase pronto! Enviámos um link para ${a.esconderEmail(u.email)}.`,
  });
});

// ---------------------------------------------------------------------
// Login (Passo 6) – bloqueio com 5 falhas na conta ou 20 no mesmo IP em 15 minutos
// ---------------------------------------------------------------------
const ERRO_LOGIN = 'Nome de utilizador/email ou palavra-passe incorretos.';

// Entrar com o @nome ou o email e a palavra-passe
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

  // Login certo: limpa as falhas (desta conta e deste IP)
  await executar('DELETE FROM tentativas_login WHERE email = ? OR ip = ?', [chave, ip]);

  // Email ainda por confirmar: a palavra-passe está certa, mas não entra.
  // (Com a palavra-passe errada a mensagem é a de sempre, por isso isto não revela que a conta existe.)
  if (!u.email_verificado) {
    req.session.porConfirmar = u.id;   // para o botão "Reenviar email de confirmação"
    a.falha(403, 'Ainda não confirmaste o teu email.', { codigo: 'email_por_confirmar' });
  }

  // "Manter sessão iniciada": 30 dias; senão, até fechar o browser (e 12 horas sem atividade)
  await iniciarSessao(req, u, 'palavra_passe', a.booleano(req.body.manter));
  await a.registarAtividade(req, u.id, 'login', `Sessão iniciada com palavra-passe · ${a.dispositivoDe(req)}`);
  // Contas antigas com palavras-passe que já não cumprem as regras: entram, mas recebem um aviso
  // (mostrado uma vez na página seguinte, por GET /api/auth/eu)
  const fraca = !cumpreRegras(password, dadosPessoais(u));
  if (fraca) req.session.avisoPalavraPasse = true;
  // Guardado para o resumo "Proteção da conta" das Definições (não se guarda a palavra-passe!)
  await executar('UPDATE utilizadores SET palavra_passe_fraca = ? WHERE id = ?', [fraca ? 1 : 0, u.id]);
  res.json({ u: a.publico(u), palavra_passe_fraca: fraca });
});

// ---------------------------------------------------------------------
// Logout (Passo 7) – só por POST com token CSRF (um link não termina a sessão)
// ---------------------------------------------------------------------
// Terminar sessão sem sessão ativa não dá erro (a página vai para o início).
// A mensagem vem na resposta, porque a sessão é destruída e o cookie apagado.
router.post('/logout', async (req, res) => {
  if (req.u) await a.registarAtividade(req, req.u.id, 'logout', 'Sessão terminada');
  await terminarSessao(req, res);
  res.json({ ok: true, aviso: 'Sessão terminada. Podes continuar a explorar o TavDex sem conta.' });
});

// Terminar sessão em TODOS os dispositivos, incluindo este
router.post('/logout-todos', async (req, res) => {
  if (req.u) {
    await executar('DELETE FROM sessoes WHERE utilizador_id = ?', [req.u.id]);
    await a.registarAtividade(req, req.u.id, 'sessoes_todas', 'Sessão terminada em todos os dispositivos');
  }
  await terminarSessao(req, res);
  res.json({ ok: true, aviso: 'Terminaste a sessão em todos os dispositivos.' });
});

// ---------------------------------------------------------------------
// Aviso "A tua palavra-passe foi alterada" (ao repor pelo link e ao alterar nas Definições)
// ---------------------------------------------------------------------

// "17/11/2026 às 10:32" (hora de Portugal)
function dataHora(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d).map(x => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} às ${p.hour}:${p.minute}`;
}

// Email "A tua palavra-passe foi alterada" (com data, dispositivo e "Não foste tu?")
async function avisarPalavraPasseAlterada(req, u) {
  const nome = u.nome_exibicao || u.nome;
  const quando = `${dataHora()} · ${a.dispositivoDe(req)}`;
  const link = `${URL_SITE}/recuperar.html`;
  await enviarEmail(u.email, 'TavDex – a tua palavra-passe foi alterada',
    `Olá ${nome},\n\nA palavra-passe da tua conta TavDex (@${u.nome}) foi alterada.\nQuando: ${quando}\n\nNão foste tu? Recupera a conta aqui: ${link}`,
    modeloEmail({
      titulo: 'A tua palavra-passe foi alterada',
      paragrafos: [`Olá ${nome},`, `A palavra-passe da tua conta TavDex (@${u.nome}) foi alterada.`, `Quando: ${quando}`],
      botao: { texto: 'Não foste tu? Recupera a conta', url: link },
      nota: 'Se foste tu, não precisas de fazer nada.',
    }));
}

// ---------------------------------------------------------------------
// Recuperação da palavra-passe (Passo 8)
// ---------------------------------------------------------------------
// Aceita o email OU o @nome (para quem se esqueceu de um deles).
// A resposta é SEMPRE igual, exista a conta ou não (não revela que contas existem).
// Limites: 3 pedidos por hora por conta e 10 por hora por IP (contados em recuperacoes.ip;
// os pedidos para contas que não existem não ficam guardados, por isso não contam).
router.post('/recuperar', async (req, res) => {
  const escrito = a.texto(req.body.login ?? req.body.email, 'Email ou @nome', 1, 120).replace(/^@/, '');
  const eEmail = escrito.includes('@');
  const procurado = eEmail ? a.email(escrito) : escrito;
  const resposta = {
    ok: true,
    mensagem: 'Se existir uma conta TavDex com esses dados, vais receber dentro de momentos um email com um link para definir uma nova palavra-passe. O link é válido durante 30 minutos.',
  };

  const u = await linha(`SELECT id, nome, nome_exibicao, email, google_id, password_hash, bloqueado FROM utilizadores
    WHERE ${eEmail ? 'email' : 'nome'} = ?`, [procurado]);
  if (!u || u.bloqueado) return res.json(resposta);

  const ip = a.ipDe(req);
  const pedidos = await linha('SELECT COUNT(*) AS n FROM recuperacoes WHERE utilizador_id = ? AND criado_em >= NOW() - INTERVAL 1 HOUR', [u.id]);
  const porIp = await linha('SELECT COUNT(*) AS n FROM recuperacoes WHERE ip = ? AND criado_em >= NOW() - INTERVAL 1 HOUR', [ip]);
  if (pedidos.n >= 3 || porIp.n >= 10) return res.json(resposta);

  // Um pedido novo anula os links anteriores
  await executar('UPDATE recuperacoes SET usado = 1 WHERE utilizador_id = ? AND usado = 0', [u.id]);

  // Token: 32 bytes aleatórios; na base de dados fica só o SHA-256
  const token = a.tokenAleatorio();
  await executar('INSERT INTO recuperacoes (utilizador_id, token_hash, expira_em, ip) VALUES (?, ?, NOW() + INTERVAL 30 MINUTE, ?)',
    [u.id, a.sha256(token), ip]);
  await a.registarAtividade(req, u.id, 'recuperacao_pedida', 'Pedido de recuperação da palavra-passe');

  const link = `${URL_SITE}/repor.html?token=${token}`;
  const nome = u.nome_exibicao || u.nome;
  // Informação do pedido (ajuda a perceber se não foi a própria pessoa)
  const pedido = `Pedido feito a ${dataHora()} · ${a.dispositivoDe(req)}`;
  const soGoogle = u.google_id && !u.password_hash;
  const explicacao = soGoogle
    ? 'Esta conta entra com o Google. Podes continuar a usar o Google ou definir uma palavra-passe aqui.'
    : 'Pediste para definir uma nova palavra-passe no TavDex. O link é válido durante 30 minutos e só pode ser usado uma vez.';
  await enviarEmail(u.email, 'TavDex – definir uma nova palavra-passe',
    `Olá ${nome},\n\n${explicacao}\nO teu nome de utilizador é @${u.nome}.\n\nAbre este link (válido durante 30 minutos):\n${link}\n\n${pedido}\nSe não foste tu, ignora este email: a tua palavra-passe continua igual.`,
    modeloEmail({
      titulo: 'Definir uma nova palavra-passe',
      paragrafos: [`Olá ${nome},`, explicacao, `O teu nome de utilizador é @${u.nome}.`],
      botao: { texto: 'Definir nova palavra-passe', url: link },
      nota: `${pedido}. Se não foste tu, ignora este email: a tua palavra-passe continua igual.`,
    }));
  res.json(resposta);
});

// Procura um pedido de recuperação válido (não usado e dentro dos 30 minutos)
function pedidoValido(token) {
  if (!/^[a-f0-9]{64}$/.test(String(token))) return null;
  return linha('SELECT * FROM recuperacoes WHERE token_hash = ? AND usado = 0 AND expira_em > NOW()', [a.sha256(token)]);
}

// A página "Nova palavra-passe" pergunta logo se o link ainda serve, e para que conta é
// (o @nome aparece no título; o nome e o email servem para a regra "não contém o teu nome")
router.get('/repor/:token', async (req, res) => {
  const pedido = await pedidoValido(req.params.token);
  if (!pedido) return res.json({ valido: false });
  const u = await linha('SELECT nome, nome_exibicao, email FROM utilizadores WHERE id = ?', [pedido.utilizador_id]);
  res.json({ valido: true, nome: u.nome, nome_exibicao: u.nome_exibicao || '', email: u.email });
});

// Guardar a nova palavra-passe pedida pelo link do email (o link só serve uma vez)
router.post('/repor', async (req, res) => {
  const pedido = await pedidoValido(req.body.token);
  if (!pedido) a.falha(400, 'Este link não é válido ou já expirou.', { codigo: 'link_invalido' });

  const uid = pedido.utilizador_id;
  const dono = await linha('SELECT * FROM utilizadores WHERE id = ?', [uid]);
  const v = new a.Validacao();
  const password = await v.campoAsync('password', () => validarPassword(req.body.password, dadosPessoais(dono)));
  if (String(req.body.password2 ?? req.body.password ?? '') !== String(req.body.password ?? '')) v.erro('password2', 'As palavras-passe não coincidem.');
  // A nova não pode ser igual à atual
  if (password && dono.password_hash && await compararPassword(password, dono.password_hash)) {
    v.erro('password', 'A palavra-passe nova tem de ser diferente da atual.');
  }
  v.verificar();

  const hash = await bcrypt.hash(password, 10);
  // Quem abriu o link do email tem acesso ao email: fica confirmado
  await executar('UPDATE utilizadores SET password_hash = ?, email_verificado = 1, palavra_passe_alterada_em = NOW(), palavra_passe_fraca = 0 WHERE id = ?', [hash, uid]);
  // O link só se usa uma vez; todas as sessões abertas terminam; as falhas de login são esquecidas
  await executar('UPDATE recuperacoes SET usado = 1 WHERE utilizador_id = ?', [uid]);
  await executar('DELETE FROM sessoes WHERE utilizador_id = ?', [uid]);
  await executar('DELETE FROM tentativas_login WHERE email = (SELECT email FROM utilizadores WHERE id = ?)', [uid]);
  await a.registarAtividade(req, uid, 'palavra_passe_reposta', 'Palavra-passe definida pelo link do email');
  await avisarPalavraPasseAlterada(req, dono);
  res.json({ ok: true, mensagem: 'Palavra-passe alterada! Por segurança, terminámos todas as sessões desta conta.' });
});

module.exports = router;
module.exports.avisarPalavraPasseAlterada = avisarPalavraPasseAlterada;
module.exports.compararPassword = compararPassword;
module.exports.validarPassword = validarPassword;
module.exports.validarNome = validarNome;
