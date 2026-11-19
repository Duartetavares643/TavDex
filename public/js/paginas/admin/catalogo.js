// =====================================================================
//  Painel de administração – Géneros, plataformas e pessoas
//  painel = { u, app, moldura, recarregar } (vem do js/paginas/admin.js)
// =====================================================================
async function adminCatalogo(painel) {
  const { moldura, recarregar, app } = painel;
  const [opcoes, { pessoas }] = await Promise.all([api('/api/titulos/opcoes'), api('/api/titulos/pessoas/lista?q=')]);
  moldura(`<div class="g3 grid">
    <div class="box"><h3>Géneros</h3>
      ${opcoes.generos.map(g => `<div class="li"><span>${esc(g.nome)}</span><button class="del-btn" data-apagar="generos/${g.id}" data-nome="${esc(g.nome)}">Apagar</button></div>`).join('')}
      <form class="inline-form" id="f-genero" novalidate><input name="nome" placeholder="Novo género" required maxlength="40"><button class="btn ghost sm">Adicionar</button><p class="msg" role="alert"></p></form>
    </div>
    <div class="box"><h3>Plataformas</h3>
      ${opcoes.plataformas.map(p => `<form class="li inline-form" data-plataforma="${p.id}" style="flex-wrap:wrap">
          <input name="nome" value="${esc(p.nome)}" required maxlength="40" aria-label="Nome" style="flex:1 1 120px">
          <input name="cor" type="color" value="${esc(p.cor)}" aria-label="Cor">
          <input name="url" type="url" value="${esc(p.url)}" placeholder="https://site" aria-label="Site" style="flex:1 1 160px">
          <input name="logo" type="url" value="${esc(p.logo || '')}" placeholder="Logótipo (https)" aria-label="Logótipo" style="flex:1 1 160px">
          <button class="btn ghost sm">Guardar</button><button type="button" class="del-btn" data-apagar="plataformas/${p.id}" data-nome="${esc(p.nome)}">Apagar</button></form>`).join('')}
      <form class="inline-form" id="f-plataforma" novalidate><input name="nome" placeholder="Nova plataforma" required maxlength="40">
        <input name="cor" type="color" value="#888888" aria-label="Cor"><input name="url" type="url" placeholder="https://site">
        <button class="btn ghost sm">Adicionar</button><p class="msg" role="alert"></p></form>
    </div>
    <div class="box"><h3>Pessoas (${pessoas.length})</h3>
      ${pessoas.map(p => `<div class="li"><div><b>${esc(p.nome)}</b><small>${p.n_titulos} título(s)</small></div>
        <button class="del-btn" data-apagar="pessoas/${p.id}" data-nome="${esc(p.nome)}">Apagar</button></div>`).join('') || '<p class="empty">Sem pessoas.</p>'}
      <small class="muted">As pessoas juntam-se aos filmes/séries na página de edição de cada título.</small>
    </div></div>`);

  ligarForm(document.getElementById('f-genero'), async dados => { await api('/api/titulos/generos', 'POST', dados); recarregar(); });
  ligarForm(document.getElementById('f-plataforma'), async dados => { await api('/api/titulos/plataformas', 'POST', dados); recarregar(); });
  document.querySelectorAll('[data-plataforma]').forEach(f => ligarForm(f, async dados => {
    await api('/api/titulos/plataformas/' + f.dataset.plataforma, 'PUT', dados);
    aviso('Plataforma guardada.');
  }));
  app.addEventListener('click', async e => {
    const b = e.target.closest('[data-apagar]');
    if (b && confirm(`Apagar "${b.dataset.nome}"?`) && await tentar(() => api('/api/titulos/' + b.dataset.apagar, 'DELETE'))) recarregar();
  });
}
