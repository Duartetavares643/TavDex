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
// 3. Sessões (guardadas na tabela "sessoes" da base de dados)
// ---------------------------------------------------------------------
const guardaSessoes = new MySQLStore({
  createDatabaseTable: false,        // a tabela já é criada pelo 01_criar_bd.sql
  schema: {
    tableName: 'sessoes',
    columnNames: { session_id: 'session_id', expires: 'expires', data: 'data' },
  },
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

// Fase 2 em diante:
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/utilizadores', require('./routes/utilizadores'));
// app.use('/api/projetos', require('./routes/projetos'));
// ...

// Pedido à API que não existe -> erro 404 em JSON
app.use('/api', (req, res) => res.status(404).json({ erro: 'Endereço da API não encontrado.' }));

// ---------------------------------------------------------------------
// 6. Páginas e ficheiros (HTML, CSS, JS, imagens) da pasta /public
// ---------------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// Página que não existe -> 404.html
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

// Qualquer erro inesperado: regista na consola e responde sem mostrar detalhes
app.use((erro, req, res, next) => {
  console.error(erro);
  res.status(500).json({ erro: 'Ocorreu um erro no servidor.' });
});

app.listen(PORTA, () => {
  console.log(`TavDex a funcionar em http://localhost:${PORTA}`);
});
