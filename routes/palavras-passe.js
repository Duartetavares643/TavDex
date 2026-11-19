// =====================================================================
//  TavDex – verificação das palavras-passe no servidor
//
//  As regras de base (tamanho, maiúsculas, símbolos, …) estão em
//  public/js/regras-palavra-passe.js, o mesmo ficheiro que o browser usa.
//  Aqui juntam-se as duas verificações que só o servidor pode fazer:
//   1. a lista das 10 000 palavras-passe mais comuns (dados/palavras-passe-comuns.txt);
//   2. as fugas de dados, com a API "Pwned Passwords" do Have I Been Pwned.
//
//  Como funciona a verificação de fugas (k-anonimidade):
//   · calcula-se o SHA-1 da palavra-passe (ex.: 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8);
//   · envia-se SÓ os 5 primeiros caracteres (5BAA6) para api.pwnedpasswords.com/range/5BAA6;
//   · a API devolve todos os hashes que começam por 5BAA6 e procuramos o resto na resposta.
//   A palavra-passe (e até o hash completo) nunca sai do servidor.
// =====================================================================
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Regras = require('../public/js/regras-palavra-passe');
const { falha } = require('./ajudas');

// ---------------------------------------------------------------------
// Lista das palavras-passe mais comuns (carregada uma vez, ao arrancar)
// ---------------------------------------------------------------------
const FICHEIRO_COMUNS = path.join(__dirname, '..', 'dados', 'palavras-passe-comuns.txt');
let COMUNS = new Set();
try {
  COMUNS = new Set(fs.readFileSync(FICHEIRO_COMUNS, 'utf8').split(/\r?\n/).map(l => l.trim().toLowerCase()).filter(Boolean));
} catch (erro) {
  console.error('Aviso: não foi possível ler dados/palavras-passe-comuns.txt:', erro.message);
}

// Troca as substituições mais usadas ("p@ssw0rd" -> "password")
const TROCAS = { '@': 'a', '4': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o', '$': 's', '5': 's', '7': 't' };

// Com as regras de composição, quase ninguém escreve "password" tal e qual:
// escreve "Password1!". Por isso comparamos também a versão "limpa":
// minúsculas, sem números e símbolos no início e no fim ("Password1!" -> "password").
function versoes(p) {
  const t = Regras.simplificar(p);
  const limpa = s => s.replace(/^[^a-z]+|[^a-z]+$/g, '');
  const trocar = s => [...s].map(c => TROCAS[c] || c).join('');
  // Tira primeiro os números e símbolos do FIM (palavra + "2026!" é o mais comum) e só depois troca
  const semFim = t.replace(/[^a-z]+$/, '');
  return [t, limpa(t), limpa(trocar(semFim)), limpa(trocar(t))].filter(v => v.length >= 3);
}

// A palavra-passe (ou uma das suas versões "limpas") está na lista das mais usadas?
function eComum(p) {
  return versoes(p).some(v => COMUNS.has(v));
}

// ---------------------------------------------------------------------
// Fugas de dados (Have I Been Pwned). Se a API falhar ou demorar mais de
// 2 segundos, NÃO bloqueia (só fica no log). Desliga-se com VERIFICAR_FUGAS=0.
// ---------------------------------------------------------------------
async function apareceEmFugas(p) {
  if (process.env.VERIFICAR_FUGAS === '0') return false;
  const sha1 = crypto.createHash('sha1').update(p, 'utf8').digest('hex').toUpperCase();
  const inicio = sha1.slice(0, 5);
  const resto = sha1.slice(5);
  try {
    const resposta = await fetch(`https://api.pwnedpasswords.com/range/${inicio}`, {
      headers: { 'Add-Padding': 'true', 'User-Agent': 'TavDex-PAP' },   // "padding" esconde até o tamanho da resposta
      signal: AbortSignal.timeout(2000),
    });
    if (!resposta.ok) throw new Error('HTTP ' + resposta.status);
    const linhas = (await resposta.text()).split('\n');
    return linhas.some(l => {
      const [sufixo, vezes] = l.trim().split(':');
      return sufixo === resto && Number(vezes) > 0;
    });
  } catch (erro) {
    console.warn('Verificação de fugas indisponível (a palavra-passe foi aceite):', erro.message);
    return false;
  }
}

// ---------------------------------------------------------------------
// Validação completa de uma palavra-passe NOVA (registo, alterar, definir, repor).
//  dados = { nome, nomeExibicao, email } do dono da conta
// Lança falha(400) com a primeira mensagem de erro; devolve a palavra-passe se estiver boa.
// ---------------------------------------------------------------------
async function validarPalavraPasse(p, dados = {}) {
  const t = String(p ?? '');
  const analise = Regras.analisar(t, dados);
  if (!analise.valida) falha(400, analise.erros[0]);
  if (eComum(t)) falha(400, 'Essa palavra-passe é demasiado comum. Escolhe outra.');
  if (await apareceEmFugas(t)) falha(400, 'Esta palavra-passe apareceu em fugas de dados. Escolhe outra.');
  return t;
}

// A palavra-passe (já certa, no login) cumpre as regras atuais?
// Sem consultar a internet, para o login ser rápido. Usada para o aviso
// "A tua palavra-passe já não cumpre as regras de segurança do TavDex".
function cumpreRegras(p, dados = {}) {
  return Regras.analisar(p, dados).valida && !eComum(p);
}

// Dados pessoais de um utilizador no formato que as regras esperam
function dadosPessoais(u) {
  return u ? { nome: u.nome, nomeExibicao: u.nome_exibicao || '', email: u.email || '' } : {};
}

module.exports = { validarPalavraPasse, cumpreRegras, dadosPessoais };
