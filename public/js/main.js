// =====================================================================
//  TavDex – partes comuns a todas as páginas
//  · barra de navegação, rodapé, sino das notificações e tema escuro/claro
//  · funções para desenhar avatares, cartazes, estrelas, datas, paginação
//  · separadores (tabs), formulários e avisos
//  Cada página carrega: api.js -> main.js -> js/paginas/<pagina>.js
// =====================================================================

// Estado da sessão: { u, aviso, google } (u = utilizador com sessão iniciada, ou null)
const estadoSessao = api('/api/auth/eu').catch(() => ({ u: null, aviso: null, google: true }));
// As páginas fazem: const u = await sessao;
const sessao = estadoSessao.then(r => r.u);

// Cópias "síncronas" para os cliques (ficam preenchidas quando a sessão chega)
let sessaoAtual;            // undefined = ainda a carregar; null = visitante
let googleConfigurado = true;
estadoSessao.then(r => { sessaoAtual = r.u; googleConfigurado = r.google !== false; });

// Parâmetro do endereço, ex.: param('id') em "titulo.html?id=3" -> "3"
function param(nome) {
  return new URLSearchParams(location.search).get(nome);
}

// Página atual (para voltar depois do login)
function paginaAtual() {
  return location.pathname + location.search;
}

// Leva ao login e depois volta a esta página
function irLogin() {
  location.href = '/login.html?voltar=' + encodeURIComponent(paginaAtual());
}

// Nome que se mostra (nome de exibição, ou o @nome se não houver)
function nomeVisivel(u) {
  return u.nome_exibicao || u.nome;
}

// Página para onde voltar depois do login/registo (?voltar=). Só caminhos internos:
// começam por "/" e não por "//", sem "\", e nunca as páginas de autenticação.
function voltarDoEndereco() {
  const v = param('voltar') || '/';
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\') || /^\/*(https?|javascript|data):/i.test(v)) return '/';
  if (/^\/(login|entrar|registar|recuperar|repor|nova-palavra-passe)(\.html)?(\/|\?|#|$)/i.test(v)) return '/';
  return v;
}

// Junta um aviso (?ok=) a um caminho interno, para aparecer na página seguinte
function comAviso(caminho, texto) {
  const url = new URL(caminho, location.origin);
  url.searchParams.set('ok', texto);
  return url.pathname + url.search + url.hash;
}

// Campo de palavra-passe com o botão Ver/Ocultar
function campoPassword(nome, rotulo, autocomplete, extra = '') {
  return `<div class="campo-pw"><input name="${nome}" type="password" placeholder="${esc(rotulo)}" aria-label="${esc(rotulo)}"
      autocomplete="${autocomplete}" ${extra}>
    <button type="button" class="ver-pw" data-ver-pw aria-label="Mostrar a palavra-passe">Ver</button></div>`;
}

// =====================================================================
// PALAVRA-PASSE NOVA: barra de força (Fraca / Razoável / Boa / Forte), lista de
// requisitos ao vivo (✓ / ○), "As palavras-passe não coincidem." e o botão de
// enviar só ativo quando está tudo cumprido.
// As regras estão em /js/regras-palavra-passe.js (o mesmo ficheiro que o servidor usa);
// a página tem de o carregar antes deste.
//  campo     = <input> da palavra-passe nova
//  barra     = <div class="forca"> (4 traços + texto)
//  dados     = função que devolve { nome, nomeExibicao, email } (para "não contém o teu nome")
//  confirmar = <input> "Confirmar a palavra-passe" (opcional)
// =====================================================================
function ligarBarraForca(campo, barra, { dados = () => ({}), confirmar = null } = {}) {
  const R = window.RegrasPalavraPasse;
  if (!campo || !barra || !R) return;
  const form = campo.form;
  const botao = form && form.querySelector('button[type=submit], button:not([type])');

  // Lista de requisitos por baixo da barra
  const lista = document.createElement('ul');
  lista.className = 'requisitos';
  lista.id = (campo.id || campo.name) + '-requisitos';
  barra.after(lista);
  campo.setAttribute('aria-describedby', lista.id);

  // Nota "As palavras-passe não coincidem." por baixo do campo de confirmar
  let notaConfirmar = null;
  if (confirmar) {
    notaConfirmar = document.createElement('small');
    notaConfirmar.className = 'nota-campo erro';
    notaConfirmar.setAttribute('aria-live', 'polite');
    (confirmar.closest('.campo-pw') || confirmar).after(notaConfirmar);
  }

  const atualizar = () => {
    const a = R.analisar(campo.value, dados());
    barra.dataset.n = campo.value ? a.forca : '';
    barra.querySelector('span').textContent = campo.value
      ? `Força: ${R.NOMES_FORCA[a.forca]}`
      : 'Pelo menos 10 caracteres, com maiúsculas, minúsculas, números e símbolos';
    // ✓ verde quando cumprido, ○ cinzento quando falta (o texto escondido ajuda os leitores de ecrã)
    let html = a.requisitos.map(r => `<li class="${r.ok ? 'ok' : ''}"><span aria-hidden="true">${r.ok ? '✓' : '○'}</span>
      ${esc(r.texto)}<span class="sr">${r.ok ? ' – cumprido' : ' – em falta'}</span></li>`).join('');
    // Regras que não estão na lista (repetidos, sequências, tamanho em bytes)
    const extra = a.requisitos.every(r => r.ok) && !a.valida ? a.erros[0] : '';
    if (extra) html += `<li class="falta"><span aria-hidden="true">!</span> ${esc(extra)}</li>`;
    lista.innerHTML = html;

    const coincidem = !confirmar || !confirmar.value || confirmar.value === campo.value;
    if (notaConfirmar) notaConfirmar.textContent = coincidem ? '' : 'As palavras-passe não coincidem.';
    if (botao) botao.disabled = !(a.valida && (!confirmar || confirmar.value === campo.value));
  };
  // Ouve o formulário todo (o nome e o email também contam para "não contém o teu nome")
  (form || campo).addEventListener('input', atualizar);
  atualizar();
}

// =====================================================================
// EMAIL: ao sair do campo mostra se o formato está errado e sugere a
// correção de erros de escrita ("Querias dizer duarte@gmail.com?").
// É só uma ajuda: quem decide é o servidor. Usa /js/regras-email.js.
// =====================================================================
//  verificar = true (no registo): depois do formato, pergunta ao servidor se o domínio
//  existe e recebe emails e se já há uma conta com este email.
function ligarCampoEmail(campo, { verificar = false } = {}) {
  const R = window.RegrasEmail;
  if (!campo || !R) return;
  const nota = document.createElement('small');
  nota.className = 'nota-campo';
  nota.setAttribute('aria-live', 'polite');
  campo.after(nota);
  // Ao voltar a escrever, a nota antiga desaparece
  campo.addEventListener('input', () => { nota.textContent = ''; nota.className = 'nota-campo'; });
  campo.addEventListener('blur', async () => {
    nota.textContent = '';
    nota.className = 'nota-campo';
    if (!campo.value.trim()) return;
    const erro = R.erroFormato(campo.value);
    if (erro) {
      nota.classList.add('erro');
      nota.textContent = erro;
      return;
    }
    const sugestao = R.sugestao(campo.value);
    if (!sugestao) {
      if (!verificar) return;
      const valor = campo.value.trim();
      nota.textContent = 'A verificar o email…';
      try {
        const r = await api('/api/auth/email-disponivel?email=' + encodeURIComponent(valor));
        if (campo.value.trim() !== valor) return;   // entretanto mudou: esta resposta já não interessa
        nota.className = 'nota-campo ' + (r.valido ? 'ok' : 'erro');
        nota.textContent = r.mensagem;
        if (r.existe) {
          const link = document.createElement('a');
          link.className = 'lk';
          link.href = '/recuperar.html?login=' + encodeURIComponent(valor);
          link.textContent = 'Recuperar a palavra-passe';
          nota.append(' ', link);
        }
      } catch (erroPedido) {
        nota.textContent = '';   // sem resposta (ou demasiados pedidos): o servidor volta a verificar ao criar a conta
      }
      return;
    }
    // Montado com DOM (textContent): o email escrito nunca entra como HTML
    nota.append('Querias dizer ');
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'lk';
    botao.textContent = sugestao;
    botao.addEventListener('click', () => {
      campo.value = sugestao;
      nota.textContent = '';
      campo.dispatchEvent(new Event('input', { bubbles: true }));
      campo.focus();
    });
    nota.append(botao, '?');
  });
}

// =====================================================================
// NOME DA PESSOA (ex.: "Duarte Tavares"): só letras (com acentos), espaços,
// hífen e apóstrofo — sem números nem símbolos. A mesma regra está no servidor
// (nomeExibicao em routes/ajudas.js). Devolve a mensagem de erro, ou '' se estiver bem.
// =====================================================================
const REGRA_NOME_PESSOA = /^[\p{L}\p{M}]+(?:[ '’-][\p{L}\p{M}]+)*$/u;
function erroNomePessoa(valor) {
  const t = String(valor || '').replace(/\s+/g, ' ').trim();
  if (!t) return 'Escreve o teu nome.';
  if (t.length < 2 || t.length > 50) return 'O nome tem de ter entre 2 e 50 caracteres.';
  if (!/\p{L}/u.test(t)) return 'O nome tem de ter letras.';
  if (!REGRA_NOME_PESSOA.test(t)) return "O nome só pode ter letras, espaços, hífen (-) e apóstrofo ('). Sem números nem símbolos.";
  return '';
}

// Mostra o erro de um campo enquanto se escreve (sem mexer no foco).
//  verificar = função que devolve a mensagem de erro, ou '' se estiver bem
function ligarVerificacaoCampo(campo, verificar) {
  if (!campo) return;
  const nota = document.createElement('small');
  nota.className = 'nota-campo erro';
  nota.setAttribute('aria-live', 'polite');
  campo.after(nota);
  const atualizar = () => {
    const erro = campo.value ? verificar(campo.value) : '';
    nota.textContent = erro;
    if (erro) campo.setAttribute('aria-invalid', 'true'); else campo.removeAttribute('aria-invalid');
  };
  campo.addEventListener('input', atualizar);
  campo.addEventListener('blur', atualizar);
}

// =====================================================================
// @NOME DISPONÍVEL AO VIVO: enquanto se escreve (espera 400 ms depois da última
// tecla) pergunta ao servidor e mostra "✓ Disponível" ou "Já está a ser usado".
//  atual = @nome atual da conta (nas Definições), que conta como disponível
// =====================================================================
function ligarNomeDisponivel(campo, atual = '') {
  if (!campo) return;
  const nota = document.createElement('small');
  nota.className = 'nota-campo';
  nota.setAttribute('aria-live', 'polite');
  campo.after(nota);
  let relogio = null;
  let pedido = 0;
  campo.addEventListener('input', () => {
    clearTimeout(relogio);
    nota.textContent = '';
    nota.className = 'nota-campo';
    const nome = campo.value.trim().replace(/^@/, '');
    if (nome.length < 3 || nome === atual) return;
    relogio = setTimeout(async () => {
      const este = ++pedido;   // só conta a resposta do último pedido
      try {
        const r = await api('/api/utilizadores/disponivel?nome=' + encodeURIComponent(nome));
        if (este !== pedido) return;
        nota.className = 'nota-campo ' + (r.disponivel ? 'ok' : 'erro');
        nota.textContent = r.mensagem;
      } catch (erro) { /* demasiados pedidos ou sem rede: o servidor verifica ao guardar */ }
    }, 400);
  });
}

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

// =====================================================================
// SESSÃO EM TODOS OS SEPARADORES
// Terminar (ou iniciar) sessão num separador atualiza logo os outros, com
// BroadcastChannel (e o evento "storage" nos browsers que não o têm).
// =====================================================================
const PAGINAS_PRIVADAS = /^\/(definicoes|listas|chat|notificacoes|admin|candidaturas|projeto-novo|projeto-editar)(\.html)?$/;
const paginaPrivada = () => PAGINAS_PRIVADAS.test(location.pathname);
let canalSessao = null;
try { canalSessao = new BroadcastChannel('tavdex-sessao'); } catch (erro) { /* browser antigo: usa o "storage" */ }

function avisarOutrosSeparadores(tipo) {
  if (canalSessao) canalSessao.postMessage({ tipo });
  try { localStorage.setItem('tavdex-sessao', JSON.stringify({ tipo, t: Date.now() })); } catch (erro) { /* ignora */ }
}

function sessaoMudouNoutroSeparador(tipo) {
  if (tipo === 'saiu' && sessaoAtual) {
    // Página privada -> início; pública -> fica nela, agora como visitante
    if (paginaPrivada()) location.href = '/'; else location.reload();
  } else if (tipo === 'entrou') {
    location.reload();
  }
}
if (canalSessao) canalSessao.onmessage = e => sessaoMudouNoutroSeparador(e.data && e.data.tipo);
else window.addEventListener('storage', e => {
  if (e.key === 'tavdex-sessao' && e.newValue) sessaoMudouNoutroSeparador(JSON.parse(e.newValue).tipo);
});

// Aviso para mostrar na página seguinte (ex.: "Sessão terminada…")
function avisoNaProximaPagina(texto) {
  try { sessionStorage.setItem('tavdex-aviso', texto); } catch (erro) { /* ignora */ }
}

// Terminar sessão (POST com o token CSRF). todos = em todos os dispositivos, incluindo este.
async function terminarSessao(todos = false) {
  if (todos) {
    const sim = await confirmarJanela({
      titulo: 'Sair de todos os dispositivos?',
      texto: 'Vais sair do TavDex em todos os dispositivos, incluindo este.',
      sim: 'Terminar em todos', nao: 'Cancelar',
    });
    if (!sim) return;
  }
  try {
    const r = await api(todos ? '/api/auth/logout-todos' : '/api/auth/logout', 'POST');
    avisoNaProximaPagina(r.aviso);
  } catch (erro) { /* sem sessão: vai para o início na mesma */ }
  avisarOutrosSeparadores('saiu');
  // Página pública: fica nela como visitante; privada: vai para o início
  location.href = paginaPrivada() ? '/' : paginaAtual();
}

// Erro com vários campos (para validar no browser antes de enviar)
function erroCampos(erros) {
  const erro = new Error('Corrige os campos assinalados.');
  erro.erros = erros;
  return erro;
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
function temaValido(tema) {
  return Object.prototype.hasOwnProperty.call(TEMAS_BANNER, tema) ? tema : 'colina';
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
  const numeros = !contagens ? '' : `<ul class="pnums">
      <li><b id="n-seg">${Number(contagens.seguidores) || 0}</b>Seguidores</li>
      <li><b>${Number(contagens.a_seguir) || 0}</b>A seguir</li>
      <li><b>${Number(contagens.avaliacoes) || 0}</b>Avaliações</li>
      <li><b>${Number(contagens.vistos) || 0}</b>Vistos</li>
      <li><b>${Number(contagens.projetos) || 0}</b>Projetos</li>
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

// O cartão completo: banner (com o cenário e a cor do dono) + as partes de cima
function cabecalhoPerfil(p, opcoes = {}) {
  return `<section class="pperfil cartao-perfil" style="--h:${corValida(p.cor)}">
    <div class="pbanner" data-tema="${temaValido(p.tema_banner)}" aria-hidden="true"></div>
    ${partesPerfil(p, opcoes)}
  </section>`;
}

// "G" colorido oficial do Google (as regras de marca da Google exigem o logótipo oficial)
const LOGO_GOOGLE = `<svg class="g-logo" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;

// Botão "Continuar com Google" (login, registo e janela de login). Volta à página indicada.
// A escolha "Manter sessão iniciada" fica guardada neste browser e o Google usa a última escolha
function manterSessaoGuardado() {
  try { return localStorage.getItem('tavdex-manter') === '1'; } catch (erro) { return false; }
}
function botaoGoogle(texto = 'Continuar com Google', voltar = paginaAtual()) {
  const manter = manterSessaoGuardado() ? '&manter=1' : '';
  return `<a class="btn google" data-google href="/api/auth/google?voltar=${encodeURIComponent(voltar)}${manter}">${LOGO_GOOGLE}<span>${esc(texto)}</span></a>`;
}

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
      ${p.dono_nome ? `<small class="pjv-dono">por @${esc(p.dono_nome)}</small>` : ''}
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
// Se o servidor devolver { erros: { campo: mensagem } }, cada campo errado
// fica marcado (aria-invalid + borda vermelha) com a mensagem por baixo.
// O que foi escrito nunca se perde.
// =====================================================================
function limparErrosCampos(form) {
  form.querySelectorAll('[aria-invalid]').forEach(c => c.removeAttribute('aria-invalid'));
  form.querySelectorAll('.erro-campo').forEach(s => s.remove());
}

function marcarErrosCampos(form, erros) {
  let primeiro = null;
  for (const [nome, mensagem] of Object.entries(erros)) {
    const campo = form.elements[nome];
    if (!campo || !campo.tagName) continue;
    campo.setAttribute('aria-invalid', 'true');
    const nota = document.createElement('small');
    nota.className = 'erro-campo';
    nota.id = `erro-${form.id}-${nome}`;
    nota.textContent = mensagem;
    campo.setAttribute('aria-describedby', nota.id);
    // Põe a mensagem depois do campo (ou depois da caixa do campo, se existir)
    (campo.closest('.campo-pw, .chk, .foto-campo') || campo).after(nota);
    primeiro = primeiro || campo;
  }
  if (primeiro) primeiro.focus();
}

function ligarForm(form, funcao) {
  if (!form) return;
  // Ao corrigir um campo, a marca de erro desaparece
  form.addEventListener('input', e => {
    if (e.target.getAttribute && e.target.getAttribute('aria-invalid')) {
      e.target.removeAttribute('aria-invalid');
      const nota = document.getElementById(e.target.getAttribute('aria-describedby') || '');
      if (nota && nota.classList.contains('erro-campo')) nota.remove();
    }
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const botao = form.querySelector('button[type=submit], button:not([type])');
    const msg = form.querySelector('.msg');
    if (msg) msg.textContent = '';
    limparErrosCampos(form);
    const dados = Object.fromEntries(new FormData(form));
    // Checkboxes não marcados não aparecem no FormData: põe-nos a false
    form.querySelectorAll('input[type=checkbox][name]').forEach(c => { if (!c.dataset.lista) dados[c.name] = c.checked; });
    if (botao) botao.disabled = true;
    try {
      await funcao(dados, form);
    } catch (erro) {
      if (erro.status === 401) return abrirJanelaLogin(form.dataset.acao || 'continuar');
      if (erro.erros) marcarErrosCampos(form, erro.erros);
      // Registo com um email que já tem conta: ligação para recuperar a palavra-passe
      const notaEmail = document.getElementById(`erro-${form.id}-email`);
      if (notaEmail && /^Já existe uma conta/.test(notaEmail.textContent)) {
        notaEmail.insertAdjacentHTML('beforeend', ' <a class="lk" href="/recuperar.html"><b>Recuperar a palavra-passe</b></a>');
      }
      if (msg) {
        msg.textContent = erro.message;
        // Bloqueio do login: ligação para recuperar a palavra-passe, já com o email/@nome escrito
        if (erro.codigo === 'bloqueado') {
          const escrito = form.elements.login ? form.elements.login.value.trim() : '';
          const link = document.createElement('a');
          link.className = 'lk';
          link.href = '/recuperar.html' + (escrito ? '?login=' + encodeURIComponent(escrito) : '');
          link.textContent = 'Recuperar a palavra-passe';
          msg.append(' ', link);
        }
      } else {
        aviso(erro.message, 'erro');
      }
    } finally {
      if (botao) botao.disabled = false;
      // Volta a verificar o formulário (ex.: o botão só fica ativo com a palavra-passe certa)
      form.dispatchEvent(new Event('input'));
    }
  });
}

// Faz uma ação e mostra o erro se correr mal (para botões simples).
// Se for preciso login, abre a janela "Inicia sessão para continuar".
async function tentar(funcao, acao = 'fazer isto') {
  try {
    return await funcao();
  } catch (erro) {
    if (erro.status === 401) return abrirJanelaLogin(acao);
    aviso(erro.message, 'erro');
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
      < class="btn ghost" href="/registar.html?voltar=${voltar}">Criar conta grátis</a>
    </div>
    <button type="button" class="lk modal-fechar" data-fechar-janela>Continuar a explorar</button>
  </div>`;
  // textContent: a ação vem de um atributo da página, nunca entra como HTML
  janela.querySelector('.modal-txt').textContent =
    `Para ${acao} precisas de uma conta TavDex. É grátis e demora menos de um minuto.`;
  if (typeof janela.showModal === 'function') janela.showModal(); else janela.setAttribute('open', '');
  janela.querySelector('.btn.primary').focus();
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
      <button class="ub" type="button" aria-haspopup="true">${avatar(u)}<span class="nome">@${esc(u.nome)}</span> ▾</button>
      <div class="dd">
        <a href="/perfil.html?u=${encodeURIComponent(u.nome)}">Perfil</a>
        <a href="/listas.html">As minhas listas</a>
        <a href="/chat.html">Chat</a>
        <a href="/notificacoes.html">Notificações</a>
        ${u.papel === 'admin' ? '<a href="/admin.html">Painel de administração</a>' : ''}
        <a href="/definicoes.html">Definições</a>
        <a href="/definicoes.html?tab=seguranca">Segurança da conta</a>
        <form id="sair"><button class="rtog">Terminar sessão</button></form>
        <button type="button" class="rtog sair-todos" data-sair-todos>Terminar sessão em todos os dispositivos</button>
      </div>
    </div>`
    : `<a class="btn ghost sm nav-btn" href="/login.html?voltar=${encodeURIComponent(paginaAtual())}">Entrar</a>
       <a class="btn primary sm nav-btn" href="/registar.html?voltar=${encodeURIComponent(paginaAtual())}">Registar</a>`;

  const topo = document.createElement('header');
  topo.className = 'nav';
  topo.innerHTML = `
    <a href="/" class="bl"><img src="/img/logo.png" alt=""><span>Tav<em>Dex</em></span></a>
    <nav>${links}</nav>
    <form class="search" action="/pesquisa.html" method="get" role="search">${ICONES.lupa}
      <input type="search" name="q" value="${esc(q)}" placeholder="Pesquisar filmes, séries, pessoas, projetos..." aria-label="Pesquisar">
    </form>
    <button class="icone-btn tema" type="button" data-mudar-tema aria-label="Mudar entre modo escuro e claro" title="Modo escuro / claro">${ICONES.lua}${ICONES.sol}</button>
    ${conta}`;
  document.body.prepend(topo);

  // Terminar sessão (POST com token CSRF), aqui ou em todos os dispositivos
  const sair = document.getElementById('sair');
  if (sair) sair.addEventListener('submit', e => {
    e.preventDefault();
    terminarSessao(false);
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
      <a href="/privacidade.html">Privacidade</a><a href="/termos.html">Termos</a>
    </nav>
    <small>TavDex © ${new Date().getFullYear()} · PAP de Duarte Veríssimo Tavares · Técnico de Informática – Sistemas</small>
  </div>`;
  document.body.append(rodape);
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
