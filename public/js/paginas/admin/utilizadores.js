// =====================================================================
//  Painel de administração – Utilizadores: procurar, bloquear/desbloquear e dar/tirar o papel de admin
//  painel = { u, app, moldura, recarregar } (vem do js/paginas/admin.js)
// =====================================================================
async function adminUtilizadores(painel) {
  const { moldura, recarregar, app, u } = painel;
  const q = param('q') || '';
  const d = await api(`/api/admin/utilizadores?q=${encodeURIComponent(q)}&p=${Number(param('p')) || 1}`);
  moldura(`<form class="cf" method="get"><input type="hidden" name="s" value="utilizadores">
      <input name="q" type="search" value="${esc(q)}" placeholder="Procurar por nome ou email"><button class="btn ghost sm">Procurar</button></form>
    <p class="cr">${d.total} utilizadores</p>
    <div class="tscroll"><table><thead><tr><th>Utilizador</th><th>Email</th><th>Papel</th><th>Avaliações</th><th>Desde</th><th class="ac">Ações</th></tr></thead><tbody>
      ${d.utilizadores.map(x => `<tr><td><div class="uc">${avatar(x)}${linkPerfil(x)}</div></td><td>${esc(x.email)}</td>
        <td>${x.papel === 'admin' ? '<span class="badge" style="--c:330">Admin</span>' : 'Utilizador'} ${x.bloqueado ? '<span class="badge" style="--c:0">Bloqueado</span>' : ''}</td>
        <td>${x.n_avaliacoes}</td><td>${dataCurta(x.criado_em)}</td>
        <td class="ac">${x.id === u.id ? '<span class="muted">(tu)</span>' : `
          <button class="btn ghost sm" data-u="${x.id}" data-campo="bloqueado" data-valor="${x.bloqueado ? 0 : 1}">${x.bloqueado ? 'Desbloquear' : 'Bloquear'}</button>
          <button class="btn ghost sm" data-u="${x.id}" data-campo="papel" data-valor="${x.papel === 'admin' ? 'utilizador' : 'admin'}">${x.papel === 'admin' ? 'Tirar admin' : 'Tornar admin'}</button>`}</td></tr>`).join('')}
    </tbody></table></div>${paginacao(d.total, d.pagina, d.porPagina)}`);

  app.addEventListener('click', async e => {
    const b = e.target.closest('[data-u]');
    if (b && confirm(`${b.textContent.trim()}?`) && await tentar(() => api('/api/admin/utilizadores/' + b.dataset.u, 'PUT', { [b.dataset.campo]: b.dataset.valor }))) recarregar();
    const pg = e.target.closest('[data-pagina]');
    if (pg) { e.preventDefault(); location.search = `?s=utilizadores&q=${encodeURIComponent(q)}&p=${pg.dataset.pagina}`; }
  });
}
