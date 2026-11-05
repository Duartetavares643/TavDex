// =====================================================================
//  TavDex – JavaScript do site
//  Interatividade que não precisa do servidor (menus, separadores,
//  destaque do início, confirmações) e o chat, que fala com chat_api.php.
// =====================================================================

// ---------- Menu do utilizador (abre e fecha com clique ou toque) ----------
document.addEventListener('click', e => {
  const um = document.querySelector('.um');
  if (!um) return;
  const botao = e.target.closest('.ub');
  if (botao) {
    um.classList.toggle('open');
    if (innerWidth <= 900) um.querySelector('.dd').style.top = (botao.getBoundingClientRect().bottom + 6) + 'px';
  } else if (!e.target.closest('.dd')) {
    um.classList.remove('open');
  }
});

// ---------- Separadores (tabs) dentro da mesma página ----------
document.addEventListener('click', e => {
  const b = e.target.closest('.tabsbox > .tabs > [data-tab]');
  if (!b) return;
  const caixa = b.closest('.tabsbox');
  caixa.querySelectorAll(':scope > .tabs > [data-tab]').forEach(x => x.classList.toggle('on', x === b));
  caixa.querySelectorAll(':scope > [data-pane]').forEach(p => p.hidden = p.dataset.pane !== b.dataset.tab);
});
// Abrir o separador indicado no endereço (ex.: perfil.php#recomendados)
if (location.hash) {
  const b = document.querySelector('.tabs [data-tab="' + CSS.escape(location.hash.slice(1)) + '"]');
  if (b) b.click();
}

// ---------- Confirmação antes de apagar ----------
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-confirm]');
  if (f && !confirm(f.dataset.confirm)) e.preventDefault();
});

// ---------- Destaque da página inicial (muda a cada 8 segundos) ----------
const hero = document.querySelector('[data-hero]');
if (hero) {
  const slides = hero.querySelectorAll('.slide');
  const pontos = hero.querySelectorAll('.hdots i');
  let atual = 0;
  const mostrar = i => {
    atual = (i + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle('on', k === atual));
    pontos.forEach((p, k) => p.classList.toggle('on', k === atual));
  };
  let tempo = setInterval(() => mostrar(atual + 1), 8000);
  hero.addEventListener('click', e => {
    const seta = e.target.closest('[data-hs]');
    const ponto = e.target.closest('[data-i]');
    if (!seta && !ponto) return;
    clearInterval(tempo);
    mostrar(seta ? atual + Number(seta.dataset.hs) : Number(ponto.dataset.i));
    tempo = setInterval(() => mostrar(atual + 1), 8000);
  });
}

// ---------- Formulário de títulos: mostrar só os campos do tipo escolhido ----------
const tipo = document.querySelector('[data-tipo]');
if (tipo) {
  const atualizar = () => document.querySelectorAll('[data-so]').forEach(el => el.hidden = el.dataset.so !== tipo.value);
  tipo.addEventListener('change', atualizar);
  atualizar();
}

// ---------- Contador de caracteres ----------
document.querySelectorAll('[data-count]').forEach(c => {
  const campo = document.getElementById(c.dataset.count);
  const mostrar = () => c.textContent = campo.value.length + '/' + campo.maxLength;
  campo.addEventListener('input', mostrar);
  mostrar();
});

// ---------- Chat (passo 20) ----------
const painel = document.querySelector('[data-chat]');
if (painel) {
  const com = painel.dataset.chat;
  const caixa = document.getElementById('msgs');
  const form = document.getElementById('chat');
  const admin = painel.dataset.admin === '1';
  let ultimo = '';
  let aEditar = false;

  // Envia um pedido POST ao chat_api.php
  const enviar = async dados => {
    dados.csrf = painel.dataset.csrf;
    dados.com = com;
    const r = await fetch('chat_api.php', { method: 'POST', body: new URLSearchParams(dados) });
    const j = await r.json();
    if (j.erro) alert(j.erro);
    return j;
  };

  // Desenha as mensagens (só se houver alterações)
  const desenhar = lista => {
    const json = JSON.stringify(lista);
    if (json === ultimo || aEditar) return;
    ultimo = json;
    const noFundo = caixa.scrollHeight - caixa.scrollTop - caixa.clientHeight < 60;
    caixa.innerHTML = '';
    if (!lista.length) caixa.innerHTML = '<p class="empty">Ainda não há mensagens. Diz olá! 👋</p>';
    lista.forEach(m => {
      const d = document.createElement('div');
      d.className = 'm ' + (m.meu ? 'out' : 'in');
      d.dataset.id = m.id;
      d.innerHTML = '<div class="bb"></div><small><span class="who"></span> <span class="h"></span><span class="ma"></span></small>';
      d.querySelector('.bb').textContent = m.texto;               // textContent evita injeção de HTML
      d.querySelector('.who').textContent = m.meu ? '' : m.nome;
      d.querySelector('.h').textContent = m.hora + (Number(m.editada) ? ' · editada' : '');
      const acoes = d.querySelector('.ma');
      if (m.meu) acoes.innerHTML = '<button data-ed title="Editar">✎ Editar</button>';
      if (m.meu || admin) acoes.innerHTML += '<button data-del title="Apagar">🗑 Apagar</button>';
      caixa.append(d);
    });
    if (noFundo || !caixa.dataset.inicio) { caixa.scrollTop = caixa.scrollHeight; caixa.dataset.inicio = 1; }
  };

  const carregar = async () => {
    try {
      const r = await fetch('chat_api.php?com=' + com);
      if (r.status === 401) { location.href = 'login.php'; return; }
      desenhar((await r.json()).mensagens || []);
    } catch (e) { /* sem ligação: tenta outra vez daqui a pouco */ }
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const campo = form.texto;
    const texto = campo.value.trim();
    if (!texto) return;
    campo.value = '';
    await enviar({ op: 'enviar', texto });
    carregar();
  });

  caixa.addEventListener('click', async e => {
    const msg = e.target.closest('.m');
    if (!msg) return;
    if (e.target.closest('[data-del]') && confirm('Apagar esta mensagem?')) {
      await enviar({ op: 'apagar', id: msg.dataset.id });
      carregar();
    }
    if (e.target.closest('[data-ed]')) {
      aEditar = true;
      const bolha = msg.querySelector('.bb');
      const antigo = bolha.textContent;
      bolha.innerHTML = '<form class="medit"><input maxlength="1000"><button class="btn primary sm">OK</button></form>';
      const input = bolha.querySelector('input');
      input.value = antigo;
      input.focus();
      const fim = () => { aEditar = false; ultimo = ''; carregar(); };
      bolha.querySelector('form').addEventListener('submit', async ev => {
        ev.preventDefault();
        if (input.value.trim() && input.value.trim() !== antigo) await enviar({ op: 'editar', id: msg.dataset.id, texto: input.value.trim() });
        fim();
      });
      input.addEventListener('keydown', ev => { if (ev.key === 'Escape') fim(); });
    }
  });

  carregar();
  setInterval(carregar, 4000);
}

// ---------- Modo escuro / claro (fica guardado no browser) ----------
document.addEventListener('click', e => {
  if (!e.target.closest('[data-tema]')) return;
  const raiz = document.documentElement;
  const novo = raiz.dataset.tema === 'claro' ? 'escuro' : 'claro';
  if (novo === 'claro') raiz.dataset.tema = 'claro'; else delete raiz.dataset.tema;
  try { localStorage.setItem('tema', novo === 'claro' ? 'claro' : ''); } catch (err) {}
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.content = novo === 'claro' ? '#f6f4f9' : '#08070b';
});

// ---------- Botões que abrem um separador (ex.: "★ Avaliar" abre as Reviews) ----------
document.addEventListener('click', e => {
  const a = e.target.closest('[data-ir-tab]');
  if (!a) return;
  const b = document.querySelector('.tabs [data-tab="' + a.dataset.irTab + '"]');
  if (!b) return;
  e.preventDefault();
  b.click();
  b.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
