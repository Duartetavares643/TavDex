// =====================================================================
//  Candidaturas a um projeto (só o dono ou um admin): aprovar / rejeitar
//  Aprovar junta o candidato à equipa (no servidor, numa transação).
// =====================================================================
(async () => {
  if (!(await sessao)) return irLogin();
  const id = param('id');

  // Pede as candidaturas à API e desenha a página
  async function carregar() {
    let d;
    try {
      d = await api(`/api/projetos/${encodeURIComponent(id)}/candidaturas`);
    } catch (e) {
      return mostrarErro(e.message);
    }
    const pendentes = d.candidaturas.filter(c => c.estado === 'pendente');
    const decididas = d.candidaturas.filter(c => c.estado !== 'pendente');
    const linha = c => `<div class="box li cd">${avatar(c)}<div class="cmb"><b>${linkPerfil(c)}</b> <small class="muted">→ ${esc(c.funcao)} · ${tempo(c.criado_em)}</small>
        <p>${paragrafos(c.mensagem)}</p></div>
        ${c.estado === 'pendente'
          ? `<div class="cact"><button class="btn primary sm" data-decidir="${c.id}" data-estado="aceite">Aprovar</button>
             <button class="btn ghost sm" data-decidir="${c.id}" data-estado="rejeitada">Rejeitar</button></div>`
          : etiquetaEstado(c.estado)}</div>`;

    mostrar(`<div class="content"><div class="left narrow">
      <div class="ah"><div><h1 class="ph">Candidaturas</h1><small>${esc(d.projeto.titulo)}</small></div>
        <a class="lk" href="/projeto.html?id=${d.projeto.id}">← Voltar ao projeto</a></div>
      <h2 class="sh">Por decidir (${pendentes.length})</h2>
      ${pendentes.map(linha).join('') || '<p class="empty">Não há candidaturas pendentes.</p>'}
      <h2 class="sh">Decididas</h2>
      ${decididas.map(linha).join('') || '<p class="empty">Nada por aqui.</p>'}
    </div></div>`);
  }

  document.getElementById('app').addEventListener('click', async e => {
    const b = e.target.closest('[data-decidir]');
    if (!b) return;
    const aprovar = b.dataset.estado === 'aceite';
    if (!confirm(aprovar ? 'Aprovar e juntar à equipa?' : 'Rejeitar esta candidatura?')) return;
    if (await tentar(() => api(`/api/projetos/candidaturas/${b.dataset.decidir}`, 'PUT', { estado: b.dataset.estado }))) {
      aviso(aprovar ? 'Candidato aprovado e adicionado à equipa.' : 'Candidatura rejeitada.');
      carregar();
    }
  });

  carregar();
})();
