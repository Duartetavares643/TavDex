// =====================================================================
//  TavDex – regras dos emails (UM só ficheiro para o browser e o servidor)
//
//  · No browser: window.RegrasEmail (formato e sugestão "Querias dizer…?" ao sair do campo)
//  · No servidor: require('../public/js/regras-email') – o servidor junta as verificações
//    que só ele pode fazer: domínios descartáveis e DNS (ver validarEmail em routes/ajudas.js).
// =====================================================================
(function () {
  'use strict';

  const MAXIMO = 120;   // tamanho da coluna utilizadores.email
  const MENSAGEM_FORMATO = 'Escreve um email válido (ex.: nome@gmail.com).';

  // Domínios muito usados: se alguém escrever um parecido, sugerimos o certo
  const CONHECIDOS = ['gmail.com', 'hotmail.com', 'outlook.com', 'outlook.pt', 'sapo.pt', 'yahoo.com', 'icloud.com', 'live.com.pt'];
  // Domínios reais parecidos com os de cima (para não os "corrigirmos" por engano)
  const VERDADEIROS = ['mail.com', 'gmx.com', 'gmx.pt', 'ymail.com', 'live.com', 'live.pt', 'hotmail.pt', 'msn.com',
    'me.com', 'mac.com', 'aol.com', 'iol.pt', 'clix.pt', 'netcabo.pt', 'proton.me', 'protonmail.com', 'yahoo.pt', 'outlook.com.br'];

  // Tira os espaços das pontas e passa a minúsculas
  function normalizar(email) {
    return String(email ?? '').trim().toLowerCase();
  }

  // Devolve null se o formato estiver certo, ou a mensagem de erro
  function erroFormato(email) {
    const e = normalizar(email);
    if (!e) return 'Escreve o teu email.';
    if (e.length > MAXIMO) return `O email é demasiado comprido (máximo ${MAXIMO} caracteres).`;
    const partes = e.split('@');
    if (partes.length !== 2) return MENSAGEM_FORMATO;           // um só @
    const [local, dominio] = partes;
    if (local.length < 1 || local.length > 64) return MENSAGEM_FORMATO;
    if (/\s/.test(e)) return MENSAGEM_FORMATO;                  // sem espaços
    if (!/^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(local)) return MENSAGEM_FORMATO;
    if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return MENSAGEM_FORMATO;
    // Domínio: partes de letras, números e hífenes, separadas por pontos; termina com 2+ letras
    if (!/^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(dominio)) return MENSAGEM_FORMATO;
    return null;
  }

  // Distância de edição (quantas letras é preciso trocar, tirar, pôr ou inverter)
  function distancia(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const custo = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + custo);
        // Duas letras trocadas ("gmial") contam como 1
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
    return d[a.length][b.length];
  }

  // "duarte@gmial.com" -> "duarte@gmail.com" (ou null se não houver sugestão)
  function sugestao(email) {
    const e = normalizar(email);
    const i = e.lastIndexOf('@');
    if (i < 1) return null;
    const dominio = e.slice(i + 1);
    if (!dominio || CONHECIDOS.includes(dominio) || VERDADEIROS.includes(dominio)) return null;
    let melhor = null;
    let menor = Infinity;
    for (const c of CONHECIDOS) {
      const n = distancia(dominio, c);
      if (n < menor) { menor = n; melhor = c; }
    }
    const limite = dominio.length <= 6 ? 1 : 2;   // domínios curtos só com 1 letra de diferença
    return menor >= 1 && menor <= limite ? `${e.slice(0, i)}@${melhor}` : null;
  }

  // "duarte@gmail.com" -> "d•••••@gmail.com" (para mostrar nas páginas sem revelar o email todo)
  function esconder(email) {
    const e = normalizar(email);
    const i = e.lastIndexOf('@');
    if (i < 1) return '•••';
    return e[0] + '•'.repeat(Math.min(5, Math.max(3, i - 1))) + e.slice(i);
  }

  const RegrasEmail = { MAXIMO, MENSAGEM_FORMATO, CONHECIDOS, normalizar, erroFormato, distancia, sugestao, esconder };

  if (typeof module !== 'undefined' && module.exports) module.exports = RegrasEmail;
  else window.RegrasEmail = RegrasEmail;
})();
