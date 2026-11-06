// =====================================================================
//  "Esqueceste-te da palavra-passe?" (Passo 8): pede o link por email
// =====================================================================
(async () => {
  mostrar(`<div class="content"><div class="left narrow" style="max-width:980px">
    <div class="authx">
      <div class="brand"><img src="/img/logo.png" alt=""><h2>Recuperar acesso</h2><p>Acontece a todos. Em dois minutos voltas a entrar.</p></div>
      <form class="fm" id="f-rec" novalidate>
        <h1>Esqueceste-te da palavra-passe?</h1>
        <p class="muted">Escreve o email da tua conta. Enviamos-te um link para definires uma nova palavra-passe (válido durante 30 minutos).</p>
        <input name="email" type="email" placeholder="Email" aria-label="Email" required maxlength="120" autocomplete="email">
        <p class="msg" role="alert"></p>
        <button class="btn primary" type="submit">Enviar link</button>
        <a class="lk" href="/login.html">← Voltar ao login</a>
      </form>
    </div></div></div>`);

  ligarForm(document.getElementById('f-rec'), async (dados, form) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email.trim())) throw erroCampos({ email: 'Email inválido.' });
    const r = await api('/api/auth/recuperar', 'POST', { email: dados.email });
    // A resposta é sempre a mesma, exista a conta ou não (textContent: o email não entra como HTML)
    form.innerHTML = `<h1>Verifica o teu email</h1><p class="ok-msg"></p>
      <a class="btn ghost" href="/login.html">Voltar ao login</a>`;
    form.querySelector('.ok-msg').textContent = r.mensagem;
  });
})();
