// =====================================================================
//  Comunidade: feed de publicações, gostos, comentários e respostas.
//  Separadores "Tudo" e "A seguir". Ver é livre; participar pede login.
// =====================================================================
(async () => {
  const u = await sessao;
  const filtro = param('filtro') === 'seguir' && u ? 'seguir' : 'todos';
  const pagina = Number(param('p')) || 1;
  // Para escolher o filme/série de que se fala, usa a lista do catálogo
  let titulos = [];

  // Pede o feed (com o filtro e a página escolhidos) e desenha-o
  async function carregar() {
    let d;
    try {
      d = await api(`/api/comunidade/feed?filtro=${filtro}&p=${pagina}`);
    } catch (e) {
      return mostrarErro(e.message);
    }
    desenhar(d);
  }

  // Comentários em árvore: primeiro os principais, por baixo as respostas
  function comentarios(lista, paiId, pub) {
    return lista.filter(c => (c.pai_id || null) === paiId).map(c => {
      const respostas = comentarios(lista, c.id, pub);
      return `
      <div class="cm">${avatar(c)}<div class="cmb">
        <b>${linkPerfil(c)}</b> <small>${tempo(c.criado_em)}</small><p>${paragrafos(c.texto)}</p>
        ${u ? `<details class="reply"><summary>Responder</summary>
          <form class="inline-form" data-comentar="${pub}" data-pai="${c.id}"><input name="texto" required maxlength="1000" placeholder="Escreve uma resposta...">
          <button class="btn ghost sm">Enviar</button></form></details>` : ''}
        ${respostas ? `<div class="cms">${respostas}</div>` : ''}
      </div>
      <div class="acts">${u && (u.id === c.utilizador_id || u.papel === 'admin') ? `<button class="del-btn" data-apagar-com="${c.id}" title="Apagar">🗑</button>` : ''}
        ${u && u.id !== c.utilizador_id ? botaoDenunciar('comentario', c.id) : ''}</div></div>`;
    }).join('');
  }

  // HTML de uma publicação (texto, gosto, comentários e respostas)
  function publicacao(p) {
    const texto = p.spoiler
      ? `<details class="spoiler-d"><summary>⚠ Contém spoilers${p.titulo_nome ? ' de ' + esc(p.titulo_nome) : ''} – mostrar</summary><p>${paragrafos(p.texto)}</p></details>`
      : `<p>${paragrafos(p.texto)}</p>`;
    return `<article class="box post" id="pub${p.id}">
      <div class="rv">${avatar(p)}<div class="cmb"><b>${linkPerfil(p)}</b> ${p.papel === 'admin' ? '<span class="badge" style="--c:330">Admin</span>' : ''}
        <small> · ${tempo(p.criado_em)}</small>
        ${p.titulo_id ? `<a class="tg" href="/titulo.html?id=${p.titulo_id}">🎬 ${esc(p.titulo_nome)}</a>` : ''}
        ${p.projeto_id ? `<a class="tg" href="/projeto.html?id=${p.projeto_id}">🎥 ${esc(p.projeto_titulo)}</a>` : ''}
        ${texto}</div>
        <div class="acts">${u && (u.id === p.utilizador_id || u.papel === 'admin') ? `<button class="del-btn" data-apagar-pub="${p.id}" title="Apagar">🗑</button>` : ''}
          ${u && u.id !== p.utilizador_id ? botaoDenunciar('publicacao', p.id) : ''}</div></div>
      <div class="btns" style="margin:10px 0 0 48px">
        <button class="del-btn" data-gosto="${p.id}" aria-pressed="${!!p.gostei}">${p.gostei ? '❤️' : '🤍'} <span>${p.gostos}</span></button>
        <span class="muted">💬 ${p.comentarios.length}</span></div>
      <div class="cms">${comentarios(p.comentarios, null, p.id)}
        ${u ? `<form class="inline-form" data-comentar="${p.id}"><input name="texto" required maxlength="1000" placeholder="Escreve um comentário...">
          <button class="btn ghost sm">Comentar</button></form>` : ''}</div>
    </article>`;
  }

  // Desenha a página: formulário para publicar, filtros e o feed
  function desenhar(d) {
    const formulario = u ? `<form class="box form" id="f-publicar" novalidate>
        <div class="rv">${avatar(u)}<textarea name="texto" maxlength="1000" required placeholder="O que andas a ver? Partilha com a comunidade..." style="flex:1"></textarea></div>
        <div class="row2">
          <label>Sobre um filme/série (opcional)<select name="titulo_id"><option value="">—</option>
            ${titulos.map(t => `<option value="${t.id}">${esc(t.nome)} (${t.ano})</option>`).join('')}</select></label>
          <label class="chk"><input type="checkbox" name="spoiler"> Tem spoilers</label>
          <button class="btn primary sm">Publicar</button>
        </div><p class="msg" role="alert"></p></form>`
      : `<div class="box cta"><div><b>Junta-te à conversa</b><p>Entra para publicar, comentar e seguir outros fãs.</p></div>
          <a class="btn primary sm" href="/login.html" data-requer-login="publicar na comunidade">Entrar</a></div>`;

    mostrar(`<div class="content"><div class="left narrow">
      <h1 class="ph">Comunidade</h1>
      ${formulario}
      <div class="tabs links"><a href="/comunidade.html" class="${filtro === 'todos' ? 'on' : ''}">Tudo</a>
        ${u ? `<a href="/comunidade.html?filtro=seguir" class="${filtro === 'seguir' ? 'on' : ''}">A seguir</a>` : ''}</div>
      ${d.publicacoes.map(publicacao).join('') || `<p class="empty">${filtro === 'seguir' ? 'Quem segues ainda não publicou nada. Descobre pessoas no feed "Tudo".' : 'Ainda não há publicações.'}</p>`}
      ${paginacao(d.total, d.pagina, d.porPagina)}
    </div></div>`);

    // Ir para a publicação indicada no endereço (ex.: vindo de uma notificação)
    if (location.hash) document.querySelector(location.hash)?.scrollIntoView({ block: 'center' });

    ligarFormulario(document.getElementById('f-publicar'), async dados => {
      await api('/api/comunidade/publicacoes', 'POST', dados);
      carregar();
    });
    document.querySelectorAll('[data-comentar]').forEach(f => ligarFormulario(f, async dados => {
      await api(`/api/comunidade/publicacoes/${f.dataset.comentar}/comentarios`, 'POST', { texto: dados.texto, pai_id: f.dataset.pai || null });
      carregar();
    }));
  }

  document.getElementById('app').addEventListener('click', async e => {
    const pg = e.target.closest('[data-pagina]');
    if (pg) { e.preventDefault(); location.search = `?filtro=${filtro}&p=${pg.dataset.pagina}`; }

    const gosto = e.target.closest('[data-gosto]');
    if (gosto) {
      if (!u) return abrirJanelaLogin('gostar de publicações');
      const r = await tentar(() => api(`/api/comunidade/publicacoes/${gosto.dataset.gosto}/gosto`, 'POST'));
      if (r) gosto.innerHTML = `${r.gostei ? '❤️' : '🤍'} <span>${r.gostos}</span>`;
    }
    const pub = e.target.closest('[data-apagar-pub]');
    if (pub && confirm('Apagar a publicação?') && await tentar(() => api(`/api/comunidade/publicacoes/${pub.dataset.apagarPub}`, 'DELETE'))) carregar();
    const com = e.target.closest('[data-apagar-com]');
    if (com && confirm('Apagar o comentário (e as respostas)?') && await tentar(() => api(`/api/comunidade/comentarios/${com.dataset.apagarCom}`, 'DELETE'))) carregar();
  });

  if (u) titulos = (await api('/api/titulos/opcoes').catch(() => ({ titulos: [] }))).titulos;
  carregar();
})();
