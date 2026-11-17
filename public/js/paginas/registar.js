// =====================================================================
//  Registo de uma conta nova (Passo 5)
//  Google no topo, "ou", e o formulário. O servidor valida tudo outra vez
//  e devolve todos os erros juntos; o que foi escrito nunca se perde.
//  · palavra-passe: lista de requisitos ao vivo e o botão só fica ativo
//    com todos cumpridos (regras em /js/regras-palavra-passe.js);
//  · email: ao sair do campo, formato e "Querias dizer …?" (/js/regras-email.js);
//  · @nome: "✓ Disponível" / "Já está a ser usado" enquanto se escreve.
//  Depois de criar a conta, NÃO entra logo: vai para "Confirma o teu email".
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
        <input name="nome" id="registo-nome" placeholder="@nome de utilizador (3 a 30: letras, números, _ e .)" aria-label="Nome de utilizador"
          required minlength="3" maxlength="30" pattern="[A-Za-z0-9_.]{3,30}" autocomplete="username" autocapitalize="off" spellcheck="false">
        <input name="email" id="registo-email" type="email" placeholder="Email" aria-label="Email" required maxlength="120" autocomplete="email">
        ${campoPassword('password', 'Palavra-passe', 'new-password', 'required minlength="10" maxlength="72" id="pw-registo"')}
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

  const form = document.getElementById('f-registo');
  // A palavra-passe não pode conter o nome, o @nome nem o email escritos neste formulário
  const dadosPessoais = () => ({ nome: form.nome.value, nomeExibicao: form.nome_exibicao.value, email: form.email.value });
  ligarBarraForca(document.getElementById('pw-registo'), document.getElementById('forca-registo'),
    { dados: dadosPessoais, confirmar: form.password2 });
  ligarCampoEmail(form.email);
  ligarNomeDisponivel(form.nome);

  ligarForm(form, async dados => {
    // Validação rápida no browser, com todos os erros juntos (o servidor valida tudo outra vez)
    const erros = {};
    const nomeExibicao = dados.nome_exibicao.trim();
    const nome = dados.nome.trim().replace(/^@/, '');
    if (nomeExibicao.length < 2 || nomeExibicao.length > 50) erros.nome_exibicao = 'O nome tem de ter entre 2 e 50 caracteres.';
    if (!/^[A-Za-z0-9_.]{3,30}$/.test(nome)) erros.nome = 'O @nome tem de ter 3 a 30 letras, números, _ ou .';
    const erroEmail = RegrasEmail.erroFormato(dados.email);
    if (erroEmail) erros.email = erroEmail;
    const analise = RegrasPalavraPasse.analisar(dados.password, dadosPessoais());
    if (!analise.valida) erros.password = analise.erros[0];
    if (dados.password !== dados.password2) erros.password2 = 'As palavras-passe não coincidem.';
    if (!dados.aceito) erros.aceito = 'Tens de aceitar as regras da comunidade TavDex.';
    if (Object.keys(erros).length) throw erroCampos(erros);

    await api('/api/auth/registar', 'POST', {
      nome_exibicao: nomeExibicao, nome, email: dados.email, password: dados.password,
      password2: dados.password2, aceito: dados.aceito, website: dados.website,
    });
    // A conta foi criada mas ainda não entrou: "Quase pronto! Enviámos um link para …"
    location.href = '/confirmar-email';
  });
})();
