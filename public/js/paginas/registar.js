// =====================================================================
//  Registo de uma conta nova (tudo é validado outra vez no servidor)
// =====================================================================
(async () => {
  if (await sessao) return location.replace('/');

  mostrar(`<div class="content"><div class="left narrow" style="max-width:980px">
    <div class="authx">
      <div class="brand"><img src="/img/logo.png" alt=""><h2>Junta-te ao TavDex</h2><p>Avalia, cria listas e apresenta os teus projetos.</p></div>
      <form class="fm" id="f-registo" novalidate>
        <h1>Criar conta</h1>
        <input name="nome" placeholder="Nome de utilizador (3 a 20: letras, números, _ e .)" required minlength="3" maxlength="20"
          pattern="[A-Za-z0-9_.]{3,20}" autocomplete="username" aria-label="Nome de utilizador">
        <input name="email" type="email" placeholder="Email" required maxlength="120" autocomplete="email" aria-label="Email">
        <input name="password" type="password" placeholder="Palavra-passe (mínimo 8 caracteres)" required minlength="8" maxlength="72"
          autocomplete="new-password" aria-label="Palavra-passe">
        <input name="password2" type="password" placeholder="Repetir a palavra-passe" required autocomplete="new-password" aria-label="Repetir a palavra-passe">
        <!-- Campo-armadilha: invisível para as pessoas, os robôs preenchem-no -->
        <div class="hp" aria-hidden="true"><label>Não preenchas<input name="website" tabindex="-1" autocomplete="off"></label></div>
        <p class="msg" role="alert"></p>
        <button class="btn primary" type="submit">Criar conta</button>
        <a class="btn ghost" href="/api/auth/google">Registar com o Google</a>
        <p class="muted">Já tens conta? <a class="lk" href="/login.html">Entra</a></p>
      </form>
    </div></div></div>`);

  ligarForm(document.getElementById('f-registo'), async dados => {
    // Validação rápida no browser (o servidor valida tudo outra vez)
    if (!/^[A-Za-z0-9_.]{3,20}$/.test(dados.nome)) throw new Error('O nome de utilizador tem de ter 3 a 20 letras, números, _ ou .');
    if (dados.password.length < 8) throw new Error('A palavra-passe tem de ter pelo menos 8 caracteres.');
    if (dados.password !== dados.password2) throw new Error('As palavras-passe não são iguais.');
    await api('/api/auth/registar', 'POST', { nome: dados.nome, email: dados.email, password: dados.password, website: dados.website });
    location.href = '/definicoes.html?ok=' + encodeURIComponent('Conta criada! Aproveita para escolher a cor do teu avatar.');
  });
})();
