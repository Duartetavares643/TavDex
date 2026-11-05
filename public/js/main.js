// =====================================================================
//  TavDex – partes comuns a todas as páginas
//  · barra de navegação, rodapé, sino das notificações e tema escuro/claro
//  · funções para desenhar avatares, cartazes, estrelas, datas, paginação
//  · separadores (tabs), formulários e avisos
//  Cada página carrega: api.js -> main.js -> js/paginas/<pagina>.js
// =====================================================================

// Utilizador com sessão iniciada (ou null). As páginas fazem: const u = await sessao;
const sessao = api('/api/auth/eu').then(r => r.u).catch(() => null);

// Parâmetro do endereço, ex.: param('id') em "titulo.html?id=3" -> "3"
function param(nome) {
  return new URLSearchParams(location.search).get(nome);
}

// Leva ao login e depois volta a esta página
function irLogin() {
  location.href = '/login.html?voltar=' + encodeURIComponent(location.pathname + location.search);
}

// Mostra o conteúdo principal da página
function mostrar(html) {
  document.getElementById('app').innerHTML = html;
}

// Página de erro dentro do site (ex.: filme que não existe)
function mostrarErro(mensagem) {
  mostrar(`<div class="content"><div class="left nf"><h1>Ups</h1><h2>${esc(mensagem)}</h2>
    <p>Volta atrás ou experimenta a pesquisa.</p><a href="/" class="btn primary">Página inicial</a></div></div>`);
}

// =====================================================================
// AVISOS (mensagens verdes/vermelhas no topo)
// =====================================================================
function aviso(texto, tipo = 'ok') {
  const div = document.createElement('div');
  div.className = 'flash' + (tipo === 'erro' ? ' erro' : '');
  div.textContent = texto;
  document.querySelector('main').prepend(div);
  setTimeout(() => div.remove(), 6000);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Avisos que chegam pelo endereço (ex.: depois do login com o Google)
function avisosDoEndereco() {
  const ok = param('ok');
  const erro = param('erro');
  if (ok) aviso(ok);
  if (erro) aviso(erro, 'erro');
}

// =====================================================================
// FUNÇÕES PARA DESENHAR HTML (todas escapam o texto com esc())
// =====================================================================

// Avatar redondo com a inicial e a cor do utilizador ('s' pequeno, 'l' grande)
function avatar(u, tamanho = 's') {
  const letra = (u.nome || '?').charAt(0).toUpperCase();
  return `<span class="av ${tamanho}" style="--h:${Number(u.cor) || 0}">${esc(letra)}</span>`;
}

function linkPerfil(u) {
  return `<a class="lk-u" href="/perfil.html?u=${encodeURIComponent(u.nome)}">${esc(u.nome)}</a>`;
}

// Cor (0–359) calculada a partir de um texto, para os cartazes sem imagem
function corDe(texto) {
  let s = 0;
  for (const c of String(texto)) s += c.codePointAt(0) * 7;
  return s % 360;
}

// Só aceita imagens https (os endereços são validados também no servidor)
function urlSegura(url) {
  return typeof url === 'string' && url.startsWith('https://') ? url.replace(/['"()\\]/g, '') : null;
}

// Cartaz de um filme/série: a imagem, se existir; senão um cartaz desenhado
function cartaz(t, classe = 'poster') {
  const img = urlSegura(t.cartaz);
  if (img) return `<div class="${classe} has-img" style="--img:url('${img}')" role="img" aria-label="Cartaz de ${esc(t.nome)}"></div>`;
  return `<div class="${classe} art" style="--h:${corDe(t.nome)}" role="img" aria-label="${esc(t.nome)}">
    <span class="p-ano">${Number(t.ano) || ''}</span><b>${esc(String(t.nome).toUpperCase())}</b>
    <span class="p-gen">${esc(t.genero1 || '')}</span></div>`;
}

function media(t) {
  return t.media === null || t.media === undefined ? '–' : Number(t.media).toFixed(1);
}

// Cartão de um título para as grelhas (catálogo, listas, perfil)
function cartaoTitulo(t) {
  return `<a class="card" href="/titulo.html?id=${t.id}"><div class="cw">${cartaz(t)}
    <span class="nota"><i class="st">★</i> ${media(t)}</span></div>
    <h3>${esc(t.nome)}</h3><small>${t.ano} · ${t.tipo === 'filme' ? 'Filme' : 'Série'}</small></a>`;
}

// Cartão largo (fila "Mais populares")
function cartaoFila(t) {
  const img = urlSegura(t.fundo);
  const capa = img ? `<div class="poster has-img" style="--img:url('${img}')" role="img" aria-label="${esc(t.nome)}"></div>` : cartaz(t);
  return `<a class="rc" href="/titulo.html?id=${t.id}">${capa}<div class="rt"><h3>${esc(t.nome)}</h3>
    <small>${t.ano} <span><i class="st">★</i> ${media(t)}</span></small></div></a>`;
}

// Grelha de títulos (ou mensagem se estiver vazia)
function grelha(titulos, vazio) {
  if (!titulos.length) return `<p class="empty">${esc(vazio)}</p>`;
  return `<div class="grid g5">${titulos.map(cartaoTitulo).join('')}</div>`;
}

// Etiqueta colorida com o estado (projetos, candidaturas, denúncias)
const CORES_ESTADO = {
  Ideia: 270, Recrutamento: 330, 'Pré-produção': 35, 'Em produção': 150, 'Concluído': 215,
  pendente: 35, aceite: 150, rejeitada: 0, resolvida: 150, ignorada: 215,
};
function badgeEstado(estado) {
  const texto = estado.charAt(0).toUpperCase() + estado.slice(1);
  return `<span class="badge" style="--c:${CORES_ESTADO[estado] ?? 330}">${esc(texto)}</span>`;
}

// Cartão de um projeto
function cartaoProjeto(p) {
  const sinopse = p.sinopse.length > 110 ? p.sinopse.slice(0, 110) + '…' : p.sinopse;
  return `<a class="pjv" href="/projeto.html?id=${p.id}">
    <div class="pjv-capa" style="--h:${corDe(p.titulo)}"><span class="pk">${esc(p.tipo)}</span><h3>${esc(p.titulo)}</h3></div>
    <div class="pjv-txt"><p>${esc(sinopse)}</p>
      <div class="pjv-pe"><span class="mb">👤 ${p.membros || 0} membros</span>${badgeEstado(p.estado)}</div></div></a>`;
}

// Estrelas para mostrar uma nota (ex.: ★★★★☆)
function estrelas(nota) {
  const n = Math.round(Number(nota) || 0);
  return `<span class="sst" title="${Number(nota).toFixed(1)} de 5">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;
}

// Campo para escolher de 1 a 5 estrelas (funciona só com HTML e CSS)
let contadorEstrelas = 0;
function campoEstrelas(atual = 0, nome = 'nota') {
  const n = ++contadorEstrelas;
  let html = '<div class="stars-in" role="radiogroup" aria-label="Classificação">';
  for (let i = 5; i >= 1; i--) {
    html += `<input type="radio" id="e${n}_${i}" name="${nome}" value="${i}" ${Number(atual) === i ? 'checked' : ''} required>
      <label for="e${n}_${i}" title="${i} estrela${i > 1 ? 's' : ''}">★</label>`;
  }
  return html + '</div>';
}

// "há 5 min", "ontem", "12/03/2026"
function tempo(data) {
  if (!data) return '';
  const s = (Date.now() - new Date(data.replace(' ', 'T')).getTime()) / 1000;
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  if (s < 172800) return 'ontem';
  if (s < 2592000) return `há ${Math.floor(s / 86400)} dias`;
  return dataCurta(data);
}
function dataCurta(data) {
  return data ? new Date(data.replace(' ', 'T')).toLocaleDateString('pt-PT') : '';
}

// Texto com quebras de linha (escapado)
function paragrafos(texto) {
  return esc(texto).replace(/\n/g, '<br>');
}

// Botões de paginação (cada página trata do clique em [data-pagina])
function paginacao(total, pagina, porPagina) {
  const paginas = Math.ceil(total / porPagina);
  if (paginas <= 1) return '';
  let html = '<nav class="pg" aria-label="Páginas">';
  for (let i = 1; i <= paginas; i++) html += `<a href="#" data-pagina="${i}" class="${i === pagina ? 'on' : ''}">${i}</a>`;
  return html + '</nav>';
}

// Menu "Denunciar" (abre ao clicar)
function botaoDenunciar(tipo, id) {
  return `<details class="rep-d"><summary title="Denunciar">⚑</summary>
    <form data-denunciar="${tipo}" data-alvo="${id}">
      <select name="motivo" aria-label="Motivo">
        <option>Spam</option><option>Ofensivo</option><option>Spoilers</option><option>Assédio</option>
        <option>Conteúdo impróprio</option><option>Outro</option>
      </select><button class="btn ghost sm">Enviar</button></form></details>`;
}

// =====================================================================
// FORMULÁRIOS
// ligarForm(form, async dados => {...}): impede o envio normal, junta os
// campos num objeto, desativa o botão enquanto espera e mostra os erros.
// =====================================================================
function ligarForm(form, funcao) {
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const botao = form.querySelector('button[type=submit], button:not([type])');
    const msg = form.querySelector('.msg');
    if (msg) msg.textContent = '';
    const dados = Object.fromEntries(new FormData(form));
    // Checkboxes não marcados não aparecem no FormData: põe-nos a false
    form.querySelectorAll('input[type=checkbox][name]').forEach(c => { if (!c.dataset.lista) dados[c.name] = c.checked; });
    if (botao) botao.disabled = true;
    try {
      await funcao(dados, form);
    } catch (erro) {
      if (erro.message.startsWith('Inicia sessão')) return irLogin();
      if (msg) msg.textContent = erro.message; else aviso(erro.message, 'erro');
    } finally {
      if (botao) botao.disabled = false;
    }
  });
}

// Faz uma ação e mostra o erro se correr mal (para botões simples)
async function tentar(funcao) {
  try {
    return await funcao();
  } catch (erro) {
    if (erro.message.startsWith('Inicia sessão')) return irLogin();
    aviso(erro.message, 'erro');
  }
}

// =====================================================================
// BARRA DE NAVEGAÇÃO E RODAPÉ
// =====================================================================
const ICONES = {
  lupa: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  lua: '<svg class="lua" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>',
  sol: '<svg class="sol" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  sino: '<svg viewBox="0 0 24 24"><path d="M6 17V11a6 6 0 0112 0v6l2 2H4zM10 21h4"/></svg>',
};

function desenharTopo(u) {
  const ativo = document.body.dataset.menu || '';
  const menu = [['/', 'Início'], ['/catalogo.html?tipo=filme', 'Filmes'], ['/catalogo.html?tipo=serie', 'Séries'],
    ['/projetos.html', 'Projetos'], ['/comunidade.html', 'Comunidade']];
  const links = menu.map(([url, nome]) => `<a href="${url}" class="${ativo === nome ? 'active' : ''}">${nome}</a>`).join('');
  const q = location.pathname.startsWith('/pesquisa') ? param('q') || '' : '';

  const conta = u ? `
    <a class="bell" href="/notificacoes.html" aria-label="Notificações">${ICONES.sino}${u.por_ler ? `<i>${u.por_ler > 99 ? '99+' : u.por_ler}</i>` : ''}</a>
    <div class="um">
      <button class="ub" type="button">${avatar(u)}<span class="nome">${esc(u.nome)}</span> ▾</button>
      <div class="dd">
        <a href="/perfil.html?u=${encodeURIComponent(u.nome)}">Perfil</a>
        <a href="/listas.html">As minhas listas</a>
        <a href="/chat.html">Chat</a>
        <a href="/notificacoes.html">Notificações</a>
        ${u.papel === 'admin' ? '<a href="/admin.html">Painel de administração</a>' : ''}
        <a href="/definicoes.html">Definições</a>
        <form id="sair"><button class="rtog">Terminar sessão</button></form>
      </div>
    </div>`
    : `<a class="btn ghost sm nav-btn" href="/login.html?voltar=${encodeURIComponent(location.pathname + location.search)}">Entrar</a>
       <a class="btn primary sm nav-btn" href="/registar.html">Registar</a>`;

  const topo = document.createElement('header');
  topo.className = 'nav';
  topo.innerHTML = `
    <a href="/" class="bl"><img src="/img/logo.png" alt=""><span>Tav<em>Dex</em></span></a>
    <nav>${links}</nav>
    <form class="search" action="/pesquisa.html" method="get" role="search">${ICONES.lupa}
      <input type="search" name="q" value="${esc(q)}" placeholder="Pesquisar filmes, séries, pessoas, projetos..." aria-label="Pesquisar">
    </form>
    <button class="icone-btn tema" type="button" data-tema aria-label="Mudar entre modo escuro e claro" title="Modo escuro / claro">${ICONES.lua}${ICONES.sol}</button>
    ${conta}`;
  document.body.prepend(topo);

  // Terminar sessão (POST com token CSRF)
  const sair = document.getElementById('sair');
  if (sair) sair.addEventListener('submit', async e => {
    e.preventDefault();
    await tentar(() => api('/api/auth/logout', 'POST'));
    location.href = '/';
  });
}

function desenharRodape(u) {
  const rodape = document.createElement('footer');
  rodape.className = 'ft';
  rodape.innerHTML = `<div class="ft-in">
    <div class="marca"><img src="/img/logo.png" alt=""><b>Tav<em>Dex</em></b></div>
    <span class="lema">Descobre. Organiza. Avalia. Cria.</span>
    <nav aria-label="Rodapé">
      <a href="/catalogo.html?tipo=filme">Filmes</a><a href="/catalogo.html?tipo=serie">Séries</a>
      <a href="/projetos.html">Projetos</a><a href="/comunidade.html">Comunidade</a>
      ${u ? '' : '<a href="/registar.html">Criar conta</a>'}
    </nav>
    <small>TavDex © ${new Date().getFullYear()} · PAP de Duarte Veríssimo Tavares · Técnico de Informática – Sistemas</small>
  </div>`;
  document.body.append(rodape);
}

sessao.then(u => {
  desenharTopo(u);
  desenharRodape(u);
  avisosDoEndereco();
});

// =====================================================================
// INTERATIVIDADE COMUM (com "delegação": um só ouvinte para a página toda)
// =====================================================================
document.addEventListener('click', e => {
  // Menu do utilizador (abre e fecha)
  const um = document.querySelector('.um');
  if (um) {
    const botao = e.target.closest('.ub');
    if (botao) {
      um.classList.toggle('open');
      if (innerWidth <= 900) um.querySelector('.dd').style.top = (botao.getBoundingClientRect().bottom + 6) + 'px';
    } else if (!e.target.closest('.dd')) {
      um.classList.remove('open');
    }
  }

  // Modo escuro / claro (fica guardado no browser)
  if (e.target.closest('[data-tema]')) {
    const raiz = document.documentElement;
    const claro = raiz.dataset.tema !== 'claro';
    if (claro) raiz.dataset.tema = 'claro'; else delete raiz.dataset.tema;
    try { localStorage.setItem('tema', claro ? 'claro' : ''); } catch (err) { /* ignora */ }
  }

  // Separadores (tabs): <div class="tabsbox"><div class="tabs"><button data-tab="x">… <div data-pane="x">
  const tab = e.target.closest('.tabsbox > .tabs > [data-tab]');
  if (tab) {
    const caixa = tab.closest('.tabsbox');
    caixa.querySelectorAll(':scope > .tabs > [data-tab]').forEach(b => b.classList.toggle('on', b === tab));
    caixa.querySelectorAll(':scope > [data-pane]').forEach(p => { p.hidden = p.dataset.pane !== tab.dataset.tab; });
  }
});

// Denúncias (qualquer formulário com data-denunciar)
document.addEventListener('submit', async e => {
  const f = e.target.closest('[data-denunciar]');
  if (!f) return;
  e.preventDefault();
  if (!(await sessao)) return irLogin();
  await tentar(async () => {
    const r = await api('/api/comunidade/denuncias', 'POST', { tipo: f.dataset.denunciar, alvo_id: f.dataset.alvo, motivo: f.motivo.value });
    f.closest('details').open = false;
    aviso(r.mensagem);
  });
});

// Abre o separador indicado no endereço (ex.: perfil.html?u=x#recomendados)
function abrirSeparadorDoEndereco() {
  if (!location.hash) return;
  const b = document.querySelector(`.tabs [data-tab="${CSS.escape(location.hash.slice(1))}"]`);
  if (b) b.click();
}

// Destaque da página inicial (muda de 8 em 8 segundos)
function iniciarDestaque(hero) {
  const slides = hero.querySelectorAll('.slide');
  const pontos = hero.querySelectorAll('.hdots i');
  if (slides.length < 2) return;
  let atual = 0;
  const mostrarSlide = i => {
    atual = (i + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle('on', k === atual));
    pontos.forEach((p, k) => p.classList.toggle('on', k === atual));
  };
  let relogio = setInterval(() => mostrarSlide(atual + 1), 8000);
  hero.addEventListener('click', e => {
    const seta = e.target.closest('[data-hs]');
    const ponto = e.target.closest('[data-i]');
    if (!seta && !ponto) return;
    clearInterval(relogio);
    mostrarSlide(seta ? atual + Number(seta.dataset.hs) : Number(ponto.dataset.i));
    relogio = setInterval(() => mostrarSlide(atual + 1), 8000);
  });
}
