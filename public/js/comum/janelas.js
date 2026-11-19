// =====================================================================
//  TavDex – janelas e avisos
//  Janelas (dialog) acessíveis, "Inicia sessão para continuar", avisos verdes e
//  vermelhos no topo da página e mostrar o conteúdo principal (#app).
// =====================================================================

// =====================================================================
// JANELAS (confirmar, recortar a foto, …) no estilo da "Inicia sessão para continuar":
// role="dialog", aria-modal="true", o foco fica preso lá dentro (Tab e Shift+Tab)
// e Esc fecha. Devolve o <dialog>; ao fechar, o foco volta ao elemento de antes.
// =====================================================================
function abrirJanela(html, { classe = '', aoFechar = null } = {}) {
  const antes = document.activeElement;
  const janela = document.createElement('dialog');
  janela.className = 'modal ' + classe;
  janela.setAttribute('role', 'dialog');
  janela.setAttribute('aria-modal', 'true');
  janela.innerHTML = html;
  const titulo = janela.querySelector('h2');
  if (titulo) {
    titulo.id = titulo.id || 'janela-' + Math.random().toString(36).slice(2);
    janela.setAttribute('aria-labelledby', titulo.id);
  }
  document.body.append(janela);
  janela.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const focaveis = [...janela.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter(el => !el.disabled && el.offsetParent !== null);
    if (!focaveis.length) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
  });
  janela.addEventListener('click', e => { if (e.target === janela) janela.close(); });   // clicar fora fecha
  janela.addEventListener('close', () => {
    if (aoFechar) aoFechar();
    janela.remove();
    if (antes && antes.focus) antes.focus();
  });
  if (typeof janela.showModal === 'function') janela.showModal(); else janela.setAttribute('open', '');   // Esc fecha sozinho
  return janela;
}

// Pergunta de sim/não numa janela. Devolve uma promessa com true (confirmou) ou false.
function confirmarJanela({ titulo, texto, sim = 'Confirmar', nao = 'Cancelar' }) {
  return new Promise(resolve => {
    let resposta = false;
    const janela = abrirJanela(`<div class="modal-in">
        <h2></h2><p class="modal-txt"></p>
        <div class="modal-btns"><button type="button" class="btn primary" data-sim></button>
          <button type="button" class="btn ghost" data-nao></button></div>
      </div>`, { classe: 'modal-aviso', aoFechar: () => resolve(resposta) });
    // textContent: os textos nunca entram como HTML
    janela.querySelector('h2').textContent = titulo;
    janela.querySelector('.modal-txt').textContent = texto;
    janela.querySelector('[data-sim]').textContent = sim;
    janela.querySelector('[data-nao]').textContent = nao;
    janela.querySelector('[data-sim]').addEventListener('click', () => { resposta = true; janela.close(); });
    janela.querySelector('[data-nao]').addEventListener('click', () => janela.close());
    janela.querySelector('[data-nao]').focus();
  });
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

// Avisos que chegam pelo endereço (ex.: depois do login com o Google) ou guardados
// na sessão (ex.: "Sessão terminada…"). Depois de mostrados, saem do endereço.
function avisosDoEndereco(avisoSessao) {
  const ok = param('ok');
  const erro = param('erro');
  if (avisoSessao) aviso(avisoSessao);
  // Aviso guardado pela página anterior (ex.: "Sessão terminada…" depois do logout)
  try {
    const guardado = sessionStorage.getItem('tavdex-aviso');
    if (guardado) { sessionStorage.removeItem('tavdex-aviso'); aviso(guardado); }
  } catch (erroGuardado) { /* ignora */ }
  if (ok) aviso(ok);
  if (erro) aviso(erro, 'erro');
  if (ok || erro) {
    const url = new URL(location.href);
    url.searchParams.delete('ok');
    url.searchParams.delete('erro');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
}

// =====================================================================
// JANELA "INICIA SESSÃO PARA CONTINUAR" (modo visitante)
// Abre quando um visitante carrega num elemento com data-requer-login="(ação)"
// ou quando a API responde 401. Os botões voltam a esta página depois do login.
// =====================================================================
function abrirJanelaLogin(acao = 'continuar') {
  let janela = document.getElementById('janela-login');
  if (!janela) {
    janela = document.createElement('dialog');
    janela.id = 'janela-login';
    janela.className = 'modal';
    janela.setAttribute('aria-labelledby', 'janela-login-titulo');
    document.body.append(janela);
    // Clicar fora da caixa fecha a janela
    janela.addEventListener('click', e => { if (e.target === janela) janela.close(); });
  }
  const voltar = encodeURIComponent(paginaAtual());
  janela.innerHTML = `<div class="modal-in">
    <img src="/img/logo.png" alt="" class="modal-logo">
    <h2 id="janela-login-titulo">Inicia sessão para continuar</h2>
    <p class="modal-txt"></p>
    <div class="modal-btns">
      <a class="btn primary" href="/login.html?voltar=${voltar}">Iniciar sessão</a>
      ${botaoGoogle('Continuar com Google')}
      <a class="btn ghost" href="/registar.html?voltar=${voltar}">Criar conta grátis</a>
    </div>
    <button type="button" class="lk modal-fechar" data-fechar-janela>Continuar a explorar</button>
  </div>`;
  // textContent: a ação vem de um atributo da página, nunca entra como HTML
  janela.querySelector('.modal-txt').textContent =
    `Para ${acao} precisas de uma conta TavDex. É grátis e demora menos de um minuto.`;
  if (typeof janela.showModal === 'function') janela.showModal(); else janela.setAttribute('open', '');
  janela.querySelector('.btn.primary').focus();
}

// Depois do login com uma palavra-passe antiga que já não cumpre as regras (não bloqueia)
function avisoPalavraPasseFraca() {
  const div = document.createElement('div');
  div.className = 'flash erro';
  div.setAttribute('role', 'alert');
  div.append('A tua palavra-passe já não cumpre as regras de segurança do TavDex. ');
  const link = document.createElement('a');
  link.className = 'lk';
  link.href = '/definicoes.html?tab=seguranca';
  link.innerHTML = '<b>Altera-a agora</b>';
  div.append(link, '.');
  document.querySelector('main').prepend(div);
  setTimeout(() => div.remove(), 15000);
}
