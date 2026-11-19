// =====================================================================
//  Chat: sala geral (para toda a gente) e conversas privadas.
//  As mensagens novas chegam sozinhas: a página pergunta ao servidor
//  de 4 em 4 segundos se há novidades (pedidos periódicos / "polling").
// =====================================================================
(async () => {
  const u = await sessao;
  if (!u) return irLogin();
  const com = param('com') || 'geral';   // 'geral' ou o id do outro utilizador
  let ultimo = '';                       // última lista desenhada (para não redesenhar sem mudanças)
  let aEditar = false;                   // enquanto se edita uma mensagem, não redesenha

  const { conversas } = await api('/api/comunidade/chat/conversas');

  mostrar(`<div class="content"><div class="left">
    <h1 class="ph">Chat</h1>
    <div class="msgx">
      <aside class="convs">
        <a class="cv ${com === 'geral' ? 'on' : ''}" href="/chat.html"><span class="av s" style="--h:330">#</span>
          <div><b>Sala geral</b><small>Toda a comunidade</small></div></a>
        ${conversas.map(c => `<a class="cv ${String(c.id) === com ? 'on' : ''}" href="/chat.html?com=${c.id}">${avatar(c)}
          <div><b>${esc(c.nome)}</b><small>${esc((c.ultima || '').slice(0, 40))}</small></div></a>`).join('')}
        <form class="newc" id="f-nova"><input name="nome" list="sugestoes" placeholder="Nova conversa: @nome" required aria-label="Nova conversa">
          <datalist id="sugestoes"></datalist><button class="btn ghost sm">Abrir</button></form>
      </aside>
      <section class="cpane">
        <div class="chh"><b id="cabecalho">${com === 'geral' ? 'Sala geral' : '…'}</b></div>
        <div id="msgs" aria-live="polite"></div>
        <form id="chat"><input name="texto" maxlength="1000" placeholder="Escreve uma mensagem..." autocomplete="off" required aria-label="Mensagem">
          <button class="btn primary sm">Enviar</button></form>
      </section>
    </div></div></div>`);

  const caixa = document.getElementById('msgs');

  // Desenha as mensagens (só se houver mudanças)
  function desenhar(dados) {
    const json = JSON.stringify(dados.mensagens);
    if (json === ultimo || aEditar) return;
    ultimo = json;
    if (dados.com) document.getElementById('cabecalho').innerHTML = `${avatar(dados.com)} ${linkPerfil(dados.com)}`;
    const noFundo = caixa.scrollHeight - caixa.scrollTop - caixa.clientHeight < 60;
    caixa.innerHTML = dados.mensagens.map(m => `<div class="m ${m.minha ? 'out' : 'in'}" data-id="${m.id}">
        <div class="bb">${esc(m.texto)}</div>
        <small>${m.minha ? '' : `<span class="who">${esc(m.nome)}</span> `}<span class="h">${tempo(m.criado_em)}${m.editada ? ' · editada' : ''}</span>
          <span class="ma">${m.minha ? '<button data-editar>✎ Editar</button>' : ''}${m.minha || u.papel === 'admin' ? '<button data-apagar>🗑 Apagar</button>' : ''}</span>
          ${!m.minha ? botaoDenunciar('mensagem', m.id) : ''}</small></div>`).join('')
      || '<p class="empty">Ainda não há mensagens. Diz olá! 👋</p>';
    if (noFundo || !caixa.dataset.inicio) { caixa.scrollTop = caixa.scrollHeight; caixa.dataset.inicio = 1; }
  }

  // Pede as mensagens da conversa aberta e desenha-as
  async function carregar() {
    try {
      desenhar(await api('/api/comunidade/chat/' + encodeURIComponent(com)));
    } catch (e) {
      if (!caixa.dataset.inicio) caixa.innerHTML = `<p class="empty">${esc(e.message)}</p>`;
    }
  }

  // Enviar
  const form = document.getElementById('chat');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const texto = form.texto.value.trim();
    if (!texto) return;
    form.texto.value = '';
    await tentar(() => api('/api/comunidade/chat/' + encodeURIComponent(com), 'POST', { texto }));
    carregar();
  });

  // Editar e apagar as minhas mensagens
  caixa.addEventListener('click', async e => {
    const msg = e.target.closest('.m');
    if (!msg) return;
    if (e.target.closest('[data-apagar]') && confirm('Apagar esta mensagem?')) {
      await tentar(() => api('/api/comunidade/chat/mensagens/' + msg.dataset.id, 'DELETE'));
      carregar();
    }
    if (e.target.closest('[data-editar]')) {
      aEditar = true;
      const bolha = msg.querySelector('.bb');
      const antigo = bolha.textContent;
      bolha.innerHTML = '<form class="medit"><input maxlength="1000" aria-label="Editar mensagem"><button class="btn primary sm">OK</button></form>';
      const input = bolha.querySelector('input');
      input.value = antigo;
      input.focus();
      const fim = () => { aEditar = false; ultimo = ''; carregar(); };
      bolha.querySelector('form').addEventListener('submit', async ev => {
        ev.preventDefault();
        const novo = input.value.trim();
        if (novo && novo !== antigo) await tentar(() => api('/api/comunidade/chat/mensagens/' + msg.dataset.id, 'PUT', { texto: novo }));
        fim();
      });
      input.addEventListener('keydown', ev => { if (ev.key === 'Escape') fim(); });
    }
  });

  // Nova conversa: sugere nomes enquanto se escreve
  const nova = document.getElementById('f-nova');
  nova.nome.addEventListener('input', async () => {
    const q = nova.nome.value.replace(/^@/, '').trim();
    if (q.length < 2) return;
    const r = await api('/api/utilizadores?q=' + encodeURIComponent(q)).catch(() => ({ utilizadores: [] }));
    document.getElementById('sugestoes').innerHTML = r.utilizadores.filter(x => x.id !== u.id).map(x => `<option value="@${esc(x.nome)}">`).join('');
  });
  nova.addEventListener('submit', async e => {
    e.preventDefault();
    const nome = nova.nome.value.replace(/^@/, '').trim();
    const r = await api('/api/utilizadores?q=' + encodeURIComponent(nome)).catch(() => ({ utilizadores: [] }));
    const alvo = r.utilizadores.find(x => x.nome.toLowerCase() === nome.toLowerCase());
    if (!alvo) return aviso('Não existe nenhum utilizador com esse nome.', 'erro');
    if (alvo.id === u.id) return aviso('Não podes falar contigo próprio.', 'erro');
    location.href = '/chat.html?com=' + alvo.id;
  });

  carregar();
  setInterval(carregar, 4000);
})();
