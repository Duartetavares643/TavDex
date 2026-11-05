// =====================================================================
//  Pesquisa geral (barra do topo): filmes e séries, projetos, pessoas do
//  elenco e utilizadores. Dados: GET /api/titulos/pesquisa?q=
// =====================================================================
(async () => {
  const q = (param('q') || '').trim();
  if (q.length < 2) {
    return mostrar(`<div class="content"><div class="left"><h1 class="ph">Pesquisa</h1>
      <p class="empty">Escreve pelo menos 2 letras na barra de pesquisa.</p></div></div>`);
  }
  const d = await api('/api/titulos/pesquisa?q=' + encodeURIComponent(q));
  document.title = `"${q}" – Pesquisa – TavDex`;
  const total = d.titulos.length + d.projetos.length + d.pessoas.length + d.utilizadores.length;

  mostrar(`<div class="content"><div class="left">
    <h1 class="ph">Resultados para "${esc(q)}"</h1>
    ${total ? '' : '<p class="empty">Não encontrámos nada. Experimenta outras palavras.</p>'}
    ${d.titulos.length ? `<h2 class="sh">Filmes e séries (${d.titulos.length})</h2>${grelha(d.titulos, '')}` : ''}
    ${d.pessoas.length ? `<h2 class="sh">Pessoas (${d.pessoas.length})</h2><div class="ulist">
      ${d.pessoas.map(p => `<a class="rv" href="${p.titulo_id ? '/titulo.html?id=' + p.titulo_id : '#'}">${avatar({ nome: p.nome, cor: corDe(p.nome) })}
        <div><b>${esc(p.nome)}</b><small class="muted">${esc(p.titulos || '')}</small></div></a>`).join('')}</div>` : ''}
    ${d.projetos.length ? `<h2 class="sh">Projetos (${d.projetos.length})</h2><div class="pjc">${d.projetos.map(cartaoProjeto).join('')}</div>` : ''}
    ${d.utilizadores.length ? `<h2 class="sh">Utilizadores (${d.utilizadores.length})</h2><div class="ulist">
      ${d.utilizadores.map(x => `<a class="rv" href="/perfil.html?u=${encodeURIComponent(x.nome)}">${avatar(x)}<b>${esc(x.nome)}</b></a>`).join('')}</div>` : ''}
  </div></div>`);
})();
