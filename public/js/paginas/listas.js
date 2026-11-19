// =====================================================================
//  As minhas listas: favoritos, "a ver" e vistos, mais as recomendações.
//  Cada cartão tem botões para mudar de lista ou tirar.
// =====================================================================
(async () => {
  const u = await sessao;
  if (!u) return irLogin();

  // Pede as listas e mostra o separador escolhido (a ver, vistos ou favoritos)
  async function carregar(separador = location.hash.slice(1) || 'ver') {
    const [l, r] = await Promise.all([api('/api/listas'), api('/api/recomendacoes')]);

    // Cartão com botões: tirar desta lista e, na lista "a ver", marcar como visto
    const cartao = (t, tipo) => `<div class="lcard">${cartaoTitulo(t)}<div class="lbtns">
        ${tipo === 'ver' ? `<button class="btn ghost sm" data-titulo="${t.id}" data-tipo="visto">✓ Visto</button>` : ''}
        <button class="del-btn" data-titulo="${t.id}" data-tipo="${tipo}" title="Tirar da lista">✕ Tirar</button></div></div>`;
    const lista = (titulos, tipo, vazio) => titulos.length
      ? `<div class="grid g5">${titulos.map(t => cartao(t, tipo)).join('')}</div>`
      : `<p class="empty">${vazio} <a class="lk" href="/catalogo.html">Explorar o catálogo →</a></p>`;

    mostrar(`<div class="content"><div class="left">
      <h1 class="ph">As minhas listas</h1>
      <div class="tabsbox">
        <div class="tabs">
          <button data-tab="ver">A ver (${l.ver.length})</button>
          <button data-tab="favorito">Favoritos (${l.favorito.length})</button>
          <button data-tab="visto">Vistos (${l.visto.length})</button>
          <button data-tab="recomendados">Recomendados para ti</button>
        </div>
        <div data-pane="ver">${lista(l.ver, 'ver', 'A lista "a ver" está vazia.')}</div>
        <div data-pane="favorito" hidden>${lista(l.favorito, 'favorito', 'Ainda não tens favoritos.')}</div>
        <div data-pane="visto" hidden>${lista(l.visto, 'visto', 'Ainda não marcaste nada como visto.')}</div>
        <div data-pane="recomendados" hidden>
          <p class="muted" style="margin-bottom:16px">Com base nos géneros que avaliaste com 4 ou 5 estrelas, sem o que já viste.</p>
          ${grelha(r.titulos, 'Avalia alguns títulos para receberes recomendações.')}</div>
      </div></div></div>`);
    (document.querySelector(`[data-tab="${CSS.escape(separador)}"]`) || document.querySelector('[data-tab="ver"]')).click();
  }

  document.getElementById('app').addEventListener('click', async e => {
    const b = e.target.closest('[data-titulo]');
    if (!b) return;
    const separador = document.querySelector('.tabs .on')?.dataset.tab;
    if (await tentar(() => api(`/api/listas/${b.dataset.titulo}/${b.dataset.tipo}`, 'POST'))) carregar(separador);
  });

  carregar();
})();
