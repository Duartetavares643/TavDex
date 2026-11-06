// =====================================================================
//  Entrar (Passo 6): Google no topo, "ou", e o formulário com @nome ou email.
//  Depois do login volta à página onde o utilizador estava (?voltar=).
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
        ${botaoGoogle('Continuar com Google', voltar)}
        <div class="sep-ou"><span>ou</span></div>
        <input id="login" name="login" placeholder="@nome ou email" aria-label="Nome de utilizador ou email"
          autocomplete="username" required maxlength="120">
        ${campoPassword('password', 'Palavra-passe', 'current-password', 'required')}
        <a class="lk fl" href="/recuperar.html">Esqueci-me da palavra-passe</a>
        <p class="msg" role="alert"></p>
        <button class="btn primary" type="submit">Entrar</button>
        <p class="muted">Ainda não tens conta? <a class="lk" href="/registar.html?voltar=${encodeURIComponent(voltar)}">Regista-te</a></p>
        <a class="lk sem-conta" href="${esc(voltar)}">Continuar sem conta →</a>
      </form>
    </div></div></div>`);

  ligarForm(document.getElementById('f-login'), async dados => {
    const erros = {};
    if (!dados.login.trim()) erros.login = 'Escreve o teu @nome ou email.';
    if (!dados.password) erros.password = 'Escreve a palavra-passe.';
    if (Object.keys(erros).length) throw erroCampos(erros);
    await api('/api/auth/login', 'POST', { login: dados.login, password: dados.password });
    location.href = voltar;
  });
})();
