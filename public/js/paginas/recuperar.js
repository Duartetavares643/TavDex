// =====================================================================
//  "Esqueceste-te da palavra-passe ou do @nome?" (Passo 8): pede o link por email.
//  Aceita o email OU o @nome. O email enviado diz também qual é o @nome da conta.
//  A resposta é sempre a mesma, exista a conta ou não.
// =====================================================================
(async () => {
  mostrar(`<div class="content"><div class="left narrow" style="max-width:980px">
    <div class="authx">
      <div class="brand"><img src="/img/logo.png" alt=""><h2>Recuperar acesso</h2><p>Acontece a todos. Em dois minutos voltas a entrar.</p></div>
      <form class="fm" id="f-rec" novalidate>
        <h1>Esqueceste-te da palavra-passe?</h1>
        <p class="muted">Escreve o email ou o @nome da tua conta. Enviamos-te um email com o teu @nome e um link para definires uma nova palavra-passe (válido durante 30 minutos).</p>
        <input name="login" placeholder="Email ou @nome" aria-label="Email ou @nome" required maxlength="120" autocomplete="username"
          autocapitalize="off" spellcheck="false">
        <p class="msg" role="alert"></p>
        <button class="btn primary" type="submit">Enviar link</button>
        <a class="lk" href="/login.html">← Voltar ao login</a>
      </form>
    </div></div></div>`);

  const form = document.getElementById('f-rec');
  // Vindo do bloqueio do login: o email/@nome já vem escrito (?login=)
  form.login.value = param('login') || '';

  ligarFormulario(form, async (dados, f) => {
    const escrito = dados.login.trim();
    if (!escrito) throw erroCampos({ login: 'Escreve o teu email ou @nome.' });
    if (escrito.includes('@') && !escrito.startsWith('@')) {
      const erro = RegrasEmail.erroFormato(escrito);
      if (erro) throw erroCampos({ login: erro });
    }
    const r = await api('/api/auth/recuperar', 'POST', { login: escrito });
    // A resposta é sempre a mesma, exista a conta ou não (textContent: nada entra como HTML)
    f.innerHTML = `<h1>Verifica o teu email</h1><p class="ok-msg"></p>
      <p class="muted">Não encontras o email? Vê a pasta de spam ou de promoções.</p>
      <a class="btn ghost" href="/login.html">Voltar ao login</a>`;
    f.querySelector('.ok-msg').textContent = r.mensagem;
  });
})();
