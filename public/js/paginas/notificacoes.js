// =====================================================================
//  Notificações: lista, marcar como lidas e silenciar por tipo
// =====================================================================
(async () => {
  if (!(await sessao)) return irLogin();
  const tipo = param('tipo') || '';
  const pagina = Number(param('p')) || 1;

  const NOMES = {
    seguidor: ['👤', 'Novos seguidores'], comentario: ['💬', 'Comentários e respostas'], gosto: ['❤️', 'Gostos'],
    candidatura: ['🎬', 'Candidaturas'], mensagem: ['✉️', 'Mensagens'], projeto: ['🎥', 'Projetos que acompanho'], sistema: ['⚙️', 'Avisos do sistema'],
  };

  const d = await api(`/api/comunidade/notificacoes?tipo=${encodeURIComponent(tipo)}&p=${pagina}`);

  mostrar(`<div class="content"><div class="left">
    <div class="ah"><h1 class="ph">Notificações</h1>
      <button class="btn ghost sm" id="todas-lidas">Marcar todas como lidas</button></div>
    <div class="dcols"><div>
      <div class="tabs links"><a href="/notificacoes.html" class="${tipo ? '' : 'on'}">Todas</a>
        ${d.tipos.map(t => `<a href="/notificacoes.html?tipo=${t}" class="${tipo === t ? 'on' : ''}">${NOMES[t][0]} ${NOMES[t][1]}</a>`).join('')}</div>
      ${d.notificacoes.map(n => `<div class="box li notif ${n.lida ? '' : 'unread'}">
          <span class="ni">${(NOMES[n.tipo] || ['🔔'])[0]}</span>
          <a href="/${esc(n.link)}" data-ler="${n.id}">${esc(n.texto)}<small class="muted">${tempo(n.criado_em)}</small></a>
          ${n.lida ? '' : `<button class="del-btn" data-marcar="${n.id}" title="Marcar como lida">✓</button>`}</div>`).join('')
        || '<p class="empty">Não tens notificações.</p>'}
      ${paginacao(d.total, d.pagina, d.porPagina)}
    </div><div>
      <form class="box nset" id="f-silenciar"><h3>Silenciar notificações</h3>
        ${d.tipos.map(t => `<label><input type="checkbox" name="tipos" value="${t}" data-lista ${d.silenciadas.includes(t) ? 'checked' : ''}> ${NOMES[t][0]} ${NOMES[t][1]}</label>`).join('')}
        <small>Os tipos marcados deixam de criar notificações (e emails).</small>
        <button class="btn primary sm">Guardar</button>
      </form>
    </div></div>
  </div></div>`);

  const app = document.getElementById('app');
  app.addEventListener('click', async e => {
    // Abrir uma notificação marca-a como lida
    const ler = e.target.closest('[data-ler]');
    if (ler) {
      e.preventDefault();
      await api(`/api/comunidade/notificacoes/${ler.dataset.ler}/lida`, 'POST').catch(() => {});
      location.href = ler.getAttribute('href');
    }
    const marcar = e.target.closest('[data-marcar]');
    if (marcar && await tentar(() => api(`/api/comunidade/notificacoes/${marcar.dataset.marcar}/lida`, 'POST'))) location.reload();
    if (e.target.id === 'todas-lidas' && await tentar(() => api('/api/comunidade/notificacoes/lidas', 'POST'))) location.reload();
    const pg = e.target.closest('[data-pagina]');
    if (pg) { e.preventDefault(); location.search = `?tipo=${encodeURIComponent(tipo)}&p=${pg.dataset.pagina}`; }
  });

  document.getElementById('f-silenciar').addEventListener('submit', async e => {
    e.preventDefault();
    const tipos = [...e.target.querySelectorAll('[name=tipos]:checked')].map(c => c.value);
    if (await tentar(() => api('/api/comunidade/notificacoes/silenciadas', 'PUT', { tipos }))) aviso('Preferências guardadas.');
  });
})();
