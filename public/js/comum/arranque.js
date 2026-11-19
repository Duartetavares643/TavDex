// =====================================================================
//  TavDex – o que corre ao abrir cada página
//  Desenha o topo e o rodapé quando a sessão chega, mostra os avisos e liga os
//  cliques comuns a todas as páginas (separadores, menu, tema, ver palavra-passe,
//  denúncias, …). Tem de ser o ÚLTIMO ficheiro de comum/ a carregar.
// =====================================================================

estadoSessao.then(estado => {
  desenharTopo(estado.u);
  desenharRodape(estado.u);
  avisosDoEndereco(estado.aviso);
  if (estado.palavra_passe_fraca) avisoPalavraPasseFraca();
  // A sessão mudou desde a última página (login, Google, confirmação, logout)? Avisa os outros separadores.
  try {
    const agora = estado.u ? String(estado.u.id) : '';
    const antes = localStorage.getItem('tavdex-uid');
    if (antes !== null && antes !== agora) avisarOutrosSeparadores(agora ? 'entrou' : 'saiu');
    localStorage.setItem('tavdex-uid', agora);
  } catch (erro) { /* ignora */ }
});

// Botão Retroceder: o browser pode mostrar uma cópia guardada da página (bfcache).
// Numa página privada, recarrega-a, para não mostrar dados depois de terminar sessão.
window.addEventListener('pageshow', e => {
  if (e.persisted && paginaPrivada()) location.reload();
});

// =====================================================================
// INTERATIVIDADE COMUM (com "delegação": um só ouvinte para a página toda)
// =====================================================================

// Modo visitante: qualquer elemento com data-requer-login="(ação)" abre a janela
// de login em vez de fazer a ação. Corre na fase de "captura" (true), antes dos
// ouvintes da própria página, para os parar. A proteção verdadeira é a do servidor.
document.addEventListener('click', e => {
  const alvo = e.target.closest('[data-requer-login]');
  if (alvo && sessaoAtual === null) {
    e.preventDefault();
    e.stopImmediatePropagation();
    abrirJanelaLogin(alvo.dataset.requerLogin || 'continuar');
  }
  // Botões do Google quando o Google ainda não foi configurado no servidor
  if (e.target.closest('[data-google]') && !googleConfigurado) {
    e.preventDefault();
    aviso('O login com Google ainda não foi configurado.', 'erro');
  }
}, true);

document.addEventListener('click', e => {
  // Fechar a janela de login ("Continuar a explorar")
  if (e.target.closest('[data-fechar-janela]')) e.target.closest('dialog').close();

  // "Terminar sessão em todos os dispositivos" (menu da conta e Definições)
  if (e.target.closest('[data-sair-todos]')) terminarSessao(true);

  // Ver / Ocultar a palavra-passe
  const verPw = e.target.closest('[data-ver-pw]');
  if (verPw) {
    const campo = verPw.parentElement.querySelector('input');
    const mostrar = campo.type === 'password';
    campo.type = mostrar ? 'text' : 'password';
    verPw.textContent = mostrar ? 'Ocultar' : 'Ver';
    verPw.setAttribute('aria-label', mostrar ? 'Ocultar a palavra-passe' : 'Mostrar a palavra-passe');
  }

  // Setas das filas horizontais de cartazes
  const seta = e.target.closest('[data-fila]');
  if (seta) {
    const fila = seta.closest('.row').querySelector('.hrow');
    fila.scrollBy({ left: Number(seta.dataset.fila) * fila.clientWidth * 0.85, behavior: 'smooth' });
  }

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
  // (O botão tem um atributo só seu: o <html data-tema="claro"> e os banners também têm
  //  "data-tema", e antes qualquer clique na página, no modo claro, voltava ao escuro.)
  if (e.target.closest('[data-mudar-tema]')) {
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
  if (!(await sessao)) return abrirJanelaLogin('denunciar conteúdos');
  await tentar(async () => {
    const r = await api('/api/comunidade/denuncias', 'POST', { tipo: f.dataset.denunciar, alvo_id: f.dataset.alvo, motivo: f.motivo.value });
    f.closest('details').open = false;
    aviso(r.mensagem);
  });
});

// Abre o separador indicado no endereço (ex.: perfil.html?u=x#recomendados ou ?tab=seguranca)
function abrirSeparadorDoEndereco() {
  const nome = param('tab') || location.hash.slice(1);
  if (!nome) return;
  const b = document.querySelector(`.tabs [data-tab="${CSS.escape(nome)}"]`);
  if (b) b.click();
}
