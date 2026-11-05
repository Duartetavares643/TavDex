// =====================================================================
//  TavDex – comunicação com o servidor
//  Todas as páginas usam a função api() para falar com o Express.
//  Ela trata do token CSRF automaticamente.
// =====================================================================

let tokenCsrf = null;

// Pede o token CSRF ao servidor (só uma vez por página)
async function obterCsrf() {
  if (!tokenCsrf) {
    const resposta = await fetch('/api/csrf', { credentials: 'same-origin' });
    tokenCsrf = (await resposta.json()).token;
  }
  return tokenCsrf;
}

// Faz um pedido à API e devolve os dados em JSON.
// Exemplos:
//   const dados = await api('/api/estado');
//   await api('/api/auth/login', 'POST', { email, password });
async function api(endereco, metodo = 'GET', corpo = null, novaTentativa = true) {
  const opcoes = { method: metodo, credentials: 'same-origin', headers: {} };
  if (metodo !== 'GET') {
    opcoes.headers['X-CSRF-Token'] = await obterCsrf();
  }
  if (corpo) {
    opcoes.headers['Content-Type'] = 'application/json';
    opcoes.body = JSON.stringify(corpo);
  }
  const resposta = await fetch(endereco, opcoes);
  const dados = await resposta.json().catch(() => ({}));
  // O token CSRF muda quando a sessão muda (ex.: login noutro separador).
  // Nesse caso pede um token novo e tenta mais uma vez.
  if (resposta.status === 403 && String(dados.erro).includes('CSRF') && novaTentativa) {
    tokenCsrf = null;
    return api(endereco, metodo, corpo, false);
  }
  if (!resposta.ok) {
    // O servidor responde sempre { erro: 'mensagem' } quando algo corre mal
    throw new Error(dados.erro || 'Erro ' + resposta.status);
  }
  return dados;
}

// Escapa texto antes de o pôr no HTML (evita ataques XSS).
// Usar SEMPRE que se mostra texto escrito por utilizadores.
// Troca os 5 caracteres especiais do HTML (também as aspas, para os atributos).
function esc(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
