// =====================================================================
//  Criar um projeto: dados, a minha função e as vagas iniciais
// =====================================================================
(async () => {
  if (!(await sessao)) return irLogin();

  mostrar(`<div class="content"><div class="left narrow">
    <h1 class="ph">Novo projeto</h1>
    <form class="box form" id="f-novo" novalidate>
      ${camposProjeto()}
      <label>A tua função no projeto<input name="minha_funcao" value="Realizador" required maxlength="60"></label>
      <fieldset class="gp2" style="flex-direction:column;align-items:stretch"><legend>Vagas abertas (opcional)</legend>
        <div id="vagas"></div>
        <button type="button" class="btn ghost sm" id="mais-vaga" style="align-self:flex-start">+ Adicionar vaga</button>
      </fieldset>
      <p class="msg" role="alert"></p>
      <button class="btn primary" type="submit">Criar projeto</button>
    </form></div></div>`);

  // Cada vaga é uma linha com função e descrição
  const caixaVagas = document.getElementById('vagas');
  const novaVaga = () => caixaVagas.insertAdjacentHTML('beforeend', `<div class="row2" data-vaga>
      <label>Função<input data-campo="funcao" maxlength="60" placeholder="ex.: Ator principal"></label>
      <label>Descrição<input data-campo="descricao" maxlength="200" placeholder="ex.: 20–30 anos, disponível ao fim de semana"></label>
      <button type="button" class="del-btn" data-tirar title="Tirar">✕</button></div>`);
  document.getElementById('mais-vaga').addEventListener('click', novaVaga);
  caixaVagas.addEventListener('click', e => { if (e.target.closest('[data-tirar]')) e.target.closest('[data-vaga]').remove(); });
  novaVaga();

  ligarFormulario(document.getElementById('f-novo'), async dados => {
    dados.vagas = [...caixaVagas.querySelectorAll('[data-vaga]')]
      .map(l => ({ funcao: l.querySelector('[data-campo=funcao]').value.trim(), descricao: l.querySelector('[data-campo=descricao]').value.trim() }))
      .filter(v => v.funcao);
    const r = await api('/api/projetos', 'POST', dados);
    location.href = `/projeto.html?id=${r.id}&ok=` + encodeURIComponent('Projeto criado!');
  });
})();
