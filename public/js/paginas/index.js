// =====================================================================
//  Página inicial: destaque grande no topo e filas de cartazes por tema
//  (ao estilo de uma plataforma de streaming). Dados: GET /api/titulos/inicio
// =====================================================================
(async () => {
  const u = await sessao;
  let d;
  try {
    d = await api('/api/titulos/inicio');
  } catch (e) {
    return mostrarErro(e.message);
  }

  // Duração: "2h 46m" nos filmes, "3 temporadas" nas séries
  const duracao = t => t.duracao_min
    ? `${Math.floor(t.duracao_min / 60)}h ${String(t.duracao_min % 60).padStart(2, '0')}m`
    : (t.temporadas ? `${t.temporadas} temporada${t.temporadas > 1 ? 's' : ''}` : '');

  // Fila horizontal de cartazes (largos = cartões com imagem horizontal)
  const fila = (nome, titulos, link, largos = false) => !titulos.length ? '' : `
    <section class="row"><div class="row-head"><h2>${esc(nome)}</h2><a href="${link}">Ver tudo →</a></div>
      <div class="hrow${largos ? '' : ' cartazes'}">${titulos.map(largos ? cartaoFila : cartaoTitulo).join('')}</div></section>`;

  const destaque = d.destaques.map((t, i) => {
    const img = urlSegura(t.fundo);
    return `<div class="slide${i ? '' : ' on'}" style="--h:${corDe(t.nome)}${img ? `;--img:url('${img}')` : ''}">
      <div class="ht">
        <span class="rank"><b>TOP</b> N.º ${i + 1} no TavDex · ${t.tipo === 'filme' ? 'Filme' : 'Série'}</span>
        <h1>${esc(t.nome)}</h1>
        <p class="meta"><span class="star"><i class="st">★</i> ${media(t)}</span><span>${t.ano}</span>
          ${duracao(t) ? `<span>${duracao(t)}</span>` : ''}<span>${esc(t.generos.join(' · '))}</span><span class="age">${esc(t.idade)}</span></p>
        <p class="desc">${esc(t.sinopse)}</p>
        <div class="btns"><a href="/titulo.html?id=${t.id}" class="btn light">▶ Ver detalhes</a>
          ${u ? `<button class="btn ghost" data-ver="${t.id}">+ A minha lista</button>` : ''}</div>
      </div></div>`;
  }).join('');

  const top10 = !d.top10.length ? '' : `<section class="row"><div class="row-head"><h2>Top 10 no TavDex</h2>
      <a href="/catalogo.html?ordem=nota">Ver tudo →</a></div>
    <div class="hrow top10">${d.top10.map((t, i) => `<a class="t10" href="/titulo.html?id=${t.id}" title="${esc(t.nome)}">
      <span class="t10-n">${i + 1}</span>${cartaz(t)}<span class="sr">${esc(t.nome)}</span></a>`).join('')}</div></section>`;

  mostrar(`
    ${d.destaques.length ? `<section class="hero2" aria-label="Em destaque">${destaque}
      <div class="hctl"><div class="hdots">${d.destaques.map((t, i) => `<i class="${i ? '' : 'on'}" data-i="${i}"></i>`).join('')}</div>
        <button type="button" data-hs="-1" aria-label="Anterior">‹</button><button type="button" data-hs="1" aria-label="Seguinte">›</button></div>
    </section>` : ''}
    <div class="wrap ${d.destaques.length ? 'filas' : ''}">
      ${u ? '' : `<div class="box cta"><div><b>Junta-te ao TavDex</b><p>Avalia filmes e séries, cria listas, recebe recomendações e apresenta os teus projetos.</p></div>
        <a class="btn primary sm" href="/registar.html">Criar conta grátis</a></div>`}
      ${u ? fila('A minha lista', d.minhaLista, '/listas.html') : ''}
      ${u ? fila('Recomendado para ti', d.recomendados, `/perfil.html?u=${encodeURIComponent(u.nome)}#recomendados`) : ''}
      ${top10}
      ${fila('Mais populares', d.populares, '/catalogo.html?ordem=populares', true)}
      ${d.generos.map(g => fila(g.nome, g.titulos, `/catalogo.html?genero=${g.id}`)).join('')}
      ${fila('Novidades', d.novidades, '/catalogo.html?ordem=recentes')}
      <section class="row"><div class="row-head"><h2>Projetos da comunidade</h2><a href="/projetos.html">Ver tudo →</a></div>
        <div class="pjrow">${d.projetos.map(cartaoProjeto).join('')}</div></section>
    </div>`);

  const hero = document.querySelector('.hero2');
  if (hero) iniciarDestaque(hero);

  // "+ A minha lista" no destaque: põe na lista "a ver"
  document.getElementById('app').addEventListener('click', async e => {
    const b = e.target.closest('[data-ver]');
    if (!b) return;
    const r = await tentar(() => api(`/api/listas/${b.dataset.ver}/ver`, 'POST'));
    if (r) b.textContent = r.ativo ? '✓ Na minha lista' : '+ A minha lista';
  });
})();
