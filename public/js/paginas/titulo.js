// =====================================================================
//  Página de um filme ou série (titulo.html?id=)
//  Detalhes, onde ver, elenco, temporadas e episódios, avaliações e reviews
//  (com aviso de spoilers), listas pessoais e títulos semelhantes.
// =====================================================================
(async () => {
  const u = await sessao;
  const id = param('id');
  let d;

  // Pede o título à API e desenha a página (no separador indicado)
  async function carregar(separador) {
    try {
      d = await api('/api/titulos/' + encodeURIComponent(id));
    } catch (e) {
      return mostrarErro(e.message);
    }
    desenhar();
    if (separador) document.querySelector(`[data-tab="${separador}"]`)?.click();
  }

  const FUNCOES = { realizacao: 'Realização', argumento: 'Argumento', producao: 'Produção', musica: 'Música' };

  // Desenha o título: destaque, onde ver, elenco, temporadas e avaliações
  function desenhar() {
    const t = d.titulo;
    document.title = `${t.nome} – TavDex`;
    const img = urlSegura(t.fundo);
    const duracao = t.duracao_min ? `${Math.floor(t.duracao_min / 60)}h ${String(t.duracao_min % 60).padStart(2, '0')}m`
      : d.temporadas.length ? `${d.temporadas.length} temporada${d.temporadas.length > 1 ? 's' : ''}${t.em_curso ? ' · em curso' : ''}` : '';
    const atores = d.pessoas.filter(p => p.funcao === 'ator');
    const equipa = d.pessoas.filter(p => p.funcao !== 'ator');
    const totalAval = d.distribuicao.reduce((s, x) => s + x.n, 0);

    // Botões das listas pessoais (favorito, a ver, visto)
    // Ação que aparece na janela de login de um visitante
    const ACOES_LISTA = { favorito: 'guardar favoritos', ver: 'pôr títulos na lista «A ver»', visto: 'marcar títulos como vistos' };
    const botaoLista = (tipo, ligado, desligado) => `<button class="btn ghost sm" data-lista="${tipo}" data-requer-login="${ACOES_LISTA[tipo]}" aria-pressed="${d.listas[tipo]}">${d.listas[tipo] ? ligado : desligado}</button>`;

    const ondeVer = d.plataformas.map(p => {
      const cor = /^#[0-9A-Fa-f]{6}$/.test(p.cor) ? p.cor : '#888888';
      const link = urlSegura(p.link) || urlSegura(p.url);
      const conteudo = `<i style="background:${cor}">${esc(p.nome.charAt(0).toUpperCase())}</i>${esc(p.nome)}`;
      return link ? `<a class="plat" href="${esc(link)}" target="_blank" rel="noopener">${conteudo}</a>` : `<span class="plat">${conteudo}</span>`;
    }).join('');

    // Uma review: texto escondido se tiver spoilers
    const review = a => `<div class="box ${u && a.utilizador_id === u.id ? 'mine' : ''}"><div class="rv">${avatar(a)}<div class="cmb">
        <b>${linkPerfil(a)}</b> ${estrelas(a.nota)} <small>· ${tempo(a.criado_em)}${a.editado_em ? ' · editada' : ''}</small>
        ${a.review ? (a.spoiler ? `<details class="spoiler-d"><summary>⚠ Contém spoilers – mostrar</summary><p>${paragrafos(a.review)}</p></details>`
          : `<p>${paragrafos(a.review)}</p>`) : ''}</div>
        <div class="acts">${u && u.papel === 'admin' && a.utilizador_id !== u.id ? `<button class="del-btn" data-apagar-aval="${a.id}" title="Apagar (admin)">🗑</button>` : ''}
          ${u && a.utilizador_id !== u.id && a.review ? botaoDenunciar('review', a.id) : ''}</div></div></div>`;

    const minha = d.minha_avaliacao;
    const formAvaliar = !u ? `<div class="box cta"><div><b>Já viste?</b><p>Entra para avaliar e escrever uma review.</p></div><a class="btn primary sm" href="/login.html" data-requer-login="avaliar filmes e séries">Entrar</a></div>`
      : `<form class="box form" id="f-avaliar" novalidate><b>${minha ? 'A tua avaliação' : 'Avaliar'}</b>
          ${campoEstrelas(minha?.nota)}
          <label>Review (opcional)<textarea name="review" maxlength="2000" placeholder="O que achaste?">${esc(minha?.review || '')}</textarea></label>
          <label class="chk"><input type="checkbox" name="spoiler" ${minha?.spoiler ? 'checked' : ''}> A review tem spoilers (fica escondida até alguém clicar)</label>
          <p class="msg" role="alert"></p>
          <div class="btns"><button class="btn primary sm">${minha ? 'Guardar alterações' : 'Publicar'}</button>
            ${minha ? '<button type="button" class="btn ghost sm" id="apagar-minha">Apagar</button>' : ''}</div></form>`;

    const temporadas = d.temporadas.map(s => `<details class="box"><summary class="season"><span class="s-n">${s.numero}</span>
        <div><b>Temporada ${s.numero}</b><small class="muted"> · ${s.ano} · ${s.episodios} episódios</small></div></summary>
        ${(s.lista_episodios || []).map(ep => `<div class="li"><div><b>${ep.numero}. ${esc(ep.nome)}</b>
          <small>${ep.duracao_min ? ep.duracao_min + ' min' : ''}${ep.data_estreia ? ' · ' + dataCurta(ep.data_estreia) : ''}</small></div></div>`).join('')
          || '<p class="muted" style="margin-top:10px">Ainda sem a lista de episódios.</p>'}</details>`).join('');

    mostrar(`<section class="det" style="--h:${corDe(t.nome)}${img ? `;--img:url('${img}')` : ''}"><div class="det-in">
        ${cartaz(t)}
        <div class="det-txt">
          <span class="tag">${t.tipo === 'filme' ? 'FILME' : 'SÉRIE'}</span>
          <h1>${esc(t.nome)}</h1>
          <p class="meta"><span class="star"><i class="st">★</i> ${media(t)} <small>(${t.total_avaliacoes})</small></span>
            <span>${t.ano}</span>${duracao ? `<span>${duracao}</span>` : ''}<span class="age">${esc(t.idade)}</span></p>
          <div class="gen-chips">${d.generos.map(g => `<span>${esc(g.nome)}</span>`).join('')}</div>
          <p class="desc">${paragrafos(t.sinopse)}</p>
          ${t.realizador ? `<p class="cred"><span>${t.tipo === 'filme' ? 'Realização' : 'Criação'}:</span> ${esc(t.realizador)}</p>` : ''}
          ${ondeVer ? `<div class="onde"><span>Onde ver</span>${ondeVer}</div>` : ''}
          <div class="btns">
            <a class="btn primary" href="#" data-ir-avaliar>★ ${minha ? 'A minha avaliação' : 'Avaliar'}</a>
            ${botaoLista('favorito', '♥ Favorito', '♡ Favorito')}
            ${botaoLista('ver', '✓ Na lista "a ver"', '+ A ver')}
            ${botaoLista('visto', '✓ Visto', '👁 Marcar como visto')}
            ${u && u.papel === 'admin' ? `<a class="btn ghost sm" href="/admin.html?s=titulos&titulo=${t.id}">✎ Editar</a>` : ''}
          </div>
        </div></div></section>

      <div class="content"><div class="left">
        <div class="tabsbox">
          <div class="tabs">
            <button data-tab="reviews" class="on">Avaliações (${d.avaliacoes.length})</button>
            ${d.pessoas.length ? '<button data-tab="elenco">Elenco e equipa</button>' : ''}
            ${d.temporadas.length ? '<button data-tab="temporadas">Temporadas</button>' : ''}
            ${d.semelhantes.length ? '<button data-tab="semelhantes">Semelhantes</button>' : ''}
          </div>
          <div data-pane="reviews"><div class="dcols"><div>${formAvaliar}${d.avaliacoes.map(review).join('') || '<p class="empty">Ainda ninguém avaliou. Sê o primeiro!</p>'}</div>
            <div class="box"><h3>Classificação</h3>
              <div class="score"><b>${media(t)}</b><div>${estrelas(t.media || 0)}<br><small class="muted">${totalAval} avaliações</small></div></div>
              ${d.distribuicao.slice().reverse().map(x => `<div class="rb"><span>${x.nota}★</span><div class="bar"><i style="width:${totalAval ? Math.round(x.n * 100 / totalAval) : 0}%"></i></div><span>${x.n}</span></div>`).join('')}
            </div></div></div>
          ${d.pessoas.length ? `<div data-pane="elenco" hidden>
            ${equipa.length ? `<h2 class="sh">Equipa</h2><div class="cast">${equipa.map(p => `<div class="pp">${avatar({ nome: p.nome, cor: corDe(p.nome) }, 'l')}<b>${esc(p.nome)}</b><small>${FUNCOES[p.funcao]}</small></div>`).join('')}</div>` : ''}
            ${atores.length ? `<h2 class="sh">Elenco</h2><div class="cast">${atores.map(p => `<div class="pp">${avatar({ nome: p.nome, cor: corDe(p.nome) }, 'l')}<b>${esc(p.nome)}</b><small>${esc(p.personagem)}</small></div>`).join('')}</div>` : ''}
          </div>` : ''}
          ${d.temporadas.length ? `<div data-pane="temporadas" hidden>${temporadas}</div>` : ''}
          ${d.semelhantes.length ? `<div data-pane="semelhantes" hidden>${grelha(d.semelhantes, '')}</div>` : ''}
        </div>
      </div></div>`);
    ligarEventos();
  }

  // Liga os botões (listas, avaliar, apagar, denunciar)
  function ligarEventos() {
    const t = d.titulo;
    ligarForm(document.getElementById('f-avaliar'), async dados => {
      if (!dados.nota) throw new Error('Escolhe de 1 a 5 estrelas.');
      await api(`/api/avaliacoes/titulo/${t.id}`, 'PUT', dados);
      aviso(d.minha_avaliacao ? 'Avaliação atualizada.' : 'Obrigado pela avaliação!');
      carregar('reviews');
    });

    document.getElementById('app').onclick = async e => {
      if (e.target.closest('[data-ir-avaliar]')) {
        e.preventDefault();
        if (!u) return abrirJanelaLogin('avaliar filmes e séries');
        document.querySelector('[data-tab="reviews"]').click();
        document.getElementById('f-avaliar').scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const lista = e.target.closest('[data-lista]');
      if (lista) {
        if (!u) return abrirJanelaLogin('guardar títulos nas tuas listas');
        if (await tentar(() => api(`/api/listas/${t.id}/${lista.dataset.lista}`, 'POST'))) carregar();
      }
      if (e.target.id === 'apagar-minha' && confirm('Apagar a tua avaliação?') && await tentar(() => api(`/api/avaliacoes/titulo/${t.id}`, 'DELETE'))) carregar('reviews');
      const admin = e.target.closest('[data-apagar-aval]');
      if (admin && confirm('Apagar esta avaliação (admin)?') && await tentar(() => api('/api/avaliacoes/' + admin.dataset.apagarAval, 'DELETE'))) carregar('reviews');
    };
  }

  carregar();
})();
