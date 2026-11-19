// =====================================================================
//  TavDex – campos dos formulários com verificação ao vivo
//  Palavra-passe (requisitos e força), email ("Querias dizer…?"), nome da pessoa
//  e @nome (disponível?). O campo errado fica logo a vermelho com a mensagem.
//  As regras estão nos ficheiros partilhados com o servidor (js/regras-*.js).
// =====================================================================

// Campo de palavra-passe com o botão Ver/Ocultar
function campoPalavraPasse(nome, rotulo, autocomplete, extra = '') {
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
    // ✓ verde quando cumprido; quando falta: ○ cinzento com o campo vazio,
    // ✗ vermelho assim que se começa a escrever (o texto escondido ajuda os leitores de ecrã)
    const escrito = !!campo.value;
    let html = a.requisitos.map(r => {
      const estado = r.ok ? 'ok' : escrito ? 'falta' : '';
      return `<li class="${estado}"><span aria-hidden="true">${r.ok ? '✓' : escrito ? '✗' : '○'}</span>
      ${esc(r.texto)}<span class="sr">${r.ok ? ' – cumprido' : ' – em falta'}</span></li>`;
    }).join('');
    // Regras que não estão na lista (repetidos, sequências, tamanho em bytes)
    const extra = a.requisitos.every(r => r.ok) && !a.valida ? a.erros[0] : '';
    if (extra) html += `<li class="falta"><span aria-hidden="true">!</span> ${esc(extra)}</li>`;
    lista.innerHTML = html;
    // O campo fica a vermelho enquanto a palavra-passe escrita não cumprir tudo
    // (se o servidor deu um erro a este campo no último envio, esse erro fica até se corrigir)
    if (!document.getElementById(`erro-${form ? form.id : ''}-${campo.name}`)) marcarCampo(campo, escrito && !a.valida);

    const coincidem = !confirmar || !confirmar.value || confirmar.value === campo.value;
    if (notaConfirmar) notaConfirmar.textContent = coincidem ? '' : 'As palavras-passe não coincidem.';
    if (confirmar) marcarCampo(confirmar, !coincidem);
    if (botao) botao.disabled = !(a.valida && (!confirmar || confirmar.value === campo.value));
  };
  // Ouve o formulário todo (o nome e o email também contam para "não contém o teu nome")
  (form || campo).addEventListener('input', atualizar);
  atualizar();
}

// =====================================================================
// EMAIL: enquanto se escreve (e ao sair do campo) mostra a vermelho se o formato está errado e sugere a
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
  // Verifica enquanto se escreve (depois de uma pausa de 0,6 s) e logo ao sair do campo.
  // "verificado" evita perguntar duas vezes ao servidor pelo mesmo email.
  let relogio = null;
  let verificado = null;
  campo.addEventListener('input', () => {
    clearTimeout(relogio);
    verificado = null;
    // Espaços ou dois @ estão sempre errados: aparece logo
    const erroLogo = /\s/.test(campo.value.trim()) || (campo.value.match(/@/g) || []).length > 1;
    if (erroLogo) return verificarAgora();
    nota.textContent = '';
    nota.className = 'nota-campo';
    marcarCampo(campo, false);
    relogio = setTimeout(verificarAgora, 600);
  });
  campo.addEventListener('blur', () => { clearTimeout(relogio); verificarAgora(); });

  // Verifica o email escrito: formato, sugestão e (no registo) pergunta ao servidor
  async function verificarAgora() {
    if (verificado === campo.value) return;
    verificado = campo.value;
    nota.textContent = '';
    nota.className = 'nota-campo';
    marcarCampo(campo, false);
    if (!campo.value.trim()) return;
    const erro = R.erroFormato(campo.value);
    if (erro) {
      nota.classList.add('erro');
      nota.textContent = erro;
      marcarCampo(campo, true);
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
        marcarCampo(campo, !r.valido);
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
  }
}

// =====================================================================
// NOME DA PESSOA E @NOME: as regras estão em /js/regras-nomes.js (window.RegrasNomes),
// o mesmo ficheiro que o servidor usa. As páginas com estes campos carregam-no antes.
// =====================================================================

// Campo a vermelho (borda + aria-invalid) ou não. Usado por todas as verificações ao vivo.
function marcarCampo(campo, errado) {
  if (errado) campo.setAttribute('aria-invalid', 'true'); else campo.removeAttribute('aria-invalid');
}

// Mostra o erro de um campo a vermelho logo enquanto se escreve (sem mexer no foco).
// Espera um instante depois da última tecla para não piscar a cada letra; ao sair do campo é logo.
//  verificar = função que devolve a mensagem de erro, ou '' se estiver bem
function ligarVerificacaoCampo(campo, verificar, espera = 350) {
  if (!campo) return;
  const nota = document.createElement('small');
  nota.className = 'nota-campo erro';
  nota.setAttribute('aria-live', 'polite');
  campo.after(nota);
  let relogio = null;
  const atualizar = () => {
    clearTimeout(relogio);
    const erro = campo.value ? verificar(campo.value) : '';
    nota.textContent = erro;
    marcarCampo(campo, !!erro);
  };
  campo.addEventListener('input', () => { clearTimeout(relogio); relogio = setTimeout(atualizar, espera); });
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
  const mostrarNota = (tipo, texto) => {
    nota.className = 'nota-campo' + (tipo ? ' ' + tipo : '');
    nota.textContent = texto;
    marcarCampo(campo, tipo === 'erro');
  };
  // rapido = ao sair do campo (sem esperar)
  const verificar = (rapido = false) => {
    clearTimeout(relogio);
    const nome = campo.value.trim().replace(/^@/, '');
    if (!nome || nome === atual) return mostrarNota('', '');
    const erro = RegrasNomes.erroArroba(nome);
    // Caracteres proibidos aparecem logo; "pelo menos 3" só depois de uma pausa (ou ao sair)
    if (erro && (rapido || /[^A-Za-z0-9_.@]/.test(campo.value.trim()))) return mostrarNota('erro', erro);
    mostrarNota('', '');
    relogio = setTimeout(async () => {
      if (erro) return mostrarNota('erro', erro);
      const este = ++pedido;   // só conta a resposta do último pedido
      mostrarNota('', 'A verificar…');
      try {
        const r = await api('/api/utilizadores/disponivel?nome=' + encodeURIComponent(nome));
        if (este !== pedido) return;
        mostrarNota(r.disponivel ? 'ok' : 'erro', r.mensagem);
      } catch (erroPedido) {
        if (este === pedido) mostrarNota('', '');   // demasiados pedidos ou sem rede: o servidor verifica ao guardar
      }
    }, rapido ? 0 : 400);
  };
  campo.addEventListener('input', () => verificar(false));
  campo.addEventListener('blur', () => { if (RegrasNomes.erroArroba(campo.value) && campo.value.trim()) verificar(true); });
}
