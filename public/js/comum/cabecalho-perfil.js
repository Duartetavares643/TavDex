// =====================================================================
//  TavDex – cabeçalho do perfil (banner, avatar, nome e números)
//  Usado no perfil público e na pré-visualização das Definições.
//  O desenho dos cenários do banner está em js/banner/.
// =====================================================================

// =====================================================================
// CABEÇALHO DO PERFIL COM BANNER (perfil público e pré-visualização nas Definições)
// O banner é desenhado pelo /js/banner-perfil.js (tem de estar carregado na página).
// =====================================================================

// Cenários do banner (os mesmos da coluna utilizadores.tema_banner)
const TEMAS_BANNER = {
  colina: 'Colina das estrelas',
  pipocas: 'Sessão de pipocas',
  claquete: 'Claquete antiga',
  pelicula: 'Rolo de película',
  marquise: 'Cinema à noite',
};

// Valores que vêm da API, sempre validados antes de irem para o HTML
function corValida(cor) {
  const n = Math.round(Number(cor));
  return Number.isFinite(n) && n >= 0 && n <= 359 ? n : 330;
}
// Cenário do banner: só um dos 5 (senão, o primeiro)
function temaValido(tema) {
  return Object.prototype.hasOwnProperty.call(TEMAS_BANNER, tema) ? tema : 'colina';
}

// Ícones do perfil (traço simples, na cor do texto à volta)
const ICONES_PERFIL = {
  seguidores: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0"/><circle cx="17" cy="9" r="2.8"/><path d="M15.6 14.3A5.5 5.5 0 0121.5 20"/>',
  aSeguir: '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20a6.5 6.5 0 0113 0"/><path d="M16 11l2 2 4-4"/>',
  avaliacoes: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  vistos: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  projetos: '<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M3 9l2.4-5 15.2 2.4L21 9M8.5 4.6L7 9M14.5 5.5L13 9"/>',
  resumo: '<path d="M4 20V11M10 20V5M16 20v-6M2 20h20"/>',
  favoritos: '<path d="M12 20s-7.5-4.6-9.3-9.3C1.4 7.2 3.7 4 7 4c2 0 3.3 1.1 5 3 1.7-1.9 3-3 5-3 3.3 0 5.6 3.2 4.3 6.7C19.5 15.4 12 20 12 20z"/>',
  ver: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  recomendados: '<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  generos: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
};
// SVG de um dos ícones de cima (ex.: iconePerfil("seguidores"))
function iconePerfil(nome) {
  return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONES_PERFIL[nome] || ''}</svg>`;
}

// Avatar grande, nome, @nome, data, localização, biografia e números.
//  p         = perfil (id, nome, nome_exibicao, papel, foto_versao, localizacao, bio, criado_em)
//  acoes     = HTML dos botões (Editar perfil, ou Seguir / Mensagem)
//  contagens = { seguidores, a_seguir, avaliacoes, vistos, projetos } (ou null para não mostrar)
//  fotoUrl   = foto escolhida e ainda não guardada (pré-visualização nas Definições)
//  segueTe   = esta pessoa segue quem está a ver (etiqueta "Segue-te" ao lado do nome)
//  generos   = géneros favoritos escolhidos pela pessoa (etiquetas por baixo da biografia)
function partesPerfil(p, { acoes = '', contagens = null, fotoUrl = null, segueTe = false, generos = [] } = {}) {
  const versao = Number(p.foto_versao) || 0;
  const foto = fotoUrl || (versao > 0 ? `/api/utilizadores/${Number(p.id)}/foto?v=${versao}` : null);
  const avatarHtml = foto
    ? `<img class="phead__av" src="${esc(foto)}" alt="Foto de @${esc(p.nome)}">`
    : `<div class="phead__av" aria-hidden="true">${esc((nomeVisivel(p) || '?').charAt(0).toUpperCase())}</div>`;
  const desde = p.criado_em ? `<span>Membro desde ${dataCurta(p.criado_em).slice(3)}</span>` : '';
  const local = p.localizacao ? `<span>📍 ${esc(p.localizacao)}</span>` : '';
  // Números em cartões com ícone (o de seguidores tem id, porque muda ao carregar em Seguir)
  const cartaoNumero = (icone, valor, rotulo, id = '') => `<li>${iconePerfil(icone)}
      <b${id ? ` id="${id}"` : ''}>${Number(valor) || 0}</b><small>${rotulo}</small></li>`;
  const numeros = !contagens ? '' : `<ul class="pnums">
      ${cartaoNumero('seguidores', contagens.seguidores, 'Seguidores', 'n-seg')}
      ${cartaoNumero('aSeguir', contagens.a_seguir, 'A seguir')}
      ${cartaoNumero('avaliacoes', contagens.avaliacoes, 'Avaliações')}
      ${cartaoNumero('vistos', contagens.vistos, 'Vistos')}
      ${cartaoNumero('projetos', contagens.projetos, 'Projetos')}
    </ul>`;
  return `<div class="phead">
      ${avatarHtml}
      <div class="phead__info">
        <h1 class="phead__nome">${esc(nomeVisivel(p))}${p.papel === 'admin' ? '<span class="badge" style="--c:330">Admin</span>' : ''}${segueTe ? '<span class="badge segue-te" style="--c:199">Segue-te</span>' : ''}</h1>
        <p class="phead__meta"><span>@${esc(p.nome)}</span>${desde}${local}</p>
      </div>
      <div class="phead__acoes">${acoes}</div>
    </div>
    ${p.bio ? `<p class="pbio">${esc(p.bio)}</p>` : ''}
    ${generos.length ? `<ul class="ptags" aria-label="Géneros favoritos">${generos.map(g => `<li>${esc(g)}</li>`).join('')}</ul>` : ''}
    ${numeros}`;
}

// Imagem própria do banner (se a pessoa carregou uma), por cima do cenário desenhado.
//  url = imagem escolhida e ainda não guardada (pré-visualização nas Definições)
function imagemBanner(p, url = null) {
  const versao = Number(p.banner_versao) || 0;
  const src = url || (versao > 0 ? `/api/utilizadores/${Number(p.id)}/banner?v=${versao}` : null);
  return src ? `<img class="pbanner__foto" src="${esc(src)}" alt="">` : '';
}

// O cartão completo: banner (imagem própria ou cenário, na cor do dono) + as partes de cima
function cabecalhoPerfil(p, opcoes = {}) {
  return `<section class="pperfil cartao-perfil" style="--h:${corValida(p.cor)}">
    <div class="pbanner" data-tema="${temaValido(p.tema_banner)}" aria-hidden="true">${imagemBanner(p)}</div>
    ${partesPerfil(p, opcoes)}
  </section>`;
}
