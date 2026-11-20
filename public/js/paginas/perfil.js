// =====================================================================
//  Perfil público de um utilizador (Passo 9) – perfil.html?u=nome ou /perfil/nome
//  Qualquer visitante vê; seguir e enviar mensagem pedem login.
//  Dados: GET /api/utilizadores/:nome
//  · o @nome no endereço não distingue maiúsculas (fica corrigido para o @ certo);
//  · um @nome antigo (mudado há menos de 30 dias) vai para o perfil novo;
//  · separador "Resumo" com estatísticas; "Segue-te"; géneros favoritos; Partilhar;
//  · privacidade: listas e seguidores escondidos se o dono quiser (a API já não os envia).
// =====================================================================
(async () => {
  const u = await sessao;
  const nome = param('u') || (u && u.nome);
  if (!nome) return irLogin();

  let d;
  try {
    d = await api('/api/utilizadores/' + encodeURIComponent(nome));
  } catch (e) {
    document.title = 'Perfil não encontrado · TavDex';
    return mostrarErro(e.status === 404 ? 'Este perfil não existe' : e.message);
  }
  // @nome antigo: vai para o perfil novo (sem ficar no histórico)
  if (d.redirecionar) return location.replace('/perfil.html?u=' + encodeURIComponent(d.redirecionar) + location.hash);

  const p = d.perfil;
  const c = d.contagens;
  // O endereço passa a ter o @nome com as maiúsculas certas (ex.: ?u=duartet -> ?u=DuarteT)
  if (param('u') !== p.nome) history.replaceState(null, '', '/perfil.html?u=' + encodeURIComponent(p.nome) + location.hash);
  document.title = `${nomeVisivel(p)} (@${p.nome}) · TavDex`;
  const max = d.generos.length ? d.generos[0].n : 1;
  const totalGeneros = d.generos.reduce((s, g) => s + Number(g.n), 0) || 1;
  // Separador com ícone e o número numa pastilha (n = null: sem número)
  const separador = (tab, icone, rotulo, n, on = false) => `<button data-tab="${tab}"${on ? ' class="on"' : ''}>
      ${iconePerfil(icone)}<span>${rotulo}</span>${n === null || n === undefined ? '' : `<span class="tab-n">${Number(n) || 0}</span>`}</button>`;
  const priv = d.privacidade;

  // Estados vazios: ao dono mostra-se também o que pode fazer
  const vazio = (texto, ligacao = '') => `<p class="empty">${esc(texto)}${d.meu && ligacao ? ` ${ligacao}` : ''}</p>`;
  const linkCatalogo = '<a class="lk" href="/catalogo.html">Explorar o catálogo</a>';
  const listaPrivada = `<p class="empty">@${esc(p.nome)} escolheu não mostrar as suas listas.</p>`;
  const seguidoresPrivados = `<p class="empty">@${esc(p.nome)} escolheu não mostrar quem segue e quem o segue.</p>`;
  const soTu = mostra => mostra ? '<p class="so-tu">🔒 Só tu vês isto</p>' : '';

  const itemUtilizador = s => `<a class="rv" href="/perfil.html?u=${encodeURIComponent(s.nome)}">${avatar(s)}
      <span><b>${esc(nomeVisivel(s))}</b> <small class="muted">@${esc(s.nome)}</small></span></a>`;
  // Lista de seguidores / a seguir, com "Ver mais" (20 de cada vez)
  const listaUtilizadores = (lista, total, tipo, textoVazio) => !lista.length ? vazio(textoVazio)
    : `<div class="ulist" data-lista-u="${tipo}">${lista.map(itemUtilizador).join('')}</div>
       ${total > lista.length ? `<button class="btn ghost sm ver-mais" type="button" data-ver-mais="${tipo}" data-pagina="1">Ver mais</button>` : ''}`;

  const avaliacoes = !d.avaliacoes.length ? vazio('Ainda não há avaliações.', linkCatalogo)
    : d.avaliacoes.map(a => `<div class="box"><a class="lk" href="/titulo.html?id=${a.titulo_id}"><b>${esc(a.titulo)}</b></a>
        ${estrelas(a.nota)} <small class="muted">${tempo(a.criado_em)}</small>
        ${a.review ? (a.spoiler
          ? `<details class="spoiler-d"><summary>⚠ Contém spoilers – clicar para ler</summary><p>${paragrafos(a.review)}</p></details>`
          : `<p>${paragrafos(a.review)}</p>`) : ''}</div>`).join('');

  // ---------------------------------------------------------------
  // Resumo: média das estrelas, distribuição de 1 a 5 e atividade recente
  // (os géneros que mais avalia estão na caixa "Géneros preferidos", ao lado)
  // ---------------------------------------------------------------
  const r = d.resumo;
  const totalNotas = r.por_nota.reduce((s, n) => s + n, 0);
  const maxNota = Math.max(1, ...r.por_nota);
  const resumo = !totalNotas ? vazio('Ainda não há avaliações.', linkCatalogo) : `<div class="resumo">
      <div class="resumo-media">
        <b>${Number(r.media).toFixed(1)}</b>${estrelas(r.media)}
        <small class="muted">média de ${totalNotas} avaliaç${totalNotas === 1 ? 'ão' : 'ões'}</small>
      </div>
      <div class="resumo-barras" role="list" aria-label="Distribuição das avaliações">
        ${[5, 4, 3, 2, 1].map(n => `<div class="rb" role="listitem"><span class="gname">${n} ★</span>
          <div class="bar"><i style="width:${Math.round(r.por_nota[n - 1] * 100 / maxNota)}%"></i></div><span>${r.por_nota[n - 1]}</span></div>`).join('')}
      </div>
      <div><h3>Atividade recente</h3><div class="tl">
        ${r.recentes.map(a => `<p>Avaliou <a class="lk" href="/titulo.html?id=${a.titulo_id}">${esc(a.titulo)}</a> com ${Number(a.nota)}★<small>${tempo(a.criado_em)}</small></p>`).join('')}
        <p>Juntou-se ao TavDex<small>${tempo(p.criado_em)}</small></p>
      </div></div>
    </div>`;

  const botoes = (d.meu
    ? '<a class="btn ghost sm" href="/definicoes.html">✎ Editar perfil</a>'
    : `<button class="btn ${d.sigo ? 'ghost' : 'primary'} sm" id="seguir" data-requer-login="seguir outras pessoas"
          aria-pressed="${d.sigo}">${d.sigo ? 'A seguir ✓' : '+ Seguir'}</button>
        <a class="btn ghost sm" href="/chat.html?com=${p.id}" data-requer-login="enviar mensagens">Mensagem</a>`)
    + '<button class="btn ghost sm" type="button" id="partilhar">Partilhar</button>';

  // Perfil acabado de criar: cartão de boas-vindas só para o dono
  const perfilVazio = d.meu && !p.bio && !d.avaliacoes.length && !d.favoritos.length && !c.seguidores && !c.a_seguir;
  const boasVindas = !perfilVazio ? '' : `<div class="box cta boas-vindas"><div>
      <b>Bem-vindo ao TavDex, ${esc(nomeVisivel(p))}!</b>
      <p>O teu perfil ainda está vazio. Avalia o que já viste, segue outras pessoas e conta um pouco sobre ti.</p></div>
      <div class="btns"><a class="btn primary sm" href="/catalogo.html">Explorar o catálogo</a>
        <a class="btn ghost sm" href="/comunidade.html">Ver a comunidade</a>
        <a class="btn ghost sm" href="/definicoes.html">Completar o perfil</a></div></div>`;

  // Cabeçalho com o banner em pixel art (cenário e cor escolhidos pelo dono do perfil).
  // cabecalhoPerfil() (js/comum/cabecalho-perfil.js) valida a cor e o cenário e escapa todo o texto.
  mostrar(`<div class="content"><div class="left">
    ${cabecalhoPerfil(p, { acoes: botoes, contagens: c, segueTe: d.segue_te, generos: d.generos_escolhidos.map(g => g.nome) })}
    ${boasVindas}

    <div class="dcols"><div>
      <div class="tabsbox">
        <div class="tabs tabs-perfil">
          ${separador('resumo', 'resumo', 'Resumo', null, true)}
          ${separador('fav', 'favoritos', 'Favoritos', priv.listas ? null : d.favoritos.length)}
          ${separador('ava', 'avaliacoes', 'Avaliações', c.avaliacoes)}
          ${separador('seg', 'seguidores', 'Seguidores', c.seguidores)}
          ${separador('aseg', 'aSeguir', 'A seguir', c.a_seguir)}
          ${separador('ver', 'ver', 'A ver', priv.listas ? null : d.paraVer.length)}
          ${separador('vis', 'vistos', 'Vistos', c.vistos)}
          ${separador('prj', 'projetos', 'Projetos', c.projetos)}
          ${d.meu ? separador('recomendados', 'recomendados', 'Recomendados', null) : ''}
        </div>
        <div data-pane="resumo">${resumo}</div>
        <div data-pane="fav" hidden>${priv.listas ? listaPrivada : soTu(priv.so_tu_listas) + grelha(d.favoritos, 'Ainda não há favoritos.')}</div>
        <div data-pane="ava" hidden>${avaliacoes}</div>
        <div data-pane="seg" hidden id="lista-seguidores">${priv.seguidores ? seguidoresPrivados
          : soTu(priv.so_tu_seguidores) + listaUtilizadores(d.seguidores, c.seguidores, 'seguidores', 'Ainda não tem seguidores.')}</div>
        <div data-pane="aseg" hidden>${priv.seguidores ? seguidoresPrivados
          : soTu(priv.so_tu_seguidores) + listaUtilizadores(d.aSeguir, c.a_seguir, 'a_seguir', 'Ainda não segue ninguém.')}</div>
        <div data-pane="ver" hidden>${priv.listas ? listaPrivada : soTu(priv.so_tu_listas) + grelha(d.paraVer, 'A lista está vazia.')}</div>
        <div data-pane="vis" hidden>${priv.listas ? listaPrivada : soTu(priv.so_tu_listas) + grelha(d.vistos, 'Ainda não marcou nada como visto.')}</div>
        <div data-pane="prj" hidden>${d.projetos.length ? `<div class="pjc">${d.projetos.map(cartaoProjeto).join('')}</div>`
          : vazio('Ainda não tem projetos.', '<a class="lk" href="/projeto-novo.html">Criar um projeto</a>')}</div>
        ${d.meu ? `<div data-pane="recomendados" hidden>${grelha(d.recomendados, 'Avalia alguns títulos com 4 ou 5 estrelas (ou escolhe géneros favoritos nas Definições) para receberes recomendações.')}</div>` : ''}
      </div>
    </div><div>
      <div class="box caixa-generos"><h3>${iconePerfil('generos')} Géneros preferidos</h3>
        <p class="muted pequeno">Dos favoritos e das avaliações com 4 ou 5 estrelas</p>
        ${d.generos.length ? d.generos.map((g, i) => `<div class="genero-linha">
            <span class="genero-pos">${i + 1}</span>
            <div class="genero-info"><div class="genero-topo"><span class="gname">${esc(g.nome)}</span>
              <span class="genero-pct">${Math.round(g.n * 100 / totalGeneros)}%</span></div>
              <div class="bar"><i style="width:${Math.round(g.n * 100 / max)}%"></i></div></div>
          </div>`).join('') : vazio('Ainda não há dados: avalia ou marca favoritos.', linkCatalogo)}
        ${r.generos.length ? `<div class="generos-avaliados"><h4>Os que mais avalia</h4>
          <ul class="ptags">${r.generos.map(g => `<li>${esc(g.nome)} <small>${Number(g.n)}</small></li>`).join('')}</ul></div>` : ''}
      </div>
    </div></div>
  </div></div>`);
  abrirSeparadorDoEndereco();

  // Seguir / deixar de seguir: o número de seguidores muda sem recarregar.
  // Um visitante vê a janela de login (data-requer-login), por isso aqui já há sessão.
  const b = document.getElementById('seguir');
  if (b) b.addEventListener('click', async () => {
    b.disabled = true;
    try {
      const resposta = await TavDex.pedido(`/api/seguir/${p.id}`, null, 'seguir outras pessoas');
      if (!resposta) return;
      b.textContent = resposta.a_seguir ? 'A seguir ✓' : '+ Seguir';
      b.className = `btn ${resposta.a_seguir ? 'ghost' : 'primary'} sm`;
      b.setAttribute('aria-pressed', resposta.a_seguir);
      // O número muda na linha de cima e no separador "Seguidores"
      document.getElementById('n-seg').textContent = contagem(resposta.seguidores, 'seguidor', 'seguidores');
      const pastilha = document.querySelector('[data-tab="seg"] .tab-n');
      if (pastilha) pastilha.textContent = resposta.seguidores;
    } catch (erro) {
      aviso(erro.message, 'erro');
    } finally {
      b.disabled = false;
    }
  });

  // Partilhar: copia o endereço do perfil
  document.getElementById('partilhar').addEventListener('click', async () => {
    const endereco = `${location.origin}/perfil/${encodeURIComponent(p.nome)}`;
    try {
      await navigator.clipboard.writeText(endereco);
      aviso('Endereço copiado.');
    } catch (erro) {
      // Sem acesso à área de transferência (ex.: http fora do localhost): mostra o endereço
      aviso('Copia este endereço: ' + endereco);
    }
  });

  // "Ver mais" nas listas de seguidores e de "a seguir" (20 de cada vez)
  document.getElementById('app').addEventListener('click', async e => {
    const botao = e.target.closest('[data-ver-mais]');
    if (!botao) return;
    const tipo = botao.dataset.verMais;
    const pagina = Number(botao.dataset.pagina) + 1;
    botao.disabled = true;
    const resposta = await tentar(() => api(`/api/utilizadores/${encodeURIComponent(p.nome)}/seguidores?tipo=${tipo}&p=${pagina}`));
    botao.disabled = false;
    if (!resposta) return;
    const lista = document.querySelector(`[data-lista-u="${tipo}"]`);
    lista.insertAdjacentHTML('beforeend', resposta.utilizadores.map(itemUtilizador).join(''));
    botao.dataset.pagina = pagina;
    const total = tipo === 'seguidores' ? c.seguidores : c.a_seguir;
    if (!resposta.utilizadores.length || lista.children.length >= total) botao.remove();
  });
})();
