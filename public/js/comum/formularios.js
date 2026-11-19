// =====================================================================
//  TavDex – envio dos formulários
//  ligarFormulario() junta os campos, envia, desativa o botão enquanto espera e mostra
//  os erros de cada campo. tentar() faz o mesmo para botões simples.
// =====================================================================

// Erro com vários campos (para validar no browser antes de enviar)
function erroCampos(erros) {
  const erro = new Error('Corrige os campos assinalados.');
  erro.erros = erros;
  return erro;
}

// =====================================================================
// FORMULÁRIOS
// ligarFormulario(form, async dados => {...}): impede o envio normal, junta os
// campos num objeto, desativa o botão enquanto espera e mostra os erros.
// Se o servidor devolver { erros: { campo: mensagem } }, cada campo errado
// fica marcado (aria-invalid + borda vermelha) com a mensagem por baixo.
// O que foi escrito nunca se perde.
// =====================================================================
function limparErrosCampos(form) {
  form.querySelectorAll('[aria-invalid]').forEach(c => c.removeAttribute('aria-invalid'));
  form.querySelectorAll('.erro-campo').forEach(s => s.remove());
}

// Põe cada campo errado a vermelho com a mensagem por baixo; o foco vai para o primeiro
function marcarErrosCampos(form, erros) {
  let primeiro = null;
  for (const [nome, mensagem] of Object.entries(erros)) {
    const campo = form.elements[nome];
    if (!campo || !campo.tagName) continue;
    campo.setAttribute('aria-invalid', 'true');
    primeiro = primeiro || campo;
    // A verificação ao vivo já mostra esta mensagem a vermelho: não a repete
    const caixa = campo.closest('.campo-pw, .chk, .foto-campo') || campo;
    const aoVivo = [...caixa.parentElement.querySelectorAll('.nota-campo.erro')].some(n => n.textContent.trim() === mensagem);
    if (aoVivo) continue;
    const nota = document.createElement('small');
    nota.className = 'erro-campo';
    nota.id = `erro-${form.id}-${nome}`;
    nota.textContent = mensagem;
    campo.setAttribute('aria-describedby', nota.id);
    // Põe a mensagem depois do campo (ou depois da caixa do campo, se existir)
    caixa.after(nota);
  }
  if (primeiro) primeiro.focus();
}

// Liga o formulário (ver a explicação no bloco de cima)
function ligarFormulario(form, funcao) {
  if (!form) return;
  // Ao corrigir um campo, a marca de erro do último envio desaparece.
  // Corre na fase de captura (antes das verificações ao vivo de cada campo), para
  // essas verificações poderem voltar a pôr o campo a vermelho se ainda estiver errado.
  form.addEventListener('input', e => {
    if (e.target.getAttribute && e.target.getAttribute('aria-invalid')) {
      e.target.removeAttribute('aria-invalid');
      const nota = document.getElementById(e.target.getAttribute('aria-describedby') || '');
      if (nota && nota.classList.contains('erro-campo')) nota.remove();
    }
  }, true);
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
