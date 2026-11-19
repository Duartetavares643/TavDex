// =====================================================================
//  TavDex – sessão, endereços e login com o Google
//  Quem tem a sessão iniciada (sessao / sessaoAtual), ler o endereço (param,
//  voltarDoEndereco, comAviso), terminar a sessão e avisar os outros separadores,
//  e o botão "Continuar com Google".
//  É o primeiro ficheiro de comum/ (precisa só do api.js).
// =====================================================================

// Estado da sessão: { u, aviso, google } (u = utilizador com sessão iniciada, ou null)
const estadoSessao = api('/api/auth/eu').catch(() => ({ u: null, aviso: null, google: true }));
// As páginas fazem: const u = await sessao;
const sessao = estadoSessao.then(r => r.u);

// Cópias "síncronas" para os cliques (ficam preenchidas quando a sessão chega)
let sessaoAtual;            // undefined = ainda a carregar; null = visitante
let googleConfigurado = true;
estadoSessao.then(r => { sessaoAtual = r.u; googleConfigurado = r.google !== false; });

// Parâmetro do endereço, ex.: param('id') em "titulo.html?id=3" -> "3"
function param(nome) {
  return new URLSearchParams(location.search).get(nome);
}

// Página atual (para voltar depois do login)
function paginaAtual() {
  return location.pathname + location.search;
}

// Leva ao login e depois volta a esta página
function irLogin() {
  location.href = '/login.html?voltar=' + encodeURIComponent(paginaAtual());
}

// Página para onde voltar depois do login/registo (?voltar=). Só caminhos internos:
// começam por "/" e não por "//", sem "\", e nunca as páginas de autenticação.
function voltarDoEndereco() {
  const v = param('voltar') || '/';
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\') || /^\/*(https?|javascript|data):/i.test(v)) return '/';
  if (/^\/(login|entrar|registar|recuperar|repor|nova-palavra-passe)(\.html)?(\/|\?|#|$)/i.test(v)) return '/';
  return v;
}

// Junta um aviso (?ok=) a um caminho interno, para aparecer na página seguinte
function comAviso(caminho, texto) {
  const url = new URL(caminho, location.origin);
  url.searchParams.set('ok', texto);
  return url.pathname + url.search + url.hash;
}

// =====================================================================
// SESSÃO EM TODOS OS SEPARADORES
// Terminar (ou iniciar) sessão num separador atualiza logo os outros, com
// BroadcastChannel (e o evento "storage" nos browsers que não o têm).
// =====================================================================
const PAGINAS_PRIVADAS = /^\/(definicoes|listas|chat|notificacoes|admin|candidaturas|projeto-novo|projeto-editar)(\.html)?$/;
// true se a página atual só abre com sessão iniciada
const paginaPrivada = () => PAGINAS_PRIVADAS.test(location.pathname);
let canalSessao = null;
try { canalSessao = new BroadcastChannel('tavdex-sessao'); } catch (erro) { /* browser antigo: usa o "storage" */ }

// Avisa os outros separadores abertos ("saiu" ou "entrou")
function avisarOutrosSeparadores(tipo) {
  if (canalSessao) canalSessao.postMessage({ tipo });
  try { localStorage.setItem('tavdex-sessao', JSON.stringify({ tipo, t: Date.now() })); } catch (erro) { /* ignora */ }
}

// Recebe o aviso de outro separador e atualiza esta página
function sessaoMudouNoutroSeparador(tipo) {
  if (tipo === 'saiu' && sessaoAtual) {
    // Página privada -> início; pública -> fica nela, agora como visitante
    if (paginaPrivada()) location.href = '/'; else location.reload();
  } else if (tipo === 'entrou') {
    location.reload();
  }
}
if (canalSessao) canalSessao.onmessage = e => sessaoMudouNoutroSeparador(e.data && e.data.tipo);
else window.addEventListener('storage', e => {
  if (e.key === 'tavdex-sessao' && e.newValue) sessaoMudouNoutroSeparador(JSON.parse(e.newValue).tipo);
});

// Aviso para mostrar na página seguinte (ex.: "Sessão terminada…")
function avisoNaProximaPagina(texto) {
  try { sessionStorage.setItem('tavdex-aviso', texto); } catch (erro) { /* ignora */ }
}

// Terminar sessão (POST com o token CSRF). todos = em todos os dispositivos, incluindo este.
async function terminarSessao(todos = false) {
  if (todos) {
    const sim = await confirmarJanela({
      titulo: 'Sair de todos os dispositivos?',
      texto: 'Vais sair do TavDex em todos os dispositivos, incluindo este.',
      sim: 'Terminar em todos', nao: 'Cancelar',
    });
    if (!sim) return;
  }
  try {
    const r = await api(todos ? '/api/auth/logout-todos' : '/api/auth/logout', 'POST');
    avisoNaProximaPagina(r.aviso);
  } catch (erro) { /* sem sessão: vai para o início na mesma */ }
  avisarOutrosSeparadores('saiu');
  // Simples: depois de sair vai sempre para a página inicial, com a mensagem
  location.href = '/';
}

// "G" colorido oficial do Google (as regras de marca da Google exigem o logótipo oficial)
const LOGO_GOOGLE = `<svg class="g-logo" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;

// Botão "Continuar com Google" (login, registo e janela de login). Volta à página indicada.
// A escolha "Manter sessão iniciada" fica guardada neste browser e o Google usa a última escolha
function manterSessaoGuardado() {
  try { return localStorage.getItem('tavdex-manter') === '1'; } catch (erro) { return false; }
}
// O botão em si (link para /api/auth/google, que volta à página "voltar")
function botaoGoogle(texto = 'Continuar com Google', voltar = paginaAtual()) {
  const manter = manterSessaoGuardado() ? '&manter=1' : '';
  return `<a class="btn google" data-google href="/api/auth/google?voltar=${encodeURIComponent(voltar)}${manter}">${LOGO_GOOGLE}<span>${esc(texto)}</span></a>`;
}
