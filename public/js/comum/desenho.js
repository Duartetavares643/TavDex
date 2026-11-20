// =====================================================================
//  TavDex – funções que desenham HTML
//  Avatares, cartazes, cartões de títulos e projetos, estrelas, datas,
//  paginação, botão Denunciar e o destaque da página inicial.
//  Todas escapam o texto com esc() (api.js), contra XSS.
// =====================================================================

// Nome que se mostra (nome de exibição, ou o @nome se não houver)
function nomeVisivel(u) {
  return u.nome_exibicao || u.nome;
}

// =====================================================================
// FUNÇÕES PARA DESENHAR HTML (todas escapam o texto com esc())
// =====================================================================

// Avatar redondo ('s' pequeno, 'l' grande): a foto, se existir; senão a inicial na cor escolhida.
// Algumas listas trazem o id do utilizador em utilizador_id ou de_id (porque "id" é o do comentário/mensagem).
function avatar(u, tamanho = 's') {
  const uid = u.utilizador_id ?? u.de_id ?? u.id;
  const versao = Number(u.foto_versao) || 0;
  if (versao > 0 && uid) {
    return `<span class="av ${tamanho} foto" style="--h:${Number(u.cor) || 0}"><img src="/api/utilizadores/${Number(uid)}/foto?v=${versao}" alt="" loading="lazy"></span>`;
  }
  const letra = (nomeVisivel(u) || '?').charAt(0).toUpperCase();
  return `<span class="av ${tamanho}" style="--h:${Number(u.cor) || 0}">${esc(letra)}</span>`;
}

// Link para o perfil de uma pessoa (mostra o nome; o @nome aparece ao passar o rato)
function linkPerfil(u) {
  return `<a class="lk-u" href="/perfil.html?u=${encodeURIComponent(u.nome)}" title="@${esc(u.nome)}">${esc(nomeVisivel(u))}</a>`;
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
// só com a cor do título e o nome em letras grandes (o ano e o tipo ficam por baixo do cartão)
function cartaz(t, classe = 'poster') {
  const img = urlSegura(t.cartaz);
  if (img) return `<div class="${classe} has-img" style="--img:url('${img}')" role="img" aria-label="Cartaz de ${esc(t.nome)}"></div>`;
  return `<div class="${classe} art" style="--h:${corDe(t.nome)}" role="img" aria-label="${esc(t.nome)}">
    <b>${esc(String(t.nome).toUpperCase())}</b></div>`;
}

// Média das estrelas com uma casa decimal ("–" se ainda não há avaliações)
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
// Etiqueta colorida com o estado (ex.: "Pendente", "Aceite")
function etiquetaEstado(estado) {
  const texto = estado.charAt(0).toUpperCase() + estado.slice(1);
  return `<span class="badge" style="--c:${CORES_ESTADO[estado] ?? 330}">${esc(texto)}</span>`;
}

// Cartão de um projeto
function cartaoProjeto(p) {
  const sinopse = p.sinopse.length > 110 ? p.sinopse.slice(0, 110) + '…' : p.sinopse;
  return `<a class="pjv" href="/projeto.html?id=${p.id}">
    <div class="pjv-capa" style="--h:${corDe(p.titulo)}"><span class="pk">${esc(p.tipo)}</span><h3>${esc(p.titulo)}</h3></div>
    <div class="pjv-txt"><p>${esc(sinopse)}</p>
      ${p.dono_nome ? `<small class="pjv-dono">por @${esc(p.dono_nome)}</small>` : ''}
      <div class="pjv-pe"><span class="mb">👤 ${p.membros || 0} membros</span>${etiquetaEstado(p.estado)}</div></div></a>`;
}

// Estrelas para mostrar uma nota (ex.: ★★★★☆)
function estrelas(nota) {
  const n = Math.round(Number(nota) || 0);
  return `<span class="sst" title="${Number(nota).toFixed(1)} de 5">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;
}

// Campo para escolher de 1 a 5 estrelas (funciona só com HTML e CSS)
let contadorEstrelas = 0;
// Campo de 1 a 5 estrelas (botões de opção, da direita para a esquerda por causa do CSS)
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
// Só a data: "12/03/2026"
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

// Setas ‹ › para as filas horizontais (no telemóvel faz-se scroll com o dedo)
function setasFila() {
  return `<div class="row-nav"><button type="button" data-fila="-1" aria-label="Anterior">‹</button>
    <button type="button" data-fila="1" aria-label="Seguinte">›</button></div>`;
}

// Destaque da página inicial: muda de 7 em 7 segundos e pára enquanto o rato está em cima
function iniciarDestaque(hero) {
  const slides = hero.querySelectorAll('.slide');
  const pontos = hero.querySelectorAll('.hdots i');
  if (slides.length < 2) return;
  const INTERVALO = 7000;
  let atual = 0;
  let relogio = null;
  const mostrarSlide = i => {
    atual = (i + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle('on', k === atual));
    pontos.forEach((p, k) => p.classList.toggle('on', k === atual));
  };
  const parar = () => { clearInterval(relogio); relogio = null; };
  const continuar = () => { parar(); relogio = setInterval(() => mostrarSlide(atual + 1), INTERVALO); };
  continuar();
  // Pausa ao passar o rato (ou ao navegar com o teclado dentro do destaque)
  hero.addEventListener('mouseenter', parar);
  hero.addEventListener('mouseleave', continuar);
  hero.addEventListener('focusin', parar);
  hero.addEventListener('focusout', continuar);
  hero.addEventListener('click', e => {
    const seta = e.target.closest('[data-hs]');
    const ponto = e.target.closest('[data-i]');
    if (!seta && !ponto) return;
    mostrarSlide(seta ? atual + Number(seta.dataset.hs) : Number(ponto.dataset.i));
    if (!hero.matches(':hover')) continuar();
  });
}
