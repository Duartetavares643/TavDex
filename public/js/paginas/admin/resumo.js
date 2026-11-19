// =====================================================================
//  Painel de administração – Resumo: números do site, registos dos últimos 6 meses e títulos mais avaliados
//  painel = { u, app, moldura, recarregar } (vem do js/paginas/admin.js)
// =====================================================================
async function adminResumo(painel) {
  const { moldura } = painel;
  const d = await api('/api/admin/estatisticas');
  const cartao = (c, icone, n, nome, link) => `<div class="sc" style="--c:${c}"><span class="si">${icone}</span>
    <div><b>${n}</b><span>${nome}</span>${link ? `<small><a href="${link}">ver →</a></small>` : ''}</div></div>`;
  const maxMes = Math.max(1, ...d.porMes.map(m => m.n));
  moldura(`<div class="sg">
      ${cartao(330, '👥', d.utilizadores, 'Utilizadores', '/admin.html?s=utilizadores')}
      ${cartao(270, '🎬', d.titulos, 'Filmes e séries', '/admin.html?s=titulos')}
      ${cartao(45, '★', d.avaliacoes, 'Avaliações')}
      ${cartao(150, '🎥', d.projetos, 'Projetos', '/projetos.html')}
      ${cartao(200, '📝', d.publicacoes, 'Publicações', '/comunidade.html')}
      ${cartao(180, '✉️', d.mensagens, 'Mensagens')}
      ${cartao(0, '⚑', d.denuncias, 'Denúncias pendentes', '/admin.html?s=denuncias')}
      ${cartao(215, '⛔', d.bloqueados, 'Contas bloqueadas')}
    </div>
    <div class="dcols"><div class="box"><h3>Novos registos (últimos 6 meses)</h3>
      <div class="bars">${d.porMes.map(m => `<div><i style="height:${Math.round(m.n * 100 / maxMes)}%"></i>${m.n}<br>${m.mes.slice(5)}/${m.mes.slice(2, 4)}</div>`).join('') || '<p class="empty">Sem registos.</p>'}</div></div>
      <div class="box"><h3>Mais avaliados</h3>${d.topTitulos.map(t => `<div class="li"><a class="lk-u" href="/titulo.html?id=${t.id}">${esc(t.nome)}</a>
        <span class="muted">${t.total_avaliacoes} · <i class="st">★</i> ${media(t)}</span></div>`).join('')}</div></div>`);
}
