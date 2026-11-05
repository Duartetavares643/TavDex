// =====================================================================
//  TavDex – pequenas funções usadas por todas as rotas
//  (validação dos dados recebidos, notificações, anti-spam, paginação)
// =====================================================================
const crypto = require('crypto');
const { linha, linhas, executar } = require('../db');
const { enviarEmail } = require('./email');

// ---------------------------------------------------------------------
// Erros: falha(400, 'mensagem') pára a rota e o server.js responde
// { erro: 'mensagem' } com esse código HTTP.
// ---------------------------------------------------------------------
function falha(codigo, mensagem) {
  const erro = new Error(mensagem);
  erro.status = codigo;
  erro.publico = true;   // a mensagem pode ser mostrada ao utilizador
  throw erro;
}

// ---------------------------------------------------------------------
// Validação (tudo é validado no servidor, mesmo que a página já valide)
// ---------------------------------------------------------------------

// Texto com tamanho mínimo e máximo. Devolve o texto sem espaços nas pontas.
function texto(valor, nome, min, max) {
  const t = String(valor ?? '').trim();
  if (t.length < min) falha(400, min === 1 ? `${nome}: campo obrigatório.` : `${nome}: mínimo de ${min} caracteres.`);
  if (t.length > max) falha(400, `${nome}: máximo de ${max} caracteres.`);
  return t;
}

// Número inteiro entre min e max
function inteiro(valor, nome, min, max) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n < min || n > max) falha(400, `${nome}: valor inválido.`);
  return n;
}

// Inteiro opcional: devolve null se vier vazio
function inteiroOuNulo(valor, nome, min, max) {
  if (valor === undefined || valor === null || valor === '') return null;
  return inteiro(valor, nome, min, max);
}

// Valor que tem de estar numa lista fixa (ex.: tipo 'filme' ou 'serie')
function escolha(valor, lista, nome) {
  if (!lista.includes(valor)) falha(400, `${nome}: opção inválida.`);
  return valor;
}

// Verdadeiro/falso vindo de um checkbox ou de JSON
function booleano(valor) {
  return valor === true || valor === 1 || valor === '1' || valor === 'on' || valor === 'true';
}

// Email com formato válido (validação simples)
function email(valor) {
  const e = texto(valor, 'Email', 3, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) falha(400, 'Email inválido.');
  return e;
}

// Endereço de imagem opcional: só aceita https:// (evita "javascript:" e afins)
function urlImagem(valor) {
  const u = String(valor ?? '').trim();
  if (!u) return null;
  if (u.length > 255 || !/^https:\/\/[^\s"'<>]+$/.test(u)) falha(400, 'O endereço da imagem tem de começar por https://');
  return u;
}

// ---------------------------------------------------------------------
// Segurança
// ---------------------------------------------------------------------

// Hash SHA-256 (para guardar tokens sem guardar o token verdadeiro)
function sha256(valor) {
  return crypto.createHash('sha256').update(valor).digest('hex');
}

// Token aleatório e impossível de adivinhar
function tokenAleatorio() {
  return crypto.randomBytes(32).toString('hex');
}

// IP e navegador de quem fez o pedido (para as sessões e a atividade)
function ipDe(req) {
  return String(req.ip || '').slice(0, 45);
}
function dispositivoDe(req) {
  return String(req.get('User-Agent') || 'Desconhecido').slice(0, 200);
}

// Regista um evento de segurança da conta (login, mudança de email, ...)
async function registarAtividade(req, utilizadorId, tipo) {
  await executar('INSERT INTO atividade_conta (utilizador_id, tipo, ip, dispositivo) VALUES (?, ?, ?, ?)',
    [utilizadorId, tipo, ipDe(req), dispositivoDe(req)]);
}

// ---------------------------------------------------------------------
// Anti-spam
// ---------------------------------------------------------------------

// Já fez demasiadas coisas do mesmo tipo em pouco tempo?
// Ex.: await demasiado('mensagens', 'de_id', uid, 8, 20) -> mais de 8 mensagens em 20 s?
// O nome da tabela não pode ir num "?", por isso só aceitamos os desta lista.
const TABELAS_SPAM = {
  mensagens: 'de_id', publicacoes: 'utilizador_id', comentarios: 'utilizador_id',
  projetos: 'dono_id', candidaturas: 'utilizador_id', denuncias: 'utilizador_id',
};
async function demasiado(tabela, coluna, uid, maximo, segundos) {
  if (TABELAS_SPAM[tabela] !== coluna) return false;
  const r = await linha(`SELECT COUNT(*) AS n FROM ${tabela} WHERE ${coluna} = ? AND criado_em >= NOW() - INTERVAL ? SECOND`,
    [uid, segundos]);
  return r.n >= maximo;
}

// Conta os links num texto (recusamos textos com mais de 2 links)
function nLinks(t) {
  return (String(t).match(/(https?:\/\/|www\.)\S+/gi) || []).length;
}

// Junta as duas verificações anti-spam mais usadas
async function verificarSpam(u, tabela, coluna, maximo, segundos, conteudo) {
  if (u.papel === 'admin') return;
  if (await demasiado(tabela, coluna, u.id, maximo, segundos)) falha(429, 'Estás a fazer isso demasiadas vezes. Espera um pouco.');
  if (conteudo && nLinks(conteudo) > 2) falha(400, 'O texto tem demasiados links (máximo 2).');
}

// ---------------------------------------------------------------------
// Notificações
// ---------------------------------------------------------------------

// Cria uma notificação, se o utilizador não tiver silenciado esse tipo.
// Se ele tiver ligado as notificações por email, também envia um email.
async function notificar(paraId, tipo, textoNotif, link = '', deId = null) {
  if (!paraId || paraId === deId) return;   // ninguém é notificado das próprias ações
  const silenciado = await linha('SELECT 1 FROM notif_silenciadas WHERE utilizador_id = ? AND tipo = ?', [paraId, tipo]);
  if (silenciado) return;
  await executar('INSERT INTO notificacoes (utilizador_id, tipo, texto, link) VALUES (?, ?, ?, ?)',
    [paraId, tipo, textoNotif.slice(0, 255), link.slice(0, 200)]);

  const u = await linha('SELECT email, notif_email FROM utilizadores WHERE id = ?', [paraId]);
  if (u && u.notif_email) {
    const endereco = (process.env.URL_SITE || 'http://localhost:3000') + '/' + link;
    enviarEmail(u.email, 'TavDex – ' + textoNotif, `${textoNotif}\n\nVer no TavDex: ${endereco}`).catch(() => {});
  }
}

// ---------------------------------------------------------------------
// Paginação: lê ?p= e devolve o limite e o deslocamento (OFFSET)
// Os números vão diretamente no SQL (já validados como inteiros),
// porque o MySQL não aceita bem LIMIT ? nos prepared statements.
// ---------------------------------------------------------------------
function paginacao(req, porPagina) {
  const pagina = Math.max(1, Math.floor(Number(req.query.p)) || 1);
  return { pagina, porPagina, sql: ` LIMIT ${porPagina} OFFSET ${(pagina - 1) * porPagina}` };
}

// Cria "?, ?, ?" para usar em IN (...) com uma lista de valores
function marcadores(lista) {
  return lista.map(() => '?').join(', ');
}

// Dados públicos de um utilizador (nunca enviar password_hash, email, ...)
function publico(u) {
  return u ? { id: u.id, nome: u.nome, cor: u.cor, papel: u.papel } : null;
}

module.exports = {
  falha, texto, inteiro, inteiroOuNulo, escolha, booleano, email, urlImagem,
  sha256, tokenAleatorio, ipDe, dispositivoDe, registarAtividade,
  demasiado, nLinks, verificarSpam, notificar, paginacao, marcadores, publico,
  linhas, linha, executar,
};
