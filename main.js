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

// =====================================================================
//  CONTAS, PERFIL E DEFINIÇÕES (vindo da versão Node.js)
// =====================================================================

// ---------- Palavra-passe: botão Ver / Ocultar ----------
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ver-pw]');
  if (!b) return;
  const campo = b.parentElement.querySelector('input');
  const mostrar = campo.type === 'password';
  campo.type = mostrar ? 'text' : 'password';
  b.textContent = mostrar ? 'Ocultar' : 'Ver';
});

// ---------- Palavra-passe nova: requisitos ao vivo e barra de força ----------
// As regras estão em regras-palavra-passe.js (as mesmas do servidor, em contas.php).
document.querySelectorAll('[data-pw-nova]').forEach(campo => {
  if (!window.RegrasPalavraPasse) return;
  const form = campo.form;
  const lista = form.querySelector('[data-requisitos]');
  const barra = form.querySelector('[data-forca]');
  const repetir = form.querySelector('[data-pw-repetir]');
  const nota = form.querySelector('[data-pw-iguais]');
  // Dados pessoais da conta (Definições e repor) ou escritos no próprio formulário (registo)
  const dados = () => {
    let d = {};
    try { d = JSON.parse(form.dataset.dadosPessoais || '{}'); } catch (erro) { /* sem dados */ }
    form.querySelectorAll('[data-pessoal]').forEach(c => { d[c.dataset.pessoal] = c.value; });
    return { nome: d.nome || '', nomeExibicao: d.nome_exibicao || '', email: d.email || '' };
  };
  const atualizar = () => {
    const r = RegrasPalavraPasse.analisar(campo.value, dados());
    r.requisitos.forEach(req => {
      const li = lista && lista.querySelector('[data-req="' + req.id + '"]');
      if (!li) return;
      li.className = req.ok ? 'ok' : (campo.value ? 'falta' : '');
      li.querySelector('span').textContent = req.ok ? '✓' : '○';
    });
    if (barra) {
      barra.dataset.n = r.forca;
      barra.querySelector('span').textContent = r.forca ? 'Força: ' + RegrasPalavraPasse.NOMES_FORCA[r.forca] : '';
    }
    if (repetir && nota) {
      const iguais = !repetir.value || repetir.value === campo.value;
      nota.textContent = iguais ? '' : 'As palavras-passe não coincidem.';
      nota.className = 'nota-campo' + (iguais ? '' : ' erro');
    }
  };
  form.addEventListener('input', atualizar);
  atualizar();
});

// ---------- Email: "Querias dizer …@gmail.com?" (regras-email.js) ----------
document.querySelectorAll('[data-email]').forEach(campo => {
  const nota = campo.form.querySelector('[data-sugestao-email]');
  if (!window.RegrasEmail || !nota) return;
  campo.addEventListener('blur', () => {
    const s = RegrasEmail.sugestao(campo.value);
    nota.textContent = '';
    if (!s) return;
    nota.append('Querias dizer ');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lk';
    b.textContent = s;   // textContent: o email escrito nunca é tratado como HTML
    b.addEventListener('click', () => { campo.value = s; nota.textContent = ''; campo.focus(); });
    nota.append(b, '?');
  });
});

// ---------- "Manter sessão iniciada" também no botão do Google ----------
document.querySelectorAll('[data-manter]').forEach(caixa => {
  const google = caixa.form.querySelector('.btn.google');
  if (!google) return;
  const base = google.getAttribute('href').replace(/&manter=1$/, '');
  caixa.addEventListener('change', () => google.setAttribute('href', base + (caixa.checked ? '&manter=1' : '')));
});

// ---------- Botão "Reenviar email" com contagem decrescente ----------
document.querySelectorAll('[data-espera]').forEach(b => {
  let s = Number(b.dataset.espera);
  const texto = b.textContent.replace(/\s*\(\d+ s\)$/, '');
  const relogio = setInterval(() => {
    s--;
    b.textContent = s > 0 ? texto + ' (' + s + ' s)' : texto;
    if (s <= 0) { b.disabled = false; clearInterval(relogio); }
  }, 1000);
});

// ---------- Partilhar: copia o endereço ----------
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-copiar]');
  if (!b) return;
  const texto = b.textContent;
  try {
    await navigator.clipboard.writeText(b.dataset.copiar);
    b.textContent = 'Copiado ✓';
  } catch (erro) {
    prompt('Copia este endereço:', b.dataset.copiar);   // sem acesso à área de transferência
  }
  setTimeout(() => { b.textContent = texto; }, 2000);
});

// ---------- Imagens: recortar e reduzir no browser antes de enviar ----------
// A foto fica quadrada (512×512) e o banner 3:1 (1500×500), em JPEG.
// Assim o envio é pequeno (o PHP só aceita 2 MB por omissão) e a pré-visualização
// mostra logo o resultado. O servidor volta a confirmar e a gravar a imagem.
function recortarImagem(ficheiro, larg, alt) {
  return new Promise((resolver, rejeitar) => {
    const img = new Image();
    img.onload = () => {
      const tela = document.createElement('canvas');
      tela.width = larg;
      tela.height = alt;
      const escala = Math.max(larg / img.width, alt / img.height);
      const w = larg / escala, h = alt / escala;
      tela.getContext('2d').drawImage(img, (img.width - w) / 2, (img.height - h) / 2, w, h, 0, 0, larg, alt);
      URL.revokeObjectURL(img.src);
      tela.toBlob(b => b ? resolver(b) : rejeitar(new Error('imagem')), 'image/jpeg', 0.88);
    };
    img.onerror = () => rejeitar(new Error('imagem'));
    img.src = URL.createObjectURL(ficheiro);
  });
}
document.querySelectorAll('input[type=file][data-imagem]').forEach(campo => {
  campo.addEventListener('change', async () => {
    const f = campo.files[0];
    if (!f) return;
    const [larg, alt] = campo.dataset.tamanho.split('x').map(Number);
    try {
      const blob = await recortarImagem(f, larg, alt);
      const lista = new DataTransfer();   // troca o ficheiro escolhido pelo recortado
      lista.items.add(new File([blob], campo.dataset.imagem + '.jpg', { type: 'image/jpeg' }));
      campo.files = lista.files;
      campo.dispatchEvent(new CustomEvent('imagem-pronta', { bubbles: true, detail: URL.createObjectURL(blob) }));
    } catch (erro) {
      alert('Não foi possível ler essa imagem. Escolhe um ficheiro JPG, PNG ou WebP.');
      campo.value = '';
    }
  });
});

// ---------- Definições: pré-visualização ao vivo, géneros e aviso de alterações ----------
const defPerfil = document.querySelector('[data-def-perfil]');
const prePerfil = document.getElementById('pre-perfil');
if (defPerfil && prePerfil) {
  const q = s => defPerfil.querySelector(s);
  const banner = prePerfil.querySelector('.pbanner');
  const temas = q('[data-temas]');
  let fotoNova = null, bannerNovo = null;

  // Atualiza o cartão "Assim é que os outros veem o teu perfil" com o que está no formulário
  function atualizarPre() {
    const cor = (q('[name=cor]:checked') || {}).value || 330;
    prePerfil.style.setProperty('--h', cor);
    temas.style.setProperty('--h', cor);
    banner.setAttribute('data-tema', (q('[name=tema_banner]:checked') || {}).value || 'colina');
    const arroba = q('[data-pre=arroba]').value.trim();
    const nome = q('[data-pre=nome]').value.trim() || arroba;
    const h1 = prePerfil.querySelector('.phead__nome');
    h1.firstChild.nodeValue = nome;   // o primeiro "pedaço" de texto é o nome (o selo Admin fica)
    const meta = prePerfil.querySelector('.phead__meta');
    meta.firstElementChild.textContent = '@' + arroba;
    let local = meta.querySelector('[data-local]') || [...meta.children].find(s => s.textContent.startsWith('📍'));
    const textoLocal = q('[data-pre=local]').value.trim();
    if (!local) { local = document.createElement('span'); meta.append(local); }
    local.dataset.local = '';
    local.textContent = textoLocal ? '📍 ' + textoLocal : '';
    local.hidden = !textoLocal;
    prePerfil.querySelector('.pbio').textContent = q('[data-pre=bio]').value;
    // Foto: a nova, a guardada (se não for para remover) ou a inicial
    const remFoto = q('[data-remover=foto]');
    let av = prePerfil.querySelector('.phead__av');
    const fotoGuardada = av.dataset.original ?? (av.tagName === 'IMG' ? av.getAttribute('src') : '');
    const src = fotoNova || (remFoto && remFoto.checked ? '' : fotoGuardada);
    const novo = document.createElement(src ? 'img' : 'div');
    novo.className = 'phead__av';
    novo.dataset.original = fotoGuardada;
    if (src) { novo.src = src; novo.alt = ''; } else novo.textContent = (nome || '?').charAt(0).toUpperCase();
    av.replaceWith(novo);
    // Imagem do banner: a nova, a guardada (se não for para remover) ou o cenário
    let img = banner.querySelector('.pbanner__foto');
    const bannerGuardado = banner.dataset.original ?? (img ? img.getAttribute('src') : '');
    banner.dataset.original = bannerGuardado;
    const remBanner = q('[data-remover=banner]');
    const srcBanner = bannerNovo || (remBanner && remBanner.checked ? '' : bannerGuardado);
    if (srcBanner && !img) { img = document.createElement('img'); img.className = 'pbanner__foto'; img.alt = ''; banner.prepend(img); }
    if (srcBanner) img.src = srcBanner; else if (img) img.remove();
  }
  defPerfil.addEventListener('input', atualizarPre);
  defPerfil.addEventListener('change', atualizarPre);
  defPerfil.addEventListener('imagem-pronta', e => {
    if (e.target.dataset.imagem === 'foto') fotoNova = e.detail; else bannerNovo = e.detail;
    const rem = q('[data-remover=' + e.target.dataset.imagem + ']');
    if (rem) rem.checked = false;
    atualizarPre();
  });
  // Escolher um cenário tira a imagem própria (senão o cenário escolhido não se via)
  temas.addEventListener('change', () => {
    bannerNovo = null;
    q('[data-imagem=banner]').value = '';
    const rem = q('[data-remover=banner]');
    if (rem) rem.checked = true;
    atualizarPre();
  });

  // Géneros favoritos: com 3 escolhidos, os outros ficam desativados
  const caixasGeneros = [...defPerfil.querySelectorAll('.generos-op input')];
  const limitarGeneros = () => {
    const n = caixasGeneros.filter(c => c.checked).length;
    caixasGeneros.forEach(c => { c.disabled = !c.checked && n >= 3; });
  };
  caixasGeneros.forEach(c => c.addEventListener('change', limitarGeneros));
  limitarGeneros();

  // Aviso "Tens alterações por guardar": compara o formulário com uma "fotografia" tirada ao abrir
  const valores = () => [...new FormData(defPerfil)].filter(([k]) => k !== 'csrf')
    .map(([k, v]) => k + '=' + (v instanceof File ? v.name + v.size : v)).join('&');
  const fotografia = valores();
  let podeSair = false;
  const temAlteracoes = () => !podeSair && valores() !== fotografia;
  defPerfil.addEventListener('submit', () => { podeSair = true; });
  window.addEventListener('beforeunload', e => { if (temAlteracoes()) { e.preventDefault(); e.returnValue = ''; } });

  // Janela própria com "Continuar a editar" e "Sair sem guardar"
  function perguntarSair(continuar) {
    const janela = document.createElement('dialog');
    janela.className = 'modal modal-aviso';
    janela.innerHTML = '<div class="modal-in"><h2>Alterações por guardar</h2><p class="modal-txt">Tens alterações por guardar. Queres sair sem guardar?</p>' +
      '<div class="modal-btns"><button class="btn primary" value="ficar">Continuar a editar</button><button class="btn ghost" value="sair">Sair sem guardar</button></div></div>';
    janela.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      janela.close();
      if (b.value === 'sair') { podeSair = true; continuar(); }
    });
    janela.addEventListener('close', () => janela.remove());   // Esc também fecha (= ficar)
    document.body.append(janela);
    janela.showModal();
    janela.querySelector('button').focus();
  }
  // Links do site (topo, rodapé, página)
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || e.ctrlKey || e.metaKey || !temAlteracoes()) return;
    e.preventDefault();
    perguntarSair(() => { location.href = a.href; });
  }, true);
  // Trocar para o separador "Conta e segurança"
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-tab="seguranca"]');
    if (!b || !temAlteracoes()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    perguntarSair(() => { location.href = 'editar_perfil.php?tab=seguranca'; });
  }, true);
}
