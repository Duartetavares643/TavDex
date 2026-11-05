// =====================================================================
//  Lista de projetos cinematográficos, com pesquisa, filtros e paginação
//  Os filtros ficam no endereço (?q=&tipo=&estado=&vagas=1&p=2)
// =====================================================================
(async () => {
  const u = await sessao;
  const filtros = new URLSearchParams(location.search);
  let d;
  try {
    d = await api('/api/projetos?' + filtros);
  } catch (e) {
    return mostrarErro(e.message);
  }
  const opcao = (valor, atual) => `<option ${valor === atual ? 'selected' : ''}>${esc(valor)}</option>`;

  mostrar(`<div class="content"><div class="left">
    <div class="ah"><div><h1 class="ph">Projetos</h1><small>Filmes, séries e curtas criados pela comunidade. Junta-te a uma equipa!</small></div>
      <a class="btn primary" href="${u ? '/projeto-novo.html' : '/login.html?voltar=%2Fprojeto-novo.html'}">+ Novo projeto</a></div>
    <form class="cf" id="filtros">
      <input name="q" type="search" value="${esc(filtros.get('q') || '')}" placeholder="Pesquisar projetos..." aria-label="Pesquisar projetos">
      <select name="tipo" aria-label="Tipo"><option value="">Todos os tipos</option>${d.tipos.map(t => opcao(t, filtros.get('tipo'))).join('')}</select>
      <select name="estado" aria-label="Estado"><option value="">Todos os estados</option>${d.estados.map(t => opcao(t, filtros.get('estado'))).join('')}</select>
      <label class="chk"><input type="checkbox" name="vagas" value="1" data-lista ${filtros.get('vagas') ? 'checked' : ''}> Com vagas abertas</label>
      <button class="btn ghost sm">Filtrar</button>
    </form>
    <p class="cr">${d.total} projeto${d.total === 1 ? '' : 's'}</p>
    ${d.projetos.length ? `<div class="pjc">${d.projetos.map(cartaoProjeto).join('')}</div>` : '<p class="empty">Nenhum projeto encontrado.</p>'}
    ${paginacao(d.total, d.pagina, d.porPagina)}
  </div></div>`);

  // Filtrar = mudar o endereço (assim o botão "voltar" do browser funciona)
  document.getElementById('filtros').addEventListener('submit', e => {
    e.preventDefault();
    const novos = new URLSearchParams();
    for (const [k, v] of new FormData(e.target)) if (v) novos.set(k, v);
    location.search = novos;
  });
  document.querySelector('.pg')?.addEventListener('click', e => {
    const a = e.target.closest('[data-pagina]');
    if (!a) return;
    e.preventDefault();
    filtros.set('p', a.dataset.pagina);
    location.search = filtros;
  });
})();
