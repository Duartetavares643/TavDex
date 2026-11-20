// =====================================================================
//  TavDex – ajudas para os testes automáticos (node:test, sem bibliotecas extra)
//  · arranca o servidor numa porta livre
//  · Cliente = um "browser" simples: guarda os cookies e trata do token CSRF
//  · criarUtilizador / apagarTestes: contas de teste (o @nome começa por "teste_")
//  Os emails ficam em ficheiros (EMAIL_MODE=ficheiro) para os testes os lerem.
// =====================================================================
process.env.EMAIL_MODE = 'ficheiro';   // tem de ser antes de carregar o servidor
process.env.GOOGLE_CLIENT_ID = '';      // por omissão o Google não está configurado
process.env.GOOGLE_CLIENT_SECRET = '';
// Os testes correm sem internet: sem consultar o Have I Been Pwned nem o DNS.
// (Definidas aqui e não no "npm test", porque no Windows "VAR=0 npm test" não funciona.)
// O teste do domínio inexistente liga o DNS só para ele, se TESTAR_DNS=1.
process.env.VERIFICAR_FUGAS = '0';
process.env.VERIFICAR_DNS = '0';
process.env.TEMPO_MINIMO_REGISTO = '0';   // a armadilha de tempo do registo tem um teste próprio
process.env.CONFIAR_PROXY = '1';          // os clientes de teste mandam IPs diferentes em X-Forwarded-For

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const app = require('../server');
const { pool, linha, linhas, executar } = require('../db');
const { PASTA_EMAILS } = require('../routes/email');

let servidor = null;

// Arranca o servidor numa porta livre (porta 0 = o sistema escolhe) e devolve o endereço
function arrancar() {
  return new Promise(resolve => {
    servidor = app.listen(0, () => resolve(`http://127.0.0.1:${servidor.address().port}`));
  });
}

// No fim dos testes: apaga as contas de teste e fecha o servidor e a base de dados
async function parar() {
  await apagarTestes();
  if (servidor) await new Promise(resolve => servidor.close(resolve));
  await pool.end().catch(() => {});
}

// "Browser" de teste
//  ip = IP "de origem" deste cliente (enviado em X-Forwarded-For, que o servidor aceita
//       porque tem "trust proxy"). Assim os limites por IP de um teste não afetam os outros.
let contadorIp = 0;
class Cliente {
  constructor(base, userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36', ip = null) {
    this.base = base;
    this.cookies = {};
    this.csrf = null;
    this.userAgent = userAgent;
    this.ip = ip || `10.${(Date.now() >> 8) % 250}.${Math.floor(++contadorIp / 250) % 250}.${contadorIp % 250 + 1}`;
  }

  async pedido(metodo, caminho, corpo = null, novaTentativa = true) {
    const cabecalhos = { 'user-agent': this.userAgent, 'x-forwarded-for': this.ip };
    const cookies = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    if (cookies) cabecalhos.cookie = cookies;
    if (metodo !== 'GET') {
      if (!this.csrf) await this.obterCsrf();
      cabecalhos['x-csrf-token'] = this.csrf;
    }
    let body;
    if (corpo instanceof FormData) body = corpo;
    else if (corpo) { cabecalhos['content-type'] = 'application/json'; body = JSON.stringify(corpo); }

    const r = await fetch(this.base + caminho, { method: metodo, headers: cabecalhos, body, redirect: 'manual' });
    for (const c of r.headers.getSetCookie()) {
      const par = c.split(';')[0];
      const i = par.indexOf('=');
      this.cookies[par.slice(0, i)] = par.slice(i + 1);
    }
    const tipo = r.headers.get('content-type') || '';
    const dados = tipo.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer());
    // Depois do login a sessão muda e o token CSRF também: pede outro e repete
    if (r.status === 403 && String(dados.erro).includes('CSRF') && novaTentativa) {
      this.csrf = null;
      return this.pedido(metodo, caminho, corpo, false);
    }
    return { status: r.status, dados, headers: r.headers, local: r.headers.get('location') };
  }

  async obterCsrf() {
    const r = await this.pedido('GET', '/api/csrf');
    this.csrf = r.dados.token;
  }

  get(caminho) { return this.pedido('GET', caminho); }
  post(caminho, corpo) { return this.pedido('POST', caminho, corpo); }
  put(caminho, corpo) { return this.pedido('PUT', caminho, corpo); }
  delete(caminho, corpo) { return this.pedido('DELETE', caminho, corpo); }

  async entrar(login, password) {
    const r = await this.post('/api/auth/login', { login, password });
    if (r.status !== 200) throw new Error(`Login falhou (${r.status}): ${JSON.stringify(r.dados)}`);
    this.csrf = null;
    return r;
  }
}

// Cria uma conta de teste diretamente na base de dados (mais rápido do que pela API
// e não conta para o limite de registos). A data fica "ontem" pelo mesmo motivo.
let contador = 0;
// A palavra-passe de teste é das antigas (não tem símbolo): continua a entrar,
// como as contas que já existiam antes das regras novas.
// As contas de teste vêm com o email confirmado (senão não conseguiam entrar).
const HASH = bcrypt.hashSync('Teste12345', 10);
// Cria a conta de teste e devolve-a (com a palavra-passe em texto, para poder entrar)
async function criarUtilizador(extra = {}) {
  contador++;
  const sufixo = `${Date.now().toString(36)}${contador}`;
  const u = {
    nome: `teste_${sufixo}`, email: `teste_${sufixo}@exemplo.pt`, password_hash: HASH, cor: 330,
    papel: 'utilizador', email_verificado: 1, ...extra,
  };
  const colunas = Object.keys(u);
  const r = await executar(`INSERT INTO utilizadores (${colunas.join(', ')}, criado_em)
    VALUES (${colunas.map(() => '?').join(', ')}, NOW() - INTERVAL 1 DAY)`, Object.values(u));
  return { ...u, id: r.insertId, password: 'Teste12345' };
}

// Apaga as contas de teste (as tabelas ligadas apagam-se em cascata) e os emails de teste
async function apagarTestes() {
  await executar("DELETE FROM utilizadores WHERE nome LIKE 'teste\\_%' OR email LIKE 'teste\\_%'");
  await executar("DELETE FROM tentativas_login WHERE email LIKE 'teste\\_%' OR email LIKE 'ninguem\\_%'");
  if (fs.existsSync(PASTA_EMAILS)) {
    for (const f of fs.readdirSync(PASTA_EMAILS)) {
      if (/teste_|ninguem_/.test(f)) fs.unlinkSync(path.join(PASTA_EMAILS, f));
    }
  }
}

// Último email (texto) enviado para um endereço
function ultimoEmail(para) {
  if (!fs.existsSync(PASTA_EMAILS)) return null;
  const nome = String(para).replace(/[^a-z0-9@._-]/gi, '_');
  const ficheiros = fs.readdirSync(PASTA_EMAILS).filter(f => f.endsWith(`_${nome}.txt`)).sort();
  return ficheiros.length ? fs.readFileSync(path.join(PASTA_EMAILS, ficheiros.at(-1)), 'utf8') : null;
}

module.exports = { arrancar, parar, Cliente, criarUtilizador, apagarTestes, ultimoEmail, linha, linhas, executar };
