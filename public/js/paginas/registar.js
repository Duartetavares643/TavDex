// =====================================================================
//  Registo de uma conta nova (Passo 5)
//  Google no topo, "ou", e o formulário. O servidor valida tudo outra vez
//  e devolve todos os erros juntos; o que foi escrito nunca se perde.
// =====================================================================
(async () => {
  const voltar = voltarDoEndereco();
  if (await sessao) return location.replace(voltar);

  mostrar(`<div class="content"><div class="left narrow" style="max-width:980px">
    <div class="authx">
      <div class="brand"><img src="/img/logo.png" alt=""><h2>Junta-te ao TavDex</h2><p>Avalia, cria listas e apresenta os teus projetos.</p></div>
      <form class="fm" id="f-registo" novalidate>
        <h1>Criar conta</h1>
        ${botaoGoogle('Registar com Google', voltar)}
        <div class="sep-ou"><span>ou</span></div>
        <input name="nome_exibicao" placeholder="Nome (ex.: Duarte Tavares)" aria-label="Nome" required minlength="2" maxlength="50" autocomplete="name">
        <input name="nome" placeholder="@nome de utilizador (3 a 30: letras, números, _ e .)" aria-label="Nome de utilizador"
          required minlength="3" maxlength="30" pattern="[A-Za-z0-9_.]{3,30}" autocomplete="username" autocapitalize="off" spellcheck="false">
        <input name="email" type="email" placeholder="Email" aria-label="Email" required maxlength="120" autocomplete="email">
        ${campoPassword('password', 'Palavra-passe', 'new-password', 'required minlength="8" maxlength="72" id="pw-registo"')}
        <div class="forca" id="forca-registo" aria-live="polite"><i></i><i></i><i></i><i></i><span></span></div>
        ${campoPassword('password2', 'Confirmar a palavra-passe', 'new-password', 'required maxlength="72"')}
        <label class="chk"><input type="checkbox" name="aceito"> Aceito as <a class="lk" href="/termos.html" target="_blank">regras da comunidade TavDex</a></label>
        <!-- Campo-armadilha: invisível para as pessoas, os robôs preenchem-no -->
        <div class="hp" aria-hidden="true"><label>Não preenchas<input name="website" tabindex="-1" autocomplete="off"></label></div>
        <p class="msg" role="alert"></p>
        <button class="btn primary" type="submit">Criar conta</button>
        <p class="muted">Já tens conta? <a class="lk" href="/login.html?voltar=${encodeURIComponent(voltar)}">Entra</a></p>
      </form>
    </div></div></div>`);

  ligarBarraForca(document.getElementById('pw-registo'), document.getElementById('forca-registo'));

  ligarForm(document.getElementById('f-registo'), async dados => {
    // Validação rápida no browser, com todos os erros juntos (o servidor valida tudo outra vez)
    const erros = {};
    const nomeExibicao = dados.nome_exibicao.trim();
    const nome = dados.nome.trim().replace(/^@/, '');
    if (nomeExibicao.length < 2 || nomeExibicao.length > 50) erros.nome_exibicao = 'O nome tem de ter entre 2 e 50 caracteres.';
    if (!/^[A-Za-z0-9_.]{3,30}$/.test(nome)) erros.nome = 'O @nome tem de ter 3 a 30 letras, números, _ ou .';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email.trim())) erros.email = 'Email inválido.';
    if (dados.password.length < 8 || dados.password.length > 72 || !/[A-Za-zÀ-ÿ]/.test(dados.password) || !/[0-9]/.test(dados.password)) {
      erros.password = 'A palavra-passe tem de ter 8 a 72 caracteres, com letras e números.';
    }
    if (dados.password !== dados.password2) erros.password2 = 'As palavras-passe não são iguais.';
    if (!dados.aceito) erros.aceito = 'Tens de aceitar as regras da comunidade TavDex.';
    if (Object.keys(erros).length) throw erroCampos(erros);

    const r = await api('/api/auth/registar', 'POST', {
      nome_exibicao: nomeExibicao, nome, email: dados.email, password: dados.password,
      password2: dados.password2, aceito: dados.aceito, website: dados.website,
    });
    location.href = comAviso(voltar, r.mensagem);
  });
})();
