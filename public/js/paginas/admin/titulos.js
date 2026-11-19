// =====================================================================
//  Painel de administração – Filmes e séries
//  adminTitulos       a lista (procurar, editar, apagar)
//  adminEditarTitulo  criar / editar: dados, géneros, onde ver, elenco, temporadas
//  painel = { u, app, moldura, recarregar } (vem do js/paginas/admin.js)
// =====================================================================
// ===================================================================
// FILMES E SÉRIES: lista
// ===================================================================
async function adminTitulos(painel) {
  const { moldura, recarregar, app } = painel;
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
async function adminEditarTitulo(painel, id) {
  const { moldura, recarregar, app } = painel;
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
