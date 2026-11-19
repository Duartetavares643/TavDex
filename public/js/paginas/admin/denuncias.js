// =====================================================================
//  Painel de administração – Denúncias: ver o conteúdo denunciado, apagar, resolver, ignorar ou reabrir
//  painel = { u, app, moldura, recarregar } (vem do js/paginas/admin.js)
// =====================================================================
async function adminDenuncias(painel) {
  const { moldura, recarregar, app } = painel;
  const estado = param('estado') || 'pendente';
  const d = await api('/api/admin/denuncias?estado=' + estado);
  const NOMES = { publicacao: 'Publicação', comentario: 'Comentário', review: 'Review', mensagem: 'Mensagem' };
  moldura(`<div class="tabs links">${['pendente', 'resolvida', 'ignorada'].map(e => `<a href="/admin.html?s=denuncias&estado=${e}" class="${estado === e ? 'on' : ''}">${e[0].toUpperCase() + e.slice(1)}s</a>`).join('')}</div>
    ${d.denuncias.map(x => `<div class="box"><div class="li" style="border:0;padding:0">
        <div><b>${NOMES[x.tipo]}</b> · ${esc(x.motivo)} ${badgeEstado(x.estado)}<small>Denunciado por ${esc(x.denunciante)} · ${tempo(x.criado_em)}</small></div>
        <div class="cact">${x.estado === 'pendente' ? `
          ${x.conteudo ? `<button class="btn primary sm" data-apagar-conteudo="${x.id}">Apagar conteúdo</button>` : ''}
          <button class="btn ghost sm" data-den="${x.id}" data-estado="resolvida">Resolvida</button>
          <button class="btn ghost sm" data-den="${x.id}" data-estado="ignorada">Ignorar</button>`
          : `<button class="btn ghost sm" data-den="${x.id}" data-estado="pendente">Reabrir</button>`}</div></div>
      ${x.conteudo ? `<blockquote class="box" style="margin:12px 0 0;background:var(--surface-2)"><b>${esc(x.conteudo.autor)}:</b> ${paragrafos(x.conteudo.texto || '(sem texto)')}
          ${x.conteudo.link ? ` <a class="lk" href="/${esc(x.conteudo.link)}">abrir →</a>` : ''}</blockquote>`
        : '<p class="muted" style="margin-top:8px">O conteúdo já foi apagado.</p>'}</div>`).join('') || '<p class="empty">Não há denúncias aqui. 🎉</p>'}`);

  app.addEventListener('click', async e => {
    const b = e.target.closest('[data-den]');
    if (b && await tentar(() => api('/api/admin/denuncias/' + b.dataset.den, 'PUT', { estado: b.dataset.estado }))) recarregar();
    const c = e.target.closest('[data-apagar-conteudo]');
    if (c && confirm('Apagar o conteúdo denunciado?') && await tentar(() => api(`/api/admin/denuncias/${c.dataset.apagarConteudo}/conteudo`, 'DELETE'))) recarregar();
  });
}
