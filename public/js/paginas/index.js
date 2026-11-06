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

  // Fila horizontal de cartazes (largos = cartões com imagem horizontal), com setas ‹ ›
  const fila = (nome, titulos, link, largos = false) => !titulos.length ? '' : `
    <section class="row"><div class="row-head"><h2>${esc(nome)}</h2>${setasFila()}<a href="${link}">Ver tudo →</a></div>
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
          <button class="btn ghost" data-ver="${t.id}" data-requer-login="pôr títulos na lista «A ver»">+ A ver</button></div>
      </div></div>`;
  }).join('');

  const top10 = !d.top10.length ? '' : `<section class="row"><div class="row-head"><h2>Top 10 no TavDex</h2>
      ${setasFila()}<a href="/catalogo.html?ordem=nota">Ver tudo →</a></div>
    <div class="hrow top10">${d.top10.map((t, i) => `<a class="t10" href="/titulo.html?id=${t.id}" title="${esc(t.nome)}">
      <span class="t10-n">${i + 1}</span>${cartaz(t)}<span class="sr">${esc(t.nome)}</span></a>`).join('')}</div></section>`;

  mostrar(`
    ${d.destaques.length ? `<section class="hero2" aria-label="Em destaque">${destaque}
      <div class="hctl"><div class="hdots">${d.destaques.map((t, i) => `<i class="${i ? '' : 'on'}" data-i="${i}"></i>`).join('')}</div>
        <button type="button" data-hs="-1" aria-label="Anterior">‹</button><button type="button" data-hs="1" aria-label="Seguinte">›</button></div>
    </section>` : ''}
    <div class="wrap ${d.destaques.length ? 'filas' : ''}">
      ${u ? fila('A minha lista', d.minhaLista, '/listas.html') : ''}
      ${top10}
      ${u ? fila('Recomendado para ti', d.recomendados, `/perfil.html?u=${encodeURIComponent(u.nome)}#recomendados`)
        : `<section class="row"><div class="row-head"><h2>Recomendado para ti</h2></div>
          <div class="box cta"><div><b>Cria conta para receberes recomendações à tua medida</b>
            <p>Avalia filmes e séries com 4 ou 5 estrelas e o TavDex sugere-te títulos dos géneros de que gostas.</p></div>
          <a class="btn primary sm" href="/registar.html">Criar conta grátis</a></div></section>`}
      ${fila('Mais populares', d.populares, '/catalogo.html?ordem=populares', true)}
      ${d.generos.map(g => fila(g.nome, g.titulos, `/catalogo.html?genero=${g.id}`)).join('')}
      ${fila('Novidades', d.novidades, '/catalogo.html?ordem=recentes')}
      ${d.projetos.length ? `<section class="row"><div class="row-head"><h2>Projetos da comunidade</h2><a href="/projetos.html">Ver tudo →</a></div>
        <div class="pjrow">${d.projetos.map(cartaoProjeto).join('')}</div></section>` : ''}
    </div>`);

  const hero = document.querySelector('.hero2');
  if (hero) iniciarDestaque(hero);

  // "+ A ver" no destaque: põe (ou tira) o título da lista "A ver".
  // Um visitante vê a janela de login (data-requer-login), por isso aqui já há sessão.
  document.getElementById('app').addEventListener('click', async e => {
    const b = e.target.closest('[data-ver]');
    if (!b) return;
    const r = await TavDex.pedido(`/api/listas/${b.dataset.ver}/ver`, null, 'pôr títulos na lista «A ver»').catch(erro => aviso(erro.message, 'erro'));
    if (r) b.textContent = r.ativo ? '✓ Na lista A ver' : '+ A ver';
  });
})();
