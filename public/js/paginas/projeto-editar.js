// =====================================================================
//  Editar um projeto (só o dono ou um admin): dados, equipa, vagas e apagar
// =====================================================================
(async () => {
  if (!(await sessao)) return irLogin();
  const id = param('id');
  let d;

  // Pede o projeto à API (só o dono consegue editar)
  async function carregar() {
    try {
      d = await api('/api/projetos/' + encodeURIComponent(id));
    } catch (e) {
      return mostrarErro(e.message);
    }
    if (!d.pode_gerir) return mostrarErro('Só o dono do projeto pode editá-lo.');
    desenhar();
  }

  // Desenha os formulários: dados, equipa e vagas
  function desenhar() {
    const p = d.projeto;
    mostrar(`<div class="content"><div class="left narrow">
      <div class="ah"><h1 class="ph">Editar projeto</h1><a class="lk" href="/projeto.html?id=${p.id}">← Ver o projeto</a></div>

      <form class="box form" id="f-dados" novalidate><h3>Dados</h3>${camposProjeto(p)}
        <p class="msg" role="alert"></p><button class="btn primary sm" type="submit">Guardar</button></form>

      <div class="box"><h3>Equipa</h3>
        ${d.equipa.map(m => `<div class="li"><div><b>${m.utilizador_id ? '@' + esc(m.nome) : esc(m.nome_externo)}</b><small>${esc(m.funcao)}</small></div>
          <button class="del-btn" data-tirar-membro="${m.id}">Tirar</button></div>`).join('') || '<p class="empty">Sem membros.</p>'}
        <form class="inline-form" id="f-membro" novalidate>
          <input name="funcao" placeholder="Função (ex.: Montagem)" required maxlength="60">
          <input name="nome" placeholder="@utilizador ou nome de fora" required maxlength="60">
          <button class="btn ghost sm">Adicionar</button><p class="msg" role="alert"></p></form>
        <small class="muted">Com @ junta um utilizador do TavDex (recebe uma notificação); sem @ é só um nome.</small>
      </div>

      <div class="box"><h3>Vagas</h3>
        ${d.vagas.map(v => `<div class="li"><div><b>${esc(v.funcao)}</b> ${v.aberta ? etiquetaEstado('Recrutamento') : '<span class="badge" style="--c:215">Fechada</span>'}
            <small>${esc(v.descricao)}</small></div>
          <div class="cact"><button class="btn ghost sm" data-vaga-estado="${v.id}" data-aberta="${v.aberta ? 0 : 1}">${v.aberta ? 'Fechar' : 'Reabrir'}</button>
            <button class="del-btn" data-apagar-vaga="${v.id}">Apagar</button></div></div>`).join('') || '<p class="empty">Sem vagas.</p>'}
        <form class="inline-form" id="f-vaga" novalidate>
          <input name="funcao" placeholder="Função" required maxlength="60">
          <input name="descricao" placeholder="Descrição (opcional)" maxlength="200">
          <button class="btn ghost sm">Abrir vaga</button><p class="msg" role="alert"></p></form>
      </div>

      <div class="box danger"><h3>Apagar projeto</h3><p>Apaga o projeto, a equipa, as vagas, as candidaturas e as avaliações.</p>
        <div class="btns" style="margin-top:12px"><button class="btn ghost sm" id="apagar">Apagar projeto</button></div></div>
    </div></div>`);
    ligarEventos();
  }

  // Liga os formulários e os botões de apagar
  function ligarEventos() {
    const p = d.projeto;
    ligarFormulario(document.getElementById('f-dados'), async dados => {
      await api(`/api/projetos/${p.id}`, 'PUT', dados);
      aviso('Projeto guardado.');
    });
    ligarFormulario(document.getElementById('f-membro'), async dados => {
      await api(`/api/projetos/${p.id}/equipa`, 'POST', dados);
      carregar();
    });
    ligarFormulario(document.getElementById('f-vaga'), async dados => {
      await api(`/api/projetos/${p.id}/vagas`, 'POST', dados);
      carregar();
    });

    document.getElementById('app').onclick = async e => {
      const membro = e.target.closest('[data-tirar-membro]');
      if (membro && await tentar(() => api(`/api/projetos/${p.id}/equipa/${membro.dataset.tirarMembro}`, 'DELETE'))) carregar();
      const estado = e.target.closest('[data-vaga-estado]');
      if (estado && await tentar(() => api(`/api/projetos/${p.id}/vagas/${estado.dataset.vagaEstado}`, 'PUT', { aberta: estado.dataset.aberta === '1' }))) carregar();
      const vaga = e.target.closest('[data-apagar-vaga]');
      if (vaga && confirm('Apagar a vaga e as candidaturas a ela?') && await tentar(() => api(`/api/projetos/${p.id}/vagas/${vaga.dataset.apagarVaga}`, 'DELETE'))) carregar();
      if (e.target.id === 'apagar' && confirm(`Apagar "${p.titulo}" para sempre?`) && await tentar(() => api(`/api/projetos/${p.id}`, 'DELETE'))) {
        location.href = '/projetos.html?ok=' + encodeURIComponent('Projeto apagado.');
      }
    };
  }

  carregar();
})();
