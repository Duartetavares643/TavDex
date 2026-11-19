// =====================================================================
//  Painel de administração (só administradores)
//  Secções (?s=): resumo · utilizadores · denuncias · titulos · catalogo
//  Editar um filme/série: ?s=titulos&titulo=ID (ou &titulo=novo)
//  Cada secção está no seu ficheiro, em js/paginas/admin/:
//    resumo.js · utilizadores.js · denuncias.js · titulos.js · catalogo.js
// =====================================================================
(async () => {
  const u = await sessao;
  if (!u) return irLogin();
  if (u.papel !== 'admin') return mostrarErro('Esta área é só para administradores.');

  const s = param('s') || 'resumo';
  const SECOES = [['resumo', 'Resumo'], ['utilizadores', 'Utilizadores'], ['denuncias', 'Denúncias'],
    ['titulos', 'Filmes e séries'], ['catalogo', 'Géneros, plataformas e pessoas']];
  const app = document.getElementById('app');

  // Moldura comum: título e separadores (links)
  function moldura(conteudo) {
    mostrar(`<div class="content"><div class="left">
      <div class="ah"><h1 class="ph">Administração</h1><small>Olá, ${esc(u.nome)}</small></div>
      <div class="tabs links">${SECOES.map(([id, nome]) => `<a href="/admin.html?s=${id}" class="${s === id ? 'on' : ''}">${nome}</a>`).join('')}</div>
      ${conteudo}</div></div>`);
  }
  const recarregar = () => location.reload();

  // O que as secções precisam deste ficheiro
  const painel = { u, app, moldura, recarregar };

  try {
    if (s === 'utilizadores') await adminUtilizadores(painel);
    else if (s === 'denuncias') await adminDenuncias(painel);
    else if (s === 'titulos' && param('titulo')) await adminEditarTitulo(painel, param('titulo'));
    else if (s === 'titulos') await adminTitulos(painel);
    else if (s === 'catalogo') await adminCatalogo(painel);
    else await adminResumo(painel);
  } catch (e) {
    mostrarErro(e.message);
  }
})();
