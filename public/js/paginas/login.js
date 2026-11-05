// =====================================================================
//  Entrar: nome de utilizador ou email + palavra-passe, ou Google.
//  Depois do login volta à página onde o utilizador estava (?voltar=).
// =====================================================================
(async () => {
  const u = await sessao;
  // Só aceita voltar para páginas do próprio site
  const v = param('voltar') || '/';
  const voltar = v.startsWith('/') && !v.startsWith('//') ? v : '/';
  if (u) return location.replace(voltar);

  mostrar(`<div class="content"><div class="left narrow" style="max-width:980px">
    <div class="authx">
      <div class="brand"><img src="/img/logo.png" alt=""><h2>Bem-vindo de volta</h2><p>Descobre. Organiza. Avalia. Cria.</p></div>
      <form class="fm" id="f-login" novalidate>
        <h1>Entrar</h1>
        <label class="sr" for="login">Nome de utilizador ou email</label>
        <input id="login" name="login" placeholder="Nome de utilizador ou email" autocomplete="username" required maxlength="120">
        <label class="sr" for="password">Palavra-passe</label>
        <input id="password" name="password" type="password" placeholder="Palavra-passe" autocomplete="current-password" required>
        <a class="lk fl" href="/recuperar.html">Esqueci-me da palavra-passe</a>
        <p class="msg" role="alert"></p>
        <button class="btn primary" type="submit">Entrar</button>
        <a class="btn ghost" href="/api/auth/google?voltar=${encodeURIComponent(voltar)}">Entrar com o Google</a>
        <p class="muted">Ainda não tens conta? <a class="lk" href="/registar.html">Regista-te</a></p>
      </form>
    </div></div></div>`);

  ligarForm(document.getElementById('f-login'), async dados => {
    await api('/api/auth/login', 'POST', dados);
    location.href = voltar;
  });
})();
