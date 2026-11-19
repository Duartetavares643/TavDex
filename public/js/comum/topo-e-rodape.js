// =====================================================================
//  TavDex – barra do topo e rodapé
//  Logótipo, menu, pesquisa, botão do modo claro/escuro, notificações e
//  menu da conta (ou Entrar / Registar).
// =====================================================================

// =====================================================================
// BARRA DE NAVEGAÇÃO E RODAPÉ
// =====================================================================
const ICONES = {
  lupa: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  lua: '<svg class="lua" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>',
  sol: '<svg class="sol" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  sino: '<svg viewBox="0 0 24 24"><path d="M6 17V11a6 6 0 0112 0v6l2 2H4zM10 21h4"/></svg>',
};

// Barra do topo: logótipo, menu, pesquisa, modo claro/escuro e menu da conta (ou Entrar)
function desenharTopo(u) {
  const ativo = document.body.dataset.menu || '';
  const menu = [['/', 'Início'], ['/catalogo.html?tipo=filme', 'Filmes'], ['/catalogo.html?tipo=serie', 'Séries'],
    ['/projetos.html', 'Projetos'], ['/comunidade.html', 'Comunidade']];
  const links = menu.map(([url, nome]) => `<a href="${url}" class="${ativo === nome ? 'active' : ''}">${nome}</a>`).join('');
  const q = location.pathname.startsWith('/pesquisa') ? param('q') || '' : '';

  const conta = u ? `
    <a class="bell" href="/notificacoes.html" aria-label="Notificações">${ICONES.sino}${u.por_ler ? `<i>${u.por_ler > 99 ? '99+' : u.por_ler}</i>` : ''}</a>
    <div class="um">
      <button class="ub" type="button" aria-haspopup="true">${avatar(u)}<span class="nome">@${esc(u.nome)}</span> ▾</button>
      <div class="dd">
        <a href="/perfil.html?u=${encodeURIComponent(u.nome)}">Perfil</a>
        <a href="/listas.html">As minhas listas</a>
        <a href="/chat.html">Chat</a>
        <a href="/notificacoes.html">Notificações</a>
        ${u.papel === 'admin' ? '<a href="/admin.html">Painel de administração</a>' : ''}
        <a href="/definicoes.html">Definições</a>
        <a href="/definicoes.html?tab=seguranca">Segurança da conta</a>
        <form id="sair"><button class="rtog">Terminar sessão</button></form>      </div>
    </div>`
    : `<a class="btn ghost sm nav-btn" href="/login.html?voltar=${encodeURIComponent(paginaAtual())}">Entrar</a>
       <a class="btn primary sm nav-btn" href="/registar.html?voltar=${encodeURIComponent(paginaAtual())}">Registar</a>`;

  const topo = document.createElement('header');
  topo.className = 'nav';
  topo.innerHTML = `
    <a href="/" class="bl"><img src="/img/logo.png" alt=""><span>Tav<em>Dex</em></span></a>
    <nav>${links}</nav>
    <form class="search" action="/pesquisa.html" method="get" role="search">${ICONES.lupa}
      <input type="search" name="q" value="${esc(q)}" placeholder="Pesquisar filmes, séries, pessoas, projetos..." aria-label="Pesquisar">
    </form>
    <button class="icone-btn tema" type="button" data-mudar-tema aria-label="Mudar entre modo escuro e claro" title="Modo escuro / claro">${ICONES.lua}${ICONES.sol}</button>
    ${conta}`;
  document.body.prepend(topo);

  // Terminar sessão (POST com token CSRF), aqui ou em todos os dispositivos
  const sair = document.getElementById('sair');
  if (sair) sair.addEventListener('submit', e => {
    e.preventDefault();
    terminarSessao(false);
  });
}

// Rodapé com o logótipo e as ligações
function desenharRodape(u) {
  const rodape = document.createElement('footer');
  rodape.className = 'ft';
  rodape.innerHTML = `<div class="ft-in">
    <div class="marca"><img src="/img/logo.png" alt=""><b>Tav<em>Dex</em></b></div>
    <span class="lema">Descobre. Organiza. Avalia. Cria.</span>
    <nav aria-label="Rodapé">
      <a href="/catalogo.html?tipo=filme">Filmes</a><a href="/catalogo.html?tipo=serie">Séries</a>
      <a href="/projetos.html">Projetos</a><a href="/comunidade.html">Comunidade</a>
      ${u ? '' : '<a href="/registar.html">Criar conta</a>'}
      <a href="/privacidade.html">Privacidade</a><a href="/termos.html">Termos</a>
    </nav>
    <small>TavDex © ${new Date().getFullYear()} · PAP de Duarte Veríssimo Tavares · Técnico de Informática – Sistemas</small>
  </div>`;
  document.body.append(rodape);
}
