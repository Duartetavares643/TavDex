// =====================================================================
//  Painel de administração (só administradores)
//  Secções (?s=): resumo · utilizadores · denuncias · titulos · catalogo
//  Editar um filme/série: ?s=titulos&titulo=ID (ou &titulo=novo)
// =====================================================================
(async () => {
  const u = await sessao;
  if (!u) return irLogin();
  if (u.papel !== 'admin') return mostrarErro('Esta área é só para administradores.');

  const s = param('s') || 'resumo';
  const SECOES = [['resumo', 'Resumo'], ['utilizadores', 'Utilizadores'], ['denuncias', 'Denúncias'],
    ['titulos', 'Filmes e séries'], ['catalogo', 'Géneros, plataformas e pessoas']];
  const app = document.getElementById('app');

  // Moldura comum: título e separadores (links)
  function moldura(conteudo) {
    mostrar(`<div class="content"><div class="left">
      <div class="ah"><h1 class="ph">Administração</h1><small>Olá, ${esc(u.nome)}</small></div>
      <div class="tabs links">${SECOES.map(([id, nome]) => `<a href="/admin.html?s=${id}" class="${s === id ? 'on' : ''}">${nome}</a>`).join('')}</div>
      ${conteudo}</div></div>`);
  }
  const recarregar = () => location.reload();

  // ===================================================================
  // RESUMO
  // ===================================================================
  async function resumo() {
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

  // ===================================================================
  // UTILIZADORES
  // ===================================================================
  async function utilizadores() {
    const q = param('q') || '';
    const d = await api(`/api/admin/utilizadores?q=${encodeURIComponent(q)}&p=${Number(param('p')) || 1}`);
    moldura(`<form class="cf" method="get"><input type="hidden" name="s" value="utilizadores">
        <input name="q" type="search" value="${esc(q)}" placeholder="Procurar por nome ou email"><button class="btn ghost sm">Procurar</button></form>
      <p class="cr">${d.total} utilizadores</p>
      <div class="tscroll"><table><thead><tr><th>Utilizador</th><th>Email</th><th>Papel</th><th>Avaliações</th><th>Desde</th><th class="ac">Ações</th></tr></thead><tbody>
        ${d.utilizadores.map(x => `<tr><td><div class="uc">${avatar(x)}${linkPerfil(x)}</div></td><td>${esc(x.email)}</td>
          <td>${x.papel === 'admin' ? '<span class="badge" style="--c:330">Admin</span>' : 'Utilizador'} ${x.bloqueado ? '<span class="badge" style="--c:0">Bloqueado</span>' : ''}</td>
          <td>${x.n_avaliacoes}</td><td>${dataCurta(x.criado_em)}</td>
          <td class="ac">${x.id === u.id ? '<span class="muted">(tu)</span>' : `
            <button class="btn ghost sm" data-u="${x.id}" data-campo="bloqueado" data-valor="${x.bloqueado ? 0 : 1}">${x.bloqueado ? 'Desbloquear' : 'Bloquear'}</button>
            <button class="btn ghost sm" data-u="${x.id}" data-campo="papel" data-valor="${x.papel === 'admin' ? 'utilizador' : 'admin'}">${x.papel === 'admin' ? 'Tirar admin' : 'Tornar admin'}</button>`}</td></tr>`).join('')}
      </tbody></table></div>${paginacao(d.total, d.pagina, d.porPagina)}`);

    app.addEventListener('click', async e => {
      const b = e.target.closest('[data-u]');
      if (b && confirm(`${b.textContent.trim()}?`) && await tentar(() => api('/api/admin/utilizadores/' + b.dataset.u, 'PUT', { [b.dataset.campo]: b.dataset.valor }))) recarregar();
      const pg = e.target.closest('[data-pagina]');
      if (pg) { e.preventDefault(); location.search = `?s=utilizadores&q=${encodeURIComponent(q)}&p=${pg.dataset.pagina}`; }
    });
  }

  // ===================================================================
  // DENÚNCIAS
  // ===================================================================
  async function denuncias() {
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

  // ===================================================================
  // FILMES E SÉRIES: lista
  // ===================================================================
  async function titulos() {
    const q = param('q') || '';
    const d = await api(`/api/titulos?q=${encodeURIComponent(q)}&ordem=nome&p=${Number(param('p')) || 1}`);
    moldura(`<div class="ah"><form class="cf" method="get" style="margin:0;flex:1"><input type="hidden" name="s" value="titulos">
        <input name="q" type="search" value="${esc(q)}" placeholder="Procurar filme ou série"><button class="btn ghost sm">Procurar</button></form>
        <a class="btn primary sm" href="/admin.html?s=titulos&titulo=novo">+ Novo filme/série</a></div>
      <p class="cr">${d.total} títulos</p>
      <div class="tscroll"><table><thead><tr><th>Nome</th><th>Tipo</th><th>Ano</th><th>Média</th><th class="ac">Ações</th></tr></thead><tbody>
        ${d.titulos.map(t => `<tr><td><a class="lk-u" href="/titulo.html?id=${t.id}">${esc(t.nome)}</a></td><td>${t.tipo === 'filme' ? 'Filme' : 'Série'}</td>
          <td>${t.ano}</td><td>${media(t)} (${t.total_avaliacoes})</td>
          <td class="ac"><a class="btn ghost sm" href="/admin.html?s=titulos&titulo=${t.id}">Editar</a>
            <button class="del-btn" data-apagar-titulo="${t.id}" data-nome="${esc(t.nome)}">Apagar</button></td></tr>`).join('')}
      </tbody></table></div>${paginacao(d.total, d.pagina, d.porPagina)}`);

    app.addEventListener('click', async e => {
      const b = e.target.closest('[data-apagar-titulo]');
      if (b && confirm(`Apagar "${b.dataset.nome}" e todas as avaliações dele?`) && await tentar(() => api('/api/titulos/' + b.dataset.apagarTitulo, 'DELETE'))) recarregar();
      const pg = e.target.closest('[data-pagina]');
      if (pg) { e.preventDefault(); location.search = `?s=titulos&q=${encodeURIComponent(q)}&p=${pg.dataset.pagina}`; }
    });
  }

  // ===================================================================
  // FILMES E SÉRIES: criar / editar (dados, géneros, onde ver, elenco, temporadas)
  // ===================================================================
  async function editarTitulo(id) {
    const novo = id === 'novo';
    const opcoes = await api('/api/titulos/opcoes');
    const d = novo ? { titulo: { tipo: 'filme', idade: 'M/12', ano: new Date().getFullYear() }, generos: [], plataformas: [], pessoas: [], temporadas: [] }
      : await api('/api/titulos/' + encodeURIComponent(id));
    const t = d.titulo;
    const idades = ['M/3', 'M/6', 'M/12', 'M/14', 'M/16', 'M/18'];
    const FUNCOES = { ator: 'Ator / atriz', realizacao: 'Realização', argumento: 'Argumento', producao: 'Produção', musica: 'Música' };

    const dados = `<form class="box form" id="f-titulo" novalidate><h3>Dados</h3>
      <div class="row2">
        <label>Nome<input name="nome" value="${esc(t.nome || '')}" required maxlength="150"></label>
        <label>Tipo<select name="tipo" id="tipo"><option value="filme" ${t.tipo === 'filme' ? 'selected' : ''}>Filme</option><option value="serie" ${t.tipo === 'serie' ? 'selected' : ''}>Série</option></select></label>
        <label>Ano<input name="ano" type="number" value="${t.ano || ''}" required min="1888" max="2100"></label>
        <label>Idade<select name="idade">${idades.map(i => `<option ${i === t.idade ? 'selected' : ''}>${i}</option>`).join('')}</select></label>
      </div>
      <div class="row2">
        <label data-so="filme">Duração (minutos)<input name="duracao_min" type="number" min="1" max="1000" value="${t.duracao_min || ''}"></label>
        <label class="chk" data-so="serie"><input type="checkbox" name="em_curso" ${t.em_curso ? 'checked' : ''}> Série ainda em curso</label>
        <label>Realizador / criador<input name="realizador" value="${esc(t.realizador || '')}" maxlength="100"></label>
      </div>
      <label>Sinopse<textarea name="sinopse" required minlength="10" maxlength="3000" rows="4">${esc(t.sinopse || '')}</textarea></label>
      <div class="row2">
        <label>Cartaz (endereço https da imagem, opcional)<input name="cartaz" type="url" value="${esc(t.cartaz || '')}" maxlength="255" placeholder="https://..."></label>
        <label>Imagem de fundo (https, opcional)<input name="fundo" type="url" value="${esc(t.fundo || '')}" maxlength="255" placeholder="https://..."></label>
      </div>
      <fieldset class="gp2"><legend>Géneros</legend>
        ${opcoes.generos.map(g => `<label class="chip"><input type="checkbox" name="generos" value="${g.id}" data-lista ${d.generos.some(x => x.id === g.id) ? 'checked' : ''}><span>${esc(g.nome)}</span></label>`).join('')}
      </fieldset>
      <p class="msg" role="alert"></p>
      <button class="btn primary" type="submit">${novo ? 'Criar' : 'Guardar'}</button></form>`;

    const extras = novo ? '<p class="muted">Depois de criar, podes juntar onde ver, elenco e temporadas.</p>' : `
      <form class="box form" id="f-plataformas"><h3>Onde ver</h3>
        ${opcoes.plataformas.map(p => {
          const atual = d.plataformas.find(x => x.id === p.id);
          return `<div class="row2"><label class="chk"><input type="checkbox" name="plat" value="${p.id}" data-lista ${atual ? 'checked' : ''}> ${esc(p.nome)}</label>
            <input data-link="${p.id}" type="url" value="${esc(atual?.link || '')}" placeholder="Link direto (https, opcional)" aria-label="Link em ${esc(p.nome)}"></div>`;
        }).join('')}
        <button class="btn primary sm">Guardar</button></form>

      <div class="box"><h3>Elenco e equipa</h3>
        ${d.pessoas.map(p => `<div class="li"><div><b>${esc(p.nome)}</b><small>${FUNCOES[p.funcao]}${p.personagem ? ' · ' + esc(p.personagem) : ''}</small></div>
          <button class="del-btn" data-tirar-pessoa="${p.id}" data-funcao="${p.funcao}">Tirar</button></div>`).join('') || '<p class="empty">Ainda sem elenco.</p>'}
        <form class="inline-form" id="f-pessoa" novalidate>
          <input name="nome" list="lista-pessoas" placeholder="Nome (nova ou existente)" required maxlength="100"><datalist id="lista-pessoas"></datalist>
          <select name="funcao">${Object.entries(FUNCOES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
          <input name="personagem" placeholder="Personagem (atores)" maxlength="100">
          <input name="ordem" type="number" min="0" max="999" placeholder="Ordem" style="max-width:90px">
          <button class="btn ghost sm">Adicionar</button><p class="msg" role="alert"></p></form>
      </div>

      ${t.tipo === 'serie' ? `<div class="box"><h3>Temporadas e episódios</h3>
        ${d.temporadas.map(tp => `<details class="box" style="background:var(--surface-2)"><summary class="season"><span class="s-n">${tp.numero}</span>
            <div><b>Temporada ${tp.numero}</b><small class="muted"> · ${tp.ano} · ${tp.episodios} episódios</small></div></summary>
          ${(tp.lista_episodios || []).map(ep => `<div class="li"><div><b>${ep.numero}. ${esc(ep.nome)}</b><small>${ep.duracao_min ? ep.duracao_min + ' min' : ''} ${ep.data_estreia ? '· ' + dataCurta(ep.data_estreia) : ''}</small></div>
            <button class="del-btn" data-apagar-ep="${ep.id}">Apagar</button></div>`).join('')}
          <form class="inline-form" data-episodio="${tp.id}" novalidate>
            <input name="numero" type="number" min="1" max="500" placeholder="N.º" required style="max-width:80px">
            <input name="nome" placeholder="Nome do episódio" required maxlength="150">
            <input name="duracao_min" type="number" min="1" max="600" placeholder="Min." style="max-width:90px">
            <input name="data_estreia" type="date" aria-label="Data de estreia">
            <button class="btn ghost sm">+ Episódio</button><p class="msg" role="alert"></p></form>
          <button class="del-btn" data-apagar-temp="${tp.id}">Apagar temporada ${tp.numero}</button></details>`).join('') || '<p class="empty">Sem temporadas.</p>'}
        <form class="inline-form" id="f-temporada" novalidate>
          <input name="numero" type="number" min="1" max="100" placeholder="N.º" required>
          <input name="ano" type="number" min="1888" max="2100" placeholder="Ano" required>
          <input name="episodios" type="number" min="1" max="500" placeholder="N.º de episódios" required>
          <button class="btn ghost sm">+ Temporada</button><p class="msg" role="alert"></p></form>
      </div>` : ''}`;

    moldura(`<div class="ah"><h2>${novo ? 'Novo filme/série' : esc(t.nome)}</h2>
        <div class="btns">${novo ? '' : `<a class="lk" href="/titulo.html?id=${t.id}">Ver página →</a>`} <a class="lk" href="/admin.html?s=titulos">← Lista</a></div></div>
      <div class="dcols"><div>${dados}</div><div>${extras}</div></div>`);

    // Mostrar só os campos do tipo escolhido (duração nos filmes, "em curso" nas séries)
    const tipo = document.getElementById('tipo');
    const atualizarTipo = () => document.querySelectorAll('[data-so]').forEach(el => { el.hidden = el.dataset.so !== tipo.value; });
    tipo.addEventListener('change', atualizarTipo);
    atualizarTipo();

    ligarForm(document.getElementById('f-titulo'), async (dadosForm, form) => {
      dadosForm.generos = [...form.querySelectorAll('[name=generos]:checked')].map(c => c.value);
      if (novo) {
        const r = await api('/api/titulos', 'POST', dadosForm);
        location.href = `/admin.html?s=titulos&titulo=${r.id}&ok=` + encodeURIComponent('Criado!');
      } else {
        await api('/api/titulos/' + t.id, 'PUT', dadosForm);
        aviso('Guardado.');
      }
    });
    if (novo) return;

    document.getElementById('f-plataformas').addEventListener('submit', async e => {
      e.preventDefault();
      const plataformas = [...e.target.querySelectorAll('[name=plat]:checked')]
        .map(c => ({ plataforma_id: c.value, link: e.target.querySelector(`[data-link="${c.value}"]`).value.trim() }));
      if (await tentar(() => api(`/api/titulos/${t.id}/plataformas`, 'PUT', { plataformas }))) aviso('"Onde ver" guardado.');
    });
    ligarForm(document.getElementById('f-pessoa'), async dadosForm => {
      await api(`/api/titulos/${t.id}/pessoas`, 'POST', dadosForm);
      recarregar();
    });
    // Sugestões de nomes de pessoas que já existem
    const nomePessoa = document.querySelector('#f-pessoa [name=nome]');
    nomePessoa.addEventListener('input', async () => {
      if (nomePessoa.value.length < 2) return;
      const r = await api('/api/titulos/pessoas/lista?q=' + encodeURIComponent(nomePessoa.value)).catch(() => ({ pessoas: [] }));
      document.getElementById('lista-pessoas').innerHTML = r.pessoas.map(p => `<option value="${esc(p.nome)}">`).join('');
    });
    ligarForm(document.getElementById('f-temporada'), async dadosForm => {
      await api(`/api/titulos/${t.id}/temporadas`, 'POST', dadosForm);
      recarregar();
    });
    document.querySelectorAll('[data-episodio]').forEach(f => ligarForm(f, async dadosForm => {
      await api(`/api/titulos/temporadas/${f.dataset.episodio}/episodios`, 'POST', dadosForm);
      recarregar();
    }));

    app.addEventListener('click', async e => {
      const p = e.target.closest('[data-tirar-pessoa]');
      if (p && await tentar(() => api(`/api/titulos/${t.id}/pessoas/${p.dataset.tirarPessoa}/${p.dataset.funcao}`, 'DELETE'))) recarregar();
      const ep = e.target.closest('[data-apagar-ep]');
      if (ep && confirm('Apagar o episódio?') && await tentar(() => api('/api/titulos/episodios/' + ep.dataset.apagarEp, 'DELETE'))) recarregar();
      const tp = e.target.closest('[data-apagar-temp]');
      if (tp && confirm('Apagar a temporada e os episódios?') && await tentar(() => api('/api/titulos/temporadas/' + tp.dataset.apagarTemp, 'DELETE'))) recarregar();
    });
  }

  // ===================================================================
  // GÉNEROS, PLATAFORMAS E PESSOAS
  // ===================================================================
  async function catalogo() {
    const [opcoes, { pessoas }] = await Promise.all([api('/api/titulos/opcoes'), api('/api/titulos/pessoas/lista?q=')]);
    moldura(`<div class="g3 grid">
      <div class="box"><h3>Géneros</h3>
        ${opcoes.generos.map(g => `<div class="li"><span>${esc(g.nome)}</span><button class="del-btn" data-apagar="generos/${g.id}" data-nome="${esc(g.nome)}">Apagar</button></div>`).join('')}
        <form class="inline-form" id="f-genero" novalidate><input name="nome" placeholder="Novo género" required maxlength="40"><button class="btn ghost sm">Adicionar</button><p class="msg" role="alert"></p></form>
      </div>
      <div class="box"><h3>Plataformas</h3>
        ${opcoes.plataformas.map(p => `<form class="li inline-form" data-plataforma="${p.id}" style="flex-wrap:wrap">
            <input name="nome" value="${esc(p.nome)}" required maxlength="40" aria-label="Nome" style="flex:1 1 120px">
            <input name="cor" type="color" value="${esc(p.cor)}" aria-label="Cor">
            <input name="url" type="url" value="${esc(p.url)}" placeholder="https://site" aria-label="Site" style="flex:1 1 160px">
            <input name="logo" type="url" value="${esc(p.logo || '')}" placeholder="Logótipo (https)" aria-label="Logótipo" style="flex:1 1 160px">
            <button class="btn ghost sm">Guardar</button><button type="button" class="del-btn" data-apagar="plataformas/${p.id}" data-nome="${esc(p.nome)}">Apagar</button></form>`).join('')}
        <form class="inline-form" id="f-plataforma" novalidate><input name="nome" placeholder="Nova plataforma" required maxlength="40">
          <input name="cor" type="color" value="#888888" aria-label="Cor"><input name="url" type="url" placeholder="https://site">
          <button class="btn ghost sm">Adicionar</button><p class="msg" role="alert"></p></form>
      </div>
      <div class="box"><h3>Pessoas (${pessoas.length})</h3>
        ${pessoas.map(p => `<div class="li"><div><b>${esc(p.nome)}</b><small>${p.n_titulos} título(s)</small></div>
          <button class="del-btn" data-apagar="pessoas/${p.id}" data-nome="${esc(p.nome)}">Apagar</button></div>`).join('') || '<p class="empty">Sem pessoas.</p>'}
        <small class="muted">As pessoas juntam-se aos filmes/séries na página de edição de cada título.</small>
      </div></div>`);

    ligarForm(document.getElementById('f-genero'), async dados => { await api('/api/titulos/generos', 'POST', dados); recarregar(); });
    ligarForm(document.getElementById('f-plataforma'), async dados => { await api('/api/titulos/plataformas', 'POST', dados); recarregar(); });
    document.querySelectorAll('[data-plataforma]').forEach(f => ligarForm(f, async dados => {
      await api('/api/titulos/plataformas/' + f.dataset.plataforma, 'PUT', dados);
      aviso('Plataforma guardada.');
    }));
    app.addEventListener('click', async e => {
      const b = e.target.closest('[data-apagar]');
      if (b && confirm(`Apagar "${b.dataset.nome}"?`) && await tentar(() => api('/api/titulos/' + b.dataset.apagar, 'DELETE'))) recarregar();
    });
  }

  try {
    if (s === 'utilizadores') await utilizadores();
    else if (s === 'denuncias') await denuncias();
    else if (s === 'titulos' && param('titulo')) await editarTitulo(param('titulo'));
    else if (s === 'titulos') await titulos();
    else if (s === 'catalogo') await catalogo();
    else await resumo();
  } catch (e) {
    mostrarErro(e.message);
  }
})();
