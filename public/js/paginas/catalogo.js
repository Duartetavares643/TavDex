// =====================================================================
//  Catálogo de filmes e séries: pesquisa, filtros (tipo, género, ano,
//  plataforma), ordenação e paginação feitas no servidor.
//  Tudo fica no endereço: catalogo.html?tipo=filme&genero=3&ordem=nota&p=2
// =====================================================================
(async () => {
  const filtros = new URLSearchParams(location.search);
  const tipo = filtros.get('tipo');
  // Marca "Filmes" ou "Séries" na barra de navegação (é desenhada a seguir pelo js/comum/topo-e-rodape.js)
  document.body.dataset.menu = tipo === 'filme' ? 'Filmes' : tipo === 'serie' ? 'Séries' : '';

  let d, opcoes;
  try {
    [d, opcoes] = await Promise.all([api('/api/titulos?' + filtros), api('/api/titulos/opcoes')]);
  } catch (e) {
    return mostrarErro(e.message);
  }
  const nomeTipo = tipo === 'filme' ? 'Filmes' : tipo === 'serie' ? 'Séries' : 'Catálogo';
  document.title = `${nomeTipo} – TavDex`;
  const NOMES_ORDEM = { recentes: 'Mais recentes', nota: 'Melhor avaliados', populares: 'Mais populares', nome: 'Nome (A–Z)', ano: 'Ano (mais antigos)' };
  const sel = (nome, valor) => filtros.get(nome) === String(valor) ? 'selected' : '';

  // Atalhos de géneros (mantêm os outros filtros)
  const linkGenero = id => { const f = new URLSearchParams(filtros); f.delete('p'); if (id) f.set('genero', id); else f.delete('genero'); return '?' + f; };

  mostrar(`<div class="content"><div class="left">
    <h1 class="ph">${nomeTipo}</h1>
    <div class="gchips"><a href="${linkGenero('')}" class="${filtros.get('genero') ? '' : 'on'}">Todos</a>
      ${opcoes.generos.map(g => `<a href="${linkGenero(g.id)}" class="${sel('genero', g.id) ? 'on' : ''}">${esc(g.nome)}</a>`).join('')}</div>
    <form class="cf" id="filtros">
      <input name="q" type="search" value="${esc(filtros.get('q') || '')}" placeholder="Pesquisar por nome ou realizador" aria-label="Pesquisar">
      <select name="tipo" aria-label="Tipo"><option value="">Filmes e séries</option>
        <option value="filme" ${sel('tipo', 'filme')}>Filmes</option><option value="serie" ${sel('tipo', 'serie')}>Séries</option></select>
      <select name="genero" aria-label="Género"><option value="">Todos os géneros</option>${opcoes.generos.map(g => `<option value="${g.id}" ${sel('genero', g.id)}>${esc(g.nome)}</option>`).join('')}</select>
      <select name="ano" aria-label="Ano"><option value="">Todos os anos</option>${opcoes.anos.map(a => `<option ${sel('ano', a)}>${a}</option>`).join('')}</select>
      <select name="plataforma" aria-label="Plataforma"><option value="">Todas as plataformas</option>${opcoes.plataformas.map(p => `<option value="${p.id}" ${sel('plataforma', p.id)}>${esc(p.nome)}</option>`).join('')}</select>
      <select name="ordem" aria-label="Ordenar">${opcoes.ordens.map(o => `<option value="${o}" ${sel('ordem', o)}>${NOMES_ORDEM[o]}</option>`).join('')}</select>
      <button class="btn ghost sm">Aplicar</button>
    </form>
    <p class="cr">${d.total} resultado${d.total === 1 ? '' : 's'}</p>
    ${grelha(d.titulos, 'Nenhum título encontrado com estes filtros.')}
    ${paginacao(d.total, d.pagina, d.porPagina)}
  </div></div>`);

  // Os filtros mudam o endereço (assim dá para partilhar o link e usar o "voltar")
  const form = document.getElementById('filtros');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const novos = new URLSearchParams();
    for (const [k, v] of new FormData(form)) if (v) novos.set(k, v);
    location.search = novos;
  });
  form.querySelectorAll('select').forEach(s => s.addEventListener('change', () => form.requestSubmit()));
  document.querySelector('.pg')?.addEventListener('click', e => {
    const a = e.target.closest('[data-pagina]');
    if (!a) return;
    e.preventDefault();
    filtros.set('p', a.dataset.pagina);
    location.search = filtros;
  });
})();
