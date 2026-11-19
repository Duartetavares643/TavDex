// =====================================================================
//  TavDex – servidor (Node.js + Express)
//  Arrancar com:  npm start   (ou  npm run dev  para reiniciar sozinho)
//  Depois abrir:  http://localhost:3000
// =====================================================================

// 1. Ler os segredos do ficheiro .env (tem de ser a primeira coisa)
require('dotenv').config();

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { pool, linha, executar } = require('./db');
const { utilizadorAtual, exigirLogin, exigirLoginPagina, NOME_COOKIE, OPCOES_COOKIE } = require('./routes/middleware');
const { limparContasPorConfirmar } = require('./routes/confirmacao-email');

const app = express();
const PORTA = Number(process.env.PORTA) || 3000;
// Em produção o site está em https (ex.: URL_SITE=https://tavdex.pt)
const HTTPS = (process.env.URL_SITE || '').startsWith('https');

// ---------------------------------------------------------------------
// 2. Configurações gerais
// ---------------------------------------------------------------------

// Atrás de um proxy (Render, Railway, Heroku, nginx...) o pedido chega por http
// ao Node. "trust proxy" faz o Express confiar no cabeçalho X-Forwarded-*:
// assim req.ip é o IP verdadeiro e os cookies "secure" funcionam.
app.set('trust proxy', 1);

// Em produção: http -> https
if (HTTPS) {
  app.use((req, res, next) => (req.secure ? next() : res.redirect(301, `https://${req.get('host')}${req.originalUrl}`)));
}

// Cabeçalhos de segurança (helmet). A CSP diz ao browser de onde pode carregar coisas:
// scripts só do próprio site, letras do Google Fonts e imagens https (cartazes).
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],   // os style="--h:..." precisam de unsafe-inline
      'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
      'img-src': ["'self'", 'data:', 'blob:', 'https:'],   // blob: = pré-visualização da foto antes de a guardar
      'connect-src': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      // Em http (localhost) não se pode pedir ao browser para passar tudo para https
      'upgrade-insecure-requests': HTTPS ? [] : null,
    },
  },
  strictTransportSecurity: HTTPS,                     // HSTS só faz sentido em https
  referrerPolicy: { policy: 'same-origin' },
}));

// Lê o corpo dos pedidos em JSON (o JavaScript das páginas envia assim)
// e em formulário normal. O limite evita pedidos gigantes.
app.use(express.json({ limit: '100kb' }));
// Formulários enviados à moda antiga (também até 100 KB)
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// ---------------------------------------------------------------------
// 3. Sessões
//    O express-session guarda os dados da sessão na tabela sessoes_express
//    (criada sozinha pela biblioteca). A tabela "sessoes" é nossa e serve
//    para as sessões ativas por dispositivo (ver routes/middleware.js).
// ---------------------------------------------------------------------
const guardaSessoes = new MySQLStore({
  createDatabaseTable: true,
  schema: { tableName: 'sessoes_express' },
}, pool);

// As opções do cookie (OPCOES_COOKIE, em routes/middleware.js) são as mesmas que o logout usa
// para o apagar: httpOnly (o JavaScript da página não o lê), sameSite 'lax' (ajuda contra
// pedidos vindos de outros sites) e secure em https (só viaja cifrado).
// A duração é escolhida no login ("Manter sessão iniciada": 30 dias; senão, até fechar o browser).
// Os visitantes (só com o token CSRF) ficam com 1 dia.
app.use(session({
  name: NOME_COOKIE,
  secret: process.env.SEGREDO_SESSAO || 'segredo-de-desenvolvimento',
  store: guardaSessoes,
  resave: false,
  saveUninitialized: false,          // só cria sessão quando é preciso
  cookie: { ...OPCOES_COOKIE, maxAge: 1000 * 60 * 60 * 24 },
}));

// ---------------------------------------------------------------------
// 4. Proteção CSRF
//    Cada sessão recebe um código secreto (token). As páginas pedem-no
//    em GET /api/csrf e enviam-no no cabeçalho "X-CSRF-Token" em todos
//    os pedidos que alteram dados (POST, PUT, PATCH, DELETE).
//    Um site de fora não consegue ler o token, logo não consegue
//    fazer pedidos em nome do utilizador.
// ---------------------------------------------------------------------
app.get('/api/csrf', (req, res) => {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(32).toString('hex');
  res.json({ token: req.session.csrf });
});

// CSRF: os pedidos que mudam dados têm de trazer o cabeçalho X-CSRF-Token certo
app.use((req, res, next) => {
  const alteraDados = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (!alteraDados) return next();
  const enviado = req.get('X-CSRF-Token') || req.body?._csrf || '';
  const certo = req.session.csrf || '';
  // timingSafeEqual compara sem dar pistas pelo tempo de resposta
  const valido = certo && enviado.length === certo.length &&
    crypto.timingSafeEqual(Buffer.from(enviado), Buffer.from(certo));
  if (!valido) return res.status(403).json({ erro: 'Pedido inválido (token CSRF). Recarrega a página.' });
  next();
});

// ---------------------------------------------------------------------
// 5. Rotas da API (uma por fase, em /routes)
// ---------------------------------------------------------------------

// Teste: confirma que o servidor e a base de dados estão a funcionar
app.get('/api/estado', async (req, res) => {
  try {
    const r = await linha('SELECT COUNT(*) AS total FROM utilizadores');
    const t = await linha('SELECT COUNT(*) AS total FROM titulos');
    res.json({ ok: true, utilizadores: r.total, titulos: t.total });
  } catch (erro) {
    console.error('Erro na base de dados:', erro.message);
    res.status(500).json({ ok: false, erro: 'Sem ligação à base de dados. Verifica o .env e se o MySQL está ligado.' });
  }
});

// Pedidos sem corpo (ex.: um DELETE simples) ficam com req.body = {}.
// "no-store": as respostas da API nunca ficam guardadas no browser, por isso depois de
// terminar sessão o botão Retroceder não mostra dados da conta.
// (A foto de perfil e a imagem do banner substituem isto pela sua própria cache, em routes/utilizadores.js.)
app.use('/api', (req, res, next) => {
  req.body = req.body || {};
  res.set('Cache-Control', 'no-store');
  next();
});

// Em todos os pedidos à API: descobre quem tem a sessão iniciada (fica em req.u).
// Só na /api, para os ficheiros CSS, JS e imagens não irem à base de dados.
app.use('/api', utilizadorAtual);

const google = require('./routes/google');
const utilizadores = require('./routes/utilizadores');
app.use('/api/auth/google', google);                            // Passo 6: login com o Google (OAuth 2.0 + PKCE)
app.use('/api/auth', require('./routes/auth'));                 // Passos 5 a 8
app.use('/api/confirmacao', require('./routes/confirmacao-email'));   // confirmação do email por link
app.use('/api/conta', google.conta);                            // POST /api/conta/google/desligar
app.post('/api/seguir/:id', exigirLogin, utilizadores.seguir);  // Passo 9: seguir / deixar de seguir
app.use('/api/utilizadores', utilizadores);                     // Passos 9 e 10
app.use('/api/projetos', require('./routes/projetos'));         // Fase 3
app.use('/api/comunidade', require('./routes/comunidade'));     // Fase 4
app.use('/api/admin', require('./routes/admin'));               // Fase 4
app.use('/api/titulos', require('./routes/titulos'));           // Fase 5
app.use('/api', require('./routes/avaliacoes'));                // Fase 6 (/api/avaliacoes, /api/listas)

// Pedido à API que não existe -> erro 404 em JSON
app.use('/api', (req, res) => res.status(404).json({ erro: 'Endereço da API não encontrado.' }));

// ---------------------------------------------------------------------
// 6. Páginas e ficheiros (HTML, CSS, JS, imagens) da pasta /public
// ---------------------------------------------------------------------
const pagina = nome => (req, res) => res.sendFile(path.join(__dirname, 'public', nome));

// Páginas que precisam de sessão: sem sessão vão para o login e voltam depois
// (os dados verdadeiros estão sempre protegidos na API com exigirLogin)
const PRIVADAS = ['definicoes', 'listas', 'chat', 'notificacoes', 'admin', 'candidaturas', 'projeto-novo', 'projeto-editar'];
for (const nome of PRIVADAS) app.get([`/${nome}`, `/${nome}.html`], exigirLoginPagina, pagina(`${nome}.html`));

// Páginas com um token no endereço (links dos emails): "no-referrer" impede que o
// endereço com o token seja enviado a outro site num clique, e "no-store" que fique em cache.
const comToken = (req, res, next) => {
  res.set({ 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' });
  next();
};
// Página do link "nova palavra-passe" e do link "confirmar email"
app.get(['/repor', '/repor.html', '/nova-palavra-passe'], comToken, pagina('repor.html'));
app.get(['/confirmar-email', '/confirmar-email.html', '/confirmar-email/:token'], comToken, pagina('confirmar-email.html'));

// Endereços "limpos" que mostram as páginas que já existem
app.get('/entrar', pagina('login.html'));
// GET /sair nunca termina a sessão (um link ou uma imagem noutro site não te tira do TavDex):
// mostra uma página com o botão "Terminar sessão" (que faz POST com o token CSRF)
app.get(['/sair', '/sair.html'], pagina('sair.html'));
// /perfil/nome -> página do perfil. Um @nome antigo (mudado há menos de 30 dias) redireciona
// de vez (301) para o perfil novo.
app.get('/perfil/:nome', async (req, res) => {
  const novo = await utilizadores.nomeNovo(req.params.nome);
  res.redirect(novo ? 301 : 302, '/perfil.html?u=' + encodeURIComponent(novo || req.params.nome));
});

// Ficheiros da pasta public/ (páginas, CSS, JavaScript, imagens)
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// Página que não existe -> 404.html
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

// Tratamento de erros:
//  - erros de validação (lançados com falha() em routes/ajudas.js): mostra a mensagem;
//  - JSON mal formado: 400;
//  - qualquer outro erro: regista na consola e responde sem mostrar detalhes.
app.use((erro, req, res, next) => {
  if (erro.publico) {
    // 401: { erro: 'login_necessario', mensagem } -> a página abre a janela "Inicia sessão para continuar"
    if (erro.codigo === 'login_necessario') return res.status(401).json({ erro: 'login_necessario', mensagem: erro.message });
    const corpo = { erro: erro.message };
    if (erro.codigo) corpo.codigo = erro.codigo;   // ex.: 'bloqueado', 'link_invalido'
    if (erro.erros) corpo.erros = erro.erros;      // erros de cada campo do formulário
    return res.status(erro.status).json(corpo);
  }
  if (erro.type === 'entity.parse.failed') return res.status(400).json({ erro: 'Dados inválidos.' });
  if (erro.type === 'entity.too.large') return res.status(413).json({ erro: 'Pedido demasiado grande.' });
  console.error(erro);
  // Problemas com a base de dados: mensagem útil em vez do erro genérico
  if (['ECONNREFUSED', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR'].includes(erro.code)) {
    return res.status(503).json({ erro: 'Sem ligação à base de dados. Verifica o .env e se o MySQL está ligado.' });
  }
  if (erro.code === 'ER_NO_SUCH_TABLE' || erro.code === 'ER_BAD_FIELD_ERROR') {
    return res.status(503).json({ erro: 'A base de dados está desatualizada. Instala-a com o script database/tavdex_site.sql.' });
  }
  res.status(500).json({ erro: 'Ocorreu um erro no servidor.' });
});

// ---------------------------------------------------------------------
// 7. Limpeza automática (uma vez por dia)
//    · atividade da conta com mais de 180 dias
//    · tentativas de login com mais de 1 dia
//    · links de recuperação expirados há mais de 1 dia
// ---------------------------------------------------------------------
async function limpar() {
  try {
    await executar('DELETE FROM atividade_conta WHERE criado_em < NOW() - INTERVAL 180 DAY');
    await executar('DELETE FROM tentativas_login WHERE criado_em < NOW() - INTERVAL 1 DAY');
    await executar('DELETE FROM recuperacoes WHERE expira_em < NOW() - INTERVAL 1 DAY');
    // Contas por confirmar há mais de 7 dias (liberta o email e o @nome) e links velhos
    await limparContasPorConfirmar();
    await executar('DELETE FROM nomes_antigos WHERE data < NOW() - INTERVAL 30 DAY');
  } catch (erro) {
    console.error('Limpeza automática falhou:', erro.message);
  }
}

// Sessões expiradas (de hora a hora): 12 horas sem atividade sem "Manter sessão iniciada",
// data de expiração passada, ou mais de 90 dias no total
async function limparSessoes() {
  try {
    await executar(`DELETE FROM sessoes WHERE (manter = 0 AND ultimo_acesso < NOW() - INTERVAL 12 HOUR)
      OR (expira_em IS NOT NULL AND expira_em < NOW()) OR criado_em < NOW() - INTERVAL 90 DAY`);
  } catch (erro) {
    console.error('Limpeza das sessões falhou:', erro.message);
  }
}

// ---------------------------------------------------------------------
// 8. Verificação da base de dados ao arrancar
//    Uma só consulta às tabelas e colunas mais recentes: se falhar, a base de
//    dados não existe ou é de uma versão antiga do TavDex.
// ---------------------------------------------------------------------
async function verificarBaseDados() {
  await pool.query(`SELECT u.banner_versao, u.mostrar_listas, u.email_pendente, s.manter, r.ip
    FROM utilizadores u, sessoes s, recuperacoes r, verificacao_email, nomes_antigos, utilizador_generos, vw_titulos_avaliacao
    LIMIT 1`);
  // Os cenários do banner também mudaram de nome ao longo do projeto
  const [[coluna]] = await pool.query(`SELECT COLUMN_TYPE AS tipo FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'utilizadores' AND COLUMN_NAME = 'tema_banner'`);
  if (!String(coluna && coluna.tipo).includes("'colina'")) {
    throw Object.assign(new Error('a coluna tema_banner tem os cenários antigos'), { code: 'ER_BAD_FIELD_ERROR' });
  }
}

// O que fazer para resolver cada problema da base de dados (uma frase)
function conselhoBaseDados(erro) {
  if (erro.code === 'ECONNREFUSED') return 'O MySQL está desligado. Liga-o (ex.: o WAMP) e reinicia o servidor.';
  if (erro.code === 'ER_ACCESS_DENIED_ERROR') return 'Confirma BD_UTILIZADOR e BD_PASSWORD no ficheiro .env.';
  return `Instala a base de dados com o script database/tavdex_site.sql e confirma BD_NOME=tavdex_site no .env.`;
}

// Um erro inesperado numa tarefa de fundo vai para o log em vez de desligar o servidor
process.on('unhandledRejection', erro => console.error('Erro não tratado:', erro));

// Exportado para os testes automáticos (tests/) arrancarem o servidor numa porta livre
module.exports = app;
if (require.main !== module) return;

app.listen(PORTA, async () => {
  console.log(`TavDex a funcionar em http://localhost:${PORTA}`);
  setInterval(limpar, 24 * 60 * 60 * 1000).unref();
  setInterval(limparSessoes, 60 * 60 * 1000).unref();
  // Testa logo a base de dados, para um problema aparecer na consola com uma mensagem clara
  try {
    await verificarBaseDados();
    console.log('Ligação à base de dados: OK');
    require('./routes/email').verificarEmail();
    limpar();
    limparSessoes();
  } catch (erro) {
    console.error(`\n*** Problema na base de dados: ${erro.message}`);
    console.error(`    -> ${conselhoBaseDados(erro)}\n`);
  }
});
