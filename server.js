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
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { pool, linha } = require('./db');
const { utilizadorAtual } = require('./routes/middleware');

const app = express();
const PORTA = Number(process.env.PORTA) || 3000;

// ---------------------------------------------------------------------
// 2. Configurações gerais
// ---------------------------------------------------------------------

// Lê o corpo dos pedidos em JSON (o JavaScript das páginas envia assim)
// e em formulário normal. O limite evita pedidos gigantes.
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// Cabeçalhos de segurança simples
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');      // o browser não "adivinha" o tipo dos ficheiros
  res.set('X-Frame-Options', 'DENY');                // o site não pode ser metido dentro de outro (clickjacking)
  res.set('Referrer-Policy', 'same-origin');
  next();
});

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

app.use(session({
  name: 'tavdex.sid',
  secret: process.env.SEGREDO_SESSAO || 'segredo-de-desenvolvimento',
  store: guardaSessoes,
  resave: false,
  saveUninitialized: false,          // só cria sessão quando é preciso
  cookie: {
    httpOnly: true,                  // o JavaScript da página não consegue ler o cookie
    sameSite: 'lax',                 // ajuda contra pedidos vindos de outros sites
    secure: process.env.URL_SITE?.startsWith('https') || false,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
  },
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

// Pedidos sem corpo (ex.: um DELETE simples) ficam com req.body = {}
app.use('/api', (req, res, next) => { req.body = req.body || {}; next(); });

// Em todos os pedidos à API: descobre quem tem a sessão iniciada (fica em req.u).
// Só na /api, para os ficheiros CSS, JS e imagens não irem à base de dados.
app.use('/api', utilizadorAtual);

app.use('/api/auth', require('./routes/auth'));                 // Fase 2
app.use('/api/utilizadores', require('./routes/utilizadores')); // Fase 2
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
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// Página que não existe -> 404.html
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

// Tratamento de erros:
//  - erros de validação (lançados com falha() em routes/ajudas.js): mostra a mensagem;
//  - JSON mal formado: 400;
//  - qualquer outro erro: regista na consola e responde sem mostrar detalhes.
app.use((erro, req, res, next) => {
  if (erro.publico) return res.status(erro.status).json({ erro: erro.message });
  if (erro.type === 'entity.parse.failed') return res.status(400).json({ erro: 'Dados inválidos.' });
  if (erro.type === 'entity.too.large') return res.status(413).json({ erro: 'Pedido demasiado grande.' });
  console.error(erro);
  res.status(500).json({ erro: 'Ocorreu um erro no servidor.' });
});

app.listen(PORTA, () => {
  console.log(`TavDex a funcionar em http://localhost:${PORTA}`);
});
