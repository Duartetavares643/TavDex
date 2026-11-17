// =====================================================================
//  TavDex – regras das palavras-passe (UM só ficheiro para o browser e o servidor)
//
//  · No browser: <script src="/js/regras-palavra-passe.js"> cria window.RegrasPalavraPasse
//    e a página mostra a lista de requisitos ao vivo.
//  · No servidor: require('../public/js/regras-palavra-passe') devolve o mesmo objeto
//    (routes/palavras-passe.js junta as verificações que só o servidor pode fazer:
//    a lista das palavras-passe mais comuns e as fugas de dados).
//  Assim as regras nunca ficam diferentes entre o browser e o servidor.
//
//  Regras:
//   1. 10 ou mais caracteres e no máximo 72 bytes (o bcrypt só usa os primeiros 72 bytes;
//      "ç" ou um emoji ocupam mais do que 1 byte, por isso contam-se bytes e não letras);
//   2. pelo menos uma minúscula, uma maiúscula, um número e um símbolo;
//   3. sem mais de 3 caracteres iguais seguidos ("aaaa") nem sequências de 4 ("1234", "abcd", "qwer");
//   4. sem o @nome, as palavras do nome nem a parte do email antes do @ (só partes com 3+ letras).
// =====================================================================
(function () {
  'use strict';

  const MINIMO = 10;
  const MAXIMO_BYTES = 72;

  // Sequências óbvias: alfabeto, números e as filas do teclado (também ao contrário)
  const SEQUENCIAS = ['abcdefghijklmnopqrstuvwxyz', '01234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', 'azertyuiop'];

  // Tamanho em bytes (UTF-8). O TextEncoder existe no browser e no Node.
  function bytes(p) {
    return new TextEncoder().encode(p).length;
  }

  // Minúsculas e sem acentos ("Ação" -> "acao"), para comparar sem distinguir
  function simplificar(t) {
    return String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  // Mais de 3 caracteres iguais seguidos?
  function temRepetidos(p) {
    return /(.)\1{3,}/u.test(p);
  }

  // Tem um pedaço de 4 de uma sequência óbvia?
  function temSequencia(p) {
    const t = simplificar(p);
    for (const s of SEQUENCIAS) {
      for (const base of [s, [...s].reverse().join('')]) {
        for (let i = 0; i + 4 <= base.length; i++) {
          if (t.includes(base.slice(i, i + 4))) return true;
        }
      }
    }
    return false;
  }

  // Partes pessoais que não podem aparecer na palavra-passe:
  // o @nome, cada palavra do nome e a parte do email antes do @ (e os seus pedaços de letras)
  function partesPessoais({ nome = '', nomeExibicao = '', email = '' } = {}) {
    const partes = new Set();
    const juntar = t => { t = simplificar(t).trim(); if (t.replace(/[^a-z]/g, '').length >= 3) partes.add(t); };
    juntar(String(nome).replace(/^@/, ''));
    simplificar(nomeExibicao).split(/[^a-z0-9]+/).forEach(juntar);
    const antesDoArroba = String(email).split('@')[0] || '';
    juntar(antesDoArroba);
    simplificar(antesDoArroba).split(/[^a-z]+/).forEach(juntar);
    return [...partes];
  }

  function contemPessoal(p, dados) {
    const t = simplificar(p);
    return partesPessoais(dados).some(parte => t.includes(parte));
  }

  // Analisa uma palavra-passe.
  //  dados = { nome, nomeExibicao, email } (para a regra 4)
  // Devolve:
  //  requisitos: lista para mostrar no formulário ({ id, texto, ok })
  //  erros:      mensagens de tudo o que falhou (a primeira é a que o servidor mostra)
  //  valida:     true se cumpre todas as regras
  //  forca:      1 Fraca · 2 Razoável · 3 Boa · 4 Forte (0 = campo vazio)
  function analisar(p, dados = {}) {
    p = String(p ?? '');
    const temMinuscula = /\p{Ll}/u.test(p);
    const temMaiuscula = /\p{Lu}/u.test(p);
    const requisitos = [
      { id: 'tamanho', texto: '10 ou mais caracteres', ok: [...p].length >= MINIMO },
      { id: 'letras', texto: 'Uma letra maiúscula e uma minúscula', ok: temMinuscula && temMaiuscula },
      { id: 'numero', texto: 'Um número', ok: /\p{N}/u.test(p) },
      { id: 'simbolo', texto: 'Um símbolo (ex.: ! ? # @)', ok: /[^\p{L}\p{N}\s]/u.test(p) },
      { id: 'pessoal', texto: 'Não contém o teu nome nem o teu email', ok: p.length > 0 && !contemPessoal(p, dados) },
    ];

    const erros = [];
    if (!p) erros.push('Escreve uma palavra-passe.');
    else {
      if (!requisitos[0].ok) erros.push(`A palavra-passe tem de ter pelo menos ${MINIMO} caracteres.`);
      if (bytes(p) > MAXIMO_BYTES) erros.push('A palavra-passe é demasiado comprida (máximo 72 bytes; acentos e emojis contam mais).');
      if (!requisitos[1].ok) erros.push('Usa pelo menos uma letra maiúscula e uma minúscula.');
      if (!requisitos[2].ok) erros.push('Usa pelo menos um número.');
      if (!requisitos[3].ok) erros.push('Usa pelo menos um símbolo (ex.: ! ? # @).');
      if (temRepetidos(p)) erros.push('Não uses mais de 3 caracteres iguais seguidos.');
      if (temSequencia(p)) erros.push('Evita sequências óbvias como 1234, abcd ou qwer.');
      if (!requisitos[4].ok) erros.push('A palavra-passe não pode conter o teu nome nem o teu email.');
    }
    const valida = erros.length === 0;

    // Força (só para a barra): inválida = Fraca ou Razoável; válida = Boa ou Forte
    let forca = 0;
    if (p) {
      const cumpridos = requisitos.filter(r => r.ok).length;
      if (!valida) forca = cumpridos >= 4 ? 2 : 1;
      else forca = ([...p].length >= 14 || new Set(p).size >= 12) ? 4 : 3;
    }
    return { requisitos, erros, valida, forca };
  }

  const NOMES_FORCA = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];

  const RegrasPalavraPasse = {
    MINIMO, MAXIMO_BYTES, NOMES_FORCA,
    analisar, bytes, simplificar, temRepetidos, temSequencia, partesPessoais, contemPessoal,
  };

  // No Node exporta; no browser fica em window.RegrasPalavraPasse
  if (typeof module !== 'undefined' && module.exports) module.exports = RegrasPalavraPasse;
  else window.RegrasPalavraPasse = RegrasPalavraPasse;
})();
