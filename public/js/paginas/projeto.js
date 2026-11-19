// =====================================================================
//  Página de um projeto (projeto.html?id=)
//  Equipa, vagas e candidaturas, acompanhar, comentários e avaliações.
// =====================================================================
(async () => {
  const u = await sessao;
  const id = param('id');
  let d;

  // Pede o projeto à API e desenha a página
  async function carregar() {
    try {
      d = await api('/api/projetos/' + encodeURIComponent(id));
    } catch (e) {
      return mostrarErro(e.message);
    }
    desenhar();
  }

  // Desenha o projeto: capa, equipa, vagas, avaliações e comentários
  function desenhar() {
    const p = d.projeto;
    document.title = `${p.titulo} – TavDex`;
    const meu = u && u.id === p.dono_id;

    const equipa = d.equipa.map(m => `<div class="rv">
        ${m.utilizador_id ? avatar(m) : `<span class="av s" style="--h:${corDe(m.nome_externo)}">${esc(m.nome_externo.charAt(0).toUpperCase())}</span>`}
        <div><b>${m.utilizador_id ? linkPerfil(m) : esc(m.nome_externo)}</b><small class="muted"> · ${esc(m.funcao)}</small></div></div>`).join('')
      || '<p class="empty">Ainda sem equipa.</p>';

    // Cada vaga: candidatar-me (com mensagem), retirar, ou o estado da minha candidatura
    const vagas = d.vagas.map(v => {
      let acao = '';
      if (d.pode_gerir) acao = v.pendentes ? `<a class="lk" href="/candidaturas.html?id=${p.id}">${v.pendentes} candidatura(s) por ver</a>` : '';
      else if (v.minha_candidatura === 'pendente') acao = `${etiquetaEstado('pendente')} <button class="del-btn" data-retirar="${v.id}">Retirar candidatura</button>`;
      else if (v.minha_candidatura) acao = etiquetaEstado(v.minha_candidatura);
      else if (v.aberta) acao = `<details><summary class="btn primary sm">Candidatar-me</summary>
          <form class="form" data-candidatar="${v.id}"><textarea name="mensagem" minlength="10" maxlength="500" required
            placeholder="Apresenta-te: experiência, disponibilidade, porque queres participar..."></textarea>
            <p class="msg" role="alert"></p><button class="btn primary sm">Enviar candidatura</button></form></details>`;
      return `<div class="box vaga"><b>${esc(v.funcao)}</b> ${v.aberta ? etiquetaEstado('Recrutamento') : '<span class="badge" style="--c:215">Fechada</span>'}
        ${v.descricao ? `<p>${esc(v.descricao)}</p>` : ''}<div style="margin-top:10px">${acao}</div></div>`;
    }).join('') || '<p class="empty">Sem vagas de momento.</p>';

    const comentarios = d.comentarios.map(c => `<div class="cm">${avatar(c)}<div class="cmb">
        <b>${linkPerfil(c)}</b> <small>${tempo(c.criado_em)}</small><p>${paragrafos(c.texto)}</p></div>
        <div class="acts">${u && (u.id === c.utilizador_id || meu || u.papel === 'admin') ? `<button class="del-btn" data-apagar-com="${c.id}" title="Apagar">🗑</button>` : ''}
        ${u && u.id !== c.utilizador_id ? botaoDenunciar('comentario', c.id) : ''}</div></div>`).join('')
      || '<p class="empty">Ainda sem comentários.</p>';

    const avaliacoes = d.avaliacoes.map(a => `<div class="rv">${avatar(a)}<div><b>${linkPerfil(a)}</b> ${estrelas(a.nota)}
        <small> · ${tempo(a.criado_em)}</small>${a.review ? `<p>${paragrafos(a.review)}</p>` : ''}</div></div>`).join('')
      || '<p class="empty">Ainda ninguém avaliou.</p>';

    const formAvaliar = !u ? `<p><a class="lk" href="/login.html" data-requer-login="avaliar projetos">Entra</a> para avaliar este projeto.</p>`
      : meu ? '' : `<form class="form box" id="f-avaliar"><b>${d.minha_avaliacao ? 'A tua avaliação' : 'Avaliar o projeto'}</b>
          ${campoEstrelas(d.minha_avaliacao?.nota)}
          <textarea name="review" maxlength="1000" placeholder="O que achaste? (opcional)">${esc(d.minha_avaliacao?.review || '')}</textarea>
          <p class="msg" role="alert"></p>
          <div class="btns"><button class="btn primary sm">Guardar</button>
          ${d.minha_avaliacao ? '<button type="button" class="btn ghost sm" id="apagar-aval">Apagar</button>' : ''}</div></form>`;

    mostrar(`<div class="content"><div class="left">
      <div class="dh pdh" style="--h:${corDe(p.titulo)}"><div>
        <span class="pk">${esc(p.tipo)}${p.genero ? ' · ' + esc(p.genero) : ''}</span>
        <h1>${esc(p.titulo)}</h1>
        <p class="meta">${etiquetaEstado(p.estado)}<span>Criado por ${linkPerfil(d.dono)}</span><span>${dataCurta(p.criado_em)}</span>
          ${d.media !== null ? `<span><i class="st">★</i> ${d.media.toFixed(1)} (${d.avaliacoes.length})</span>` : ''}<span>${d.seguidores} a acompanhar</span></p>
        <p class="desc">${paragrafos(p.sinopse)}</p>
        <div class="btns">
          ${!meu ? `<button class="btn ${d.acompanho ? 'ghost' : 'primary'} sm" id="acompanhar">${d.acompanho ? '✓ A acompanhar' : '+ Acompanhar'}</button>` : ''}
          ${d.pode_gerir ? `<a class="btn ghost sm" href="/projeto-editar.html?id=${p.id}">✎ Editar</a>
             <a class="btn ghost sm" href="/candidaturas.html?id=${p.id}">Candidaturas</a>` : ''}
        </div>
      </div></div>

      <div class="dcols" style="margin-top:24px"><div>
        <div class="tabsbox">
          <div class="tabs"><button data-tab="vagas" class="on">Vagas (${d.vagas.filter(v => v.aberta).length})</button>
            <button data-tab="comentarios">Comentários (${d.comentarios.length})</button>
            <button data-tab="avaliacoes">Avaliações (${d.avaliacoes.length})</button></div>
          <div data-pane="vagas">${vagas}</div>
          <div data-pane="comentarios" hidden>
            ${u ? `<form class="form box" id="f-comentar"><textarea name="texto" maxlength="1000" required placeholder="Escreve um comentário..."></textarea>
              <p class="msg" role="alert"></p><button class="btn primary sm">Comentar</button></form>` : `<p><a class="lk" href="/login.html" data-requer-login="comentar">Entra</a> para comentar.</p>`}
            ${comentarios}</div>
          <div data-pane="avaliacoes" hidden>${formAvaliar}${avaliacoes}</div>
        </div>
      </div><div>
        <div class="box"><h3>Equipa (${d.equipa.length})</h3>${equipa}</div>
      </div></div>
    </div></div>`);
    ligarEventos();
  }

  // Liga os botões (acompanhar, candidatar, avaliar, comentar, …)
  function ligarEventos() {
    const p = d.projeto;

    document.getElementById('acompanhar')?.addEventListener('click', async () => {
      if (!u) return abrirJanelaLogin('acompanhar projetos');
      if (await tentar(() => api(`/api/projetos/${p.id}/acompanhar`, 'POST'))) carregar();
    });

    document.querySelectorAll('[data-candidatar]').forEach(f => ligarFormulario(f, async dados => {
      if (!u) return abrirJanelaLogin('te candidatares a vagas');
      await api(`/api/projetos/vagas/${f.dataset.candidatar}/candidatura`, 'POST', dados);
      aviso('Candidatura enviada! O dono do projeto vai ser notificado.');
      carregar();
    }));

    ligarFormulario(document.getElementById('f-comentar'), async dados => {
      await api(`/api/projetos/${p.id}/comentarios`, 'POST', dados);
      await carregar();
      document.querySelector('[data-tab="comentarios"]').click();
    });

    ligarFormulario(document.getElementById('f-avaliar'), async dados => {
      if (!dados.nota) throw new Error('Escolhe de 1 a 5 estrelas.');
      await api(`/api/projetos/${p.id}/avaliacao`, 'PUT', dados);
      await carregar();
      document.querySelector('[data-tab="avaliacoes"]').click();
    });

    document.getElementById('app').onclick = async e => {
      const retirar = e.target.closest('[data-retirar]');
      if (retirar && confirm('Retirar a candidatura?') && await tentar(() => api(`/api/projetos/vagas/${retirar.dataset.retirar}/candidatura`, 'DELETE'))) carregar();
      const apagar = e.target.closest('[data-apagar-com]');
      if (apagar && confirm('Apagar o comentário?') && await tentar(() => api(`/api/projetos/comentarios/${apagar.dataset.apagarCom}`, 'DELETE'))) {
        await carregar();
        document.querySelector('[data-tab="comentarios"]').click();
      }
      if (e.target.id === 'apagar-aval' && confirm('Apagar a tua avaliação?') && await tentar(() => api(`/api/projetos/${p.id}/avaliacao`, 'DELETE'))) {
        await carregar();
        document.querySelector('[data-tab="avaliacoes"]').click();
      }
    };
  }

  carregar();
})();
