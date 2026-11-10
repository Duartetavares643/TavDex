// =====================================================================
//  Perfil público de um utilizador (Passo 9) – perfil.html?u=nome ou /perfil/nome
//  Qualquer visitante vê; seguir e enviar mensagem pedem login.
//  Dados: GET /api/utilizadores/:nome
// =====================================================================
(async () => {
  const u = await sessao;
  const nome = param('u') || (u && u.nome);
  if (!nome) return irLogin();

  let d;
  try {
    d = await api('/api/utilizadores/' + encodeURIComponent(nome));
  } catch (e) {
    document.title = 'Perfil não encontrado – TavDex';
    return mostrarErro(e.status === 404 ? 'Este perfil não existe' : e.message);
  }
  const p = d.perfil;
  const c = d.contagens;
  document.title = `${nomeVisivel(p)} (@${p.nome}) – TavDex`;
  const max = d.generos.length ? d.generos[0].n : 1;

  const listaUtilizadores = (lista, vazio) => !lista.length ? `<p class="empty">${vazio}</p>`
    : `<div class="ulist">${lista.map(s => `<a class="rv" href="/perfil.html?u=${encodeURIComponent(s.nome)}">${avatar(s)}
        <span><b>${esc(nomeVisivel(s))}</b> <small class="muted">@${esc(s.nome)}</small></span></a>`).join('')}</div>`;

  const avaliacoes = !d.avaliacoes.length ? '<p class="empty">Ainda não avaliou nenhum título.</p>'
    : d.avaliacoes.map(a => `<div class="box"><a class="lk" href="/titulo.html?id=${a.titulo_id}"><b>${esc(a.titulo)}</b></a>
        ${estrelas(a.nota)} <small class="muted">${tempo(a.criado_em)}</small>
        ${a.review ? (a.spoiler
          ? `<details class="spoiler-d"><summary>⚠ Contém spoilers – clicar para ler</summary><p>${paragrafos(a.review)}</p></details>`
          : `<p>${paragrafos(a.review)}</p>`) : ''}</div>`).join('');

  const botoes = d.meu
    ? '<a class="btn ghost sm" href="/definicoes.html">✎ Editar perfil</a>'
    : `<button class="btn ${d.sigo ? 'ghost' : 'primary'} sm" id="seguir" data-requer-login="seguir outras pessoas"
          aria-pressed="${d.sigo}">${d.sigo ? 'A seguir ✓' : '+ Seguir'}</button>
        <a class="btn ghost sm" href="/chat.html?com=${p.id}" data-requer-login="enviar mensagens">Mensagem</a>`;

  // Perfil acabado de criar: cartão de boas-vindas só para o dono
  const vazio = d.meu && !p.bio && !d.avaliacoes.length && !d.favoritos.length && !c.seguidores && !c.a_seguir;
  const boasVindas = !vazio ? '' : `<div class="box cta boas-vindas"><div>
      <b>Bem-vindo ao TavDex, ${esc(nomeVisivel(p))}!</b>
      <p>O teu perfil ainda está vazio. Avalia o que já viste, segue outras pessoas e conta um pouco sobre ti.</p></div>
      <div class="btns"><a class="btn primary sm" href="/catalogo.html">Explorar o catálogo</a>
        <a class="btn ghost sm" href="/comunidade.html">Ver a comunidade</a>
        <a class="btn ghost sm" href="/definicoes.html">Completar o perfil</a></div></div>`;

  // Cabeçalho com o banner em pixel art (cenário e cor escolhidos pelo dono do perfil).
  // cabecalhoPerfil() (main.js) valida a cor e o cenário e escapa todo o texto.
  mostrar(`<div class="content"><div class="left">
    ${cabecalhoPerfil(p, { acoes: botoes, contagens: c })}
    ${boasVindas}

    <div class="dcols"><div>
      <div class="tabsbox">
        <div class="tabs">
          <button data-tab="fav" class="on">Favoritos (${d.favoritos.length})</button>
          <button data-tab="ava">Avaliações (${c.avaliacoes})</button>
          <button data-tab="seg">Seguidores</button>
          <button data-tab="aseg">A seguir</button>
          <button data-tab="ver">A ver (${d.paraVer.length})</button>
          <button data-tab="vis">Vistos (${c.vistos})</button>
          <button data-tab="prj">Projetos</button>
          ${d.meu ? '<button data-tab="recomendados">Recomendados</button>' : ''}
        </div>
        <div data-pane="fav">${grelha(d.favoritos, 'Ainda não há favoritos.')}</div>
        <div data-pane="ava" hidden>${avaliacoes}</div>
        <div data-pane="seg" hidden id="lista-seguidores">${listaUtilizadores(d.seguidores, 'Ainda não tem seguidores.')}</div>
        <div data-pane="aseg" hidden>${listaUtilizadores(d.aSeguir, 'Ainda não segue ninguém.')}</div>
        <div data-pane="ver" hidden>${grelha(d.paraVer, 'A lista está vazia.')}</div>
        <div data-pane="vis" hidden>${grelha(d.vistos, 'Ainda não marcou nada como visto.')}</div>
        <div data-pane="prj" hidden>${d.projetos.length ? `<div class="pjc">${d.projetos.map(cartaoProjeto).join('')}</div>` : '<p class="empty">Sem projetos.</p>'}</div>
        ${d.meu ? `<div data-pane="recomendados" hidden>${grelha(d.recomendados, 'Avalia alguns títulos com 4 ou 5 estrelas para receberes recomendações.')}</div>` : ''}
      </div>
    </div><div>
      <div class="box"><h3>Géneros preferidos</h3>
        ${d.generos.length ? d.generos.map(g => `<div class="rb"><span class="gname">${esc(g.nome)}</span>
          <div class="bar"><i style="width:${Math.round(g.n * 100 / max)}%"></i></div><span>${g.n}</span></div>`).join('') : '<p class="empty">Sem dados ainda.</p>'}
      </div>
      <div class="box"><h3>Atividade recente</h3><div class="tl">
        ${d.avaliacoes.slice(0, 4).map(a => `<p>Avaliou ${esc(a.titulo)} com ${a.nota}★<small>${tempo(a.criado_em)}</small></p>`).join('')
          || `<p>Juntou-se ao TavDex<small>${tempo(p.criado_em)}</small></p>`}
      </div></div>
    </div></div>
  </div></div>`);
  abrirSeparadorDoEndereco();

  // Seguir / deixar de seguir: o número de seguidores muda sem recarregar.
  // Um visitante vê a janela de login (data-requer-login), por isso aqui já há sessão.
  const b = document.getElementById('seguir');
  if (b) b.addEventListener('click', async () => {
    b.disabled = true;
    try {
      const r = await TavDex.pedido(`/api/seguir/${p.id}`, null, 'seguir outras pessoas');
      if (!r) return;
      b.textContent = r.a_seguir ? 'A seguir ✓' : '+ Seguir';
      b.className = `btn ${r.a_seguir ? 'ghost' : 'primary'} sm`;
      b.setAttribute('aria-pressed', r.a_seguir);
      document.getElementById('n-seg').textContent = r.seguidores;
    } catch (erro) {
      aviso(erro.message, 'erro');
    } finally {
      b.disabled = false;
    }
  });
})();
