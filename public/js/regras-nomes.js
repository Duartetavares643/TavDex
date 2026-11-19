// =====================================================================
//  TavDex – regras do nome da pessoa e do @nome (UM só ficheiro para o browser e o servidor)
//
//  · No browser: window.RegrasNomes (o campo fica a vermelho enquanto se escreve)
//  · No servidor: require('../public/js/regras-nomes') – o servidor volta a verificar
//    tudo e junta o que só ele sabe: se o @nome já é de outra conta (routes/ajudas.js).
// =====================================================================
(function () {
  'use strict';

  // Nome da pessoa (ex.: "Duarte Tavares"): só letras (com acentos), espaços, hífen e apóstrofo
  const NOME_MIN = 2;
  const NOME_MAX = 50;
  const REGRA_NOME_PESSOA = /^[\p{L}\p{M}]+(?:[ '’-][\p{L}\p{M}]+)*$/u;
  // Caracteres que não se veem (largura zero, controlo, mudança de direção do texto):
  // servem para fingir ser outra pessoa com um nome "igual", por isso são recusados
  const INVISIVEIS = /[\u0000-\u001f\u007f-\u009f­͏؜ᅟᅠ឴឵᠎​-‏‪-‮⁠-⁤⁦-⁯ㅤ﻿ﾠ]/;

  // @nome (ex.: "duarte_t"): 3 a 30 letras sem acentos, números, _ e .
  const ARROBA_MIN = 3;
  const ARROBA_MAX = 30;
  const REGRA_ARROBA = /^[A-Za-z0-9_.]{3,30}$/;
  // @nomes que ninguém pode usar (para ninguém se fazer passar pela equipa do TavDex)
  const NOMES_RESERVADOS = ['admin', 'administrador', 'tavdex', 'suporte', 'moderador', 'ajuda', 'sistema', 'root'];

  // Erro do nome da pessoa ('' se estiver bem)
  function erroNomePessoa(valor) {
    const t = String(valor || '').replace(/\s+/g, ' ').trim();
    if (!t) return 'Escreve o teu nome.';
    if (t.length < NOME_MIN || t.length > NOME_MAX) return `O nome tem de ter entre ${NOME_MIN} e ${NOME_MAX} caracteres.`;
    if (!/\p{L}/u.test(t)) return 'O nome tem de ter letras.';
    if (!REGRA_NOME_PESSOA.test(t)) return "O nome só pode ter letras, espaços, hífen (-) e apóstrofo ('). Sem números nem símbolos.";
    return '';
  }

  // Erro do formato do @nome ('' se estiver bem). O "@" do início é ignorado.
  function erroArroba(valor) {
    const nome = String(valor || '').trim().replace(/^@/, '');
    if (/[^A-Za-z0-9_.]/.test(nome)) return 'O @nome só pode ter letras sem acentos, números, _ e . (sem espaços).';
    if (nome.length < ARROBA_MIN) return `O @nome tem de ter pelo menos ${ARROBA_MIN} caracteres.`;
    if (nome.length > ARROBA_MAX) return `O @nome tem no máximo ${ARROBA_MAX} caracteres.`;
    return '';
  }

  // É um dos @nomes reservados? (sem distinguir maiúsculas: "Admin" também é)
  function reservado(nome) {
    return NOMES_RESERVADOS.includes(String(nome).toLowerCase());
  }

  const RegrasNomes = {
    NOME_MIN, NOME_MAX, REGRA_NOME_PESSOA, INVISIVEIS,
    ARROBA_MIN, ARROBA_MAX, REGRA_ARROBA, NOMES_RESERVADOS,
    erroNomePessoa, erroArroba, reservado,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = RegrasNomes;
  else window.RegrasNomes = RegrasNomes;
})();
