// =====================================================================
//  Entrar (Passo 6): Google no topo, "ou", e o formulário com @nome ou email.
//  Depois do login volta à página onde o utilizador estava (?voltar=).
//  · "Manter sessão iniciada" (desligado por omissão): 30 dias; senão a sessão
//    acaba ao fechar o browser. A escolha fica guardada para o botão do Google.
//  · Vindo do registo (?criada=1): aviso "Conta criada!" com o email escondido e Reenviar.
//  · Conta com o email por confirmar: a palavra-passe certa não entra e aparece
//    o botão "Reenviar email de confirmação".
// =====================================================================
(async () => {
  const u = await sessao;
  const voltar = voltarDoEndereco();
  if (u) return location.replace(voltar);

  mostrar(`<div class="content"><div class="left narrow" style="max-width:980px">
    <div class="authx">
      <div class="brand"><img src="/img/logo.png" alt=""><h2>Bem-vindo de volta</h2><p>Descobre. Organiza. Avalia. Cria.</p></div>
      <form class="fm" id="f-login" novalidate>
        <h1>Entrar</h1>
        <div class="conta-criada" id="conta-criada" role="status" hidden></div>
        ${botaoGoogle('Continuar com Google', voltar)}
        <div class="sep-ou"><span>ou</span></div>
        <input id="login" name="login" placeholder="@nome ou email" aria-label="Nome de utilizador ou email"
          autocomplete="username" required maxlength="120">
        ${campoPalavraPasse('password', 'Palavra-passe', 'current-password', 'required')}
        <label class="chk"><input type="checkbox" name="manter" ${manterSessaoGuardado() ? 'checked' : ''}> Manter sessão iniciada</label>
        <a class="lk fl" href="/recuperar.html">Esqueci-me da palavra-passe ou do @nome</a>
        <p class="msg" role="alert"></p>
        <button class="btn primary" type="submit">Entrar</button>
        <p class="muted">Ainda não tens conta? <a class="lk" href="/registar.html?voltar=${encodeURIComponent(voltar)}">Regista-te</a></p>
        <a class="lk sem-conta" href="${esc(voltar)}">Continuar sem conta →</a>
      </form>
    </div></div></div>`);

  const form = document.getElementById('f-login');

  // Vindo do registo (?criada=1): "Conta criada!" + email escondido + Reenviar,
  // e o @nome já escrito no campo
  if (new URLSearchParams(location.search).get('criada')) {
    const url = new URL(location.href);
    url.searchParams.delete('criada');
    history.replaceState(null, '', url.pathname + url.search);
    try {
      const nome = sessionStorage.getItem('tavdex-conta-criada');
      sessionStorage.removeItem('tavdex-conta-criada');
      if (nome) form.login.value = nome;
    } catch (erro) { /* ignora */ }
    const estado = await api('/api/confirmacao').catch(() => ({ conta: false }));
    const caixa = document.getElementById('conta-criada');
    caixa.innerHTML = `<b>Conta criada!</b>
      <p>Enviámos um link de confirmação para <b>${esc(estado.email || 'o teu email')}</b>.
        Abre-o e depois entra aqui. Não encontras o email? Vê a pasta de spam.</p>`;
    if (estado.conta) caixa.append(botaoReenviar());
    caixa.hidden = false;
    form.password.focus();
  }

  // Guarda a escolha neste browser (o botão do Google usa a última escolha)
  form.manter.addEventListener('change', () => {
    try { localStorage.setItem('tavdex-manter', form.manter.checked ? '1' : ''); } catch (erro) { /* ignora */ }
    const google = form.querySelector('[data-google]');
    if (google) google.outerHTML = botaoGoogle('Continuar com Google', voltar);
  });

  ligarFormulario(form, async (dados, f) => {
    const erros = {};
    if (!dados.login.trim()) erros.login = 'Escreve o teu @nome ou email.';
    if (!dados.password) erros.password = 'Escreve a palavra-passe.';
    if (Object.keys(erros).length) throw erroCampos(erros);
    try {
      await api('/api/auth/login', 'POST', { login: dados.login, password: dados.password, manter: dados.manter });
    } catch (erro) {
      if (erro.codigo !== 'email_por_confirmar') throw erro;
      mostrarPorConfirmar(f, erro.message);
      return;
    }
    location.href = voltar;
  });

  // Botão "Reenviar email de confirmação" (fica na página de login)
  function botaoReenviar() {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'btn ghost sm';
    botao.textContent = 'Reenviar email de confirmação';
    botao.addEventListener('click', async () => {
      botao.disabled = true;
      try {
        const r = await api('/api/confirmacao/reenviar', 'POST');
        aviso(r.mensagem);
      } catch (erro) {
        aviso(erro.message, 'erro');
      }
      // Espera 60 segundos antes de deixar reenviar outra vez
      setTimeout(() => { botao.disabled = false; }, 60000);
    });
    return botao;
  }

  // "Ainda não confirmaste o teu email." + botão para reenviar o link
  function mostrarPorConfirmar(f, mensagem) {
    const msg = f.querySelector('.msg');
    msg.textContent = mensagem + ' ';
    msg.append(botaoReenviar());
  }
})();
