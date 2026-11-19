// =====================================================================
//  "Nova palavra-passe" (Passo 8), a partir do link do email (?token=)
//  · o token sai logo da barra de endereço (history.replaceState) e fica só
//    numa variável; o servidor envia "Referrer-Policy: no-referrer";
//  · mostra para que conta é ("Nova palavra-passe para @nome");
//  · usa as mesmas regras do registo (requisitos ao vivo) e não deixa repetir a atual.
// =====================================================================
(async () => {
  const token = param('token') || '';
  // Tira o token do endereço: não fica no histórico, nem em capturas de ecrã, nem é partilhado sem querer
  if (token) history.replaceState(null, '', location.pathname);

  const linkInvalido = () => mostrar(`<div class="content"><div class="left narrow" style="max-width:520px">
    <div class="box form"><h1 class="ph">Link inválido</h1>
      <p>Este link não é válido ou já expirou.</p>
      <p class="muted">Os links só servem uma vez e duram 30 minutos.</p>
      <a class="btn primary" href="/recuperar.html">Pedir um novo link</a>
    </div></div></div>`);

  const r = await api('/api/auth/repor/' + encodeURIComponent(token)).catch(() => ({ valido: false }));
  if (!r.valido) return linkInvalido();

  mostrar(`<div class="content"><div class="left narrow" style="max-width:980px">
    <div class="authx">
      <div class="brand"><img src="/img/logo.png" alt=""><h2>Nova palavra-passe</h2><p>Escolhe uma palavra-passe que não uses noutros sites.</p></div>
      <form class="fm" id="f-repor" novalidate>
        <h1>Nova palavra-passe para <span class="pw-conta">@${esc(r.nome)}</span></h1>
        <!-- O nome de utilizador escondido ajuda os gestores de palavras-passe a guardar na conta certa -->
        <input type="text" name="username" value="${esc(r.nome)}" autocomplete="username" hidden>
        ${campoPalavraPasse('password', 'Nova palavra-passe', 'new-password', 'required minlength="10" maxlength="72" id="pw-repor"')}
        <div class="forca" id="forca-repor" aria-live="polite"><i></i><i></i><i></i><i></i><span></span></div>
        ${campoPalavraPasse('password2', 'Confirmar a palavra-passe', 'new-password', 'required maxlength="72"')}
        <p class="msg" role="alert"></p>
        <button class="btn primary" type="submit">Guardar</button>
      </form>
    </div></div></div>`);

  const form = document.getElementById('f-repor');
  const dadosPessoais = () => ({ nome: r.nome, nomeExibicao: r.nome_exibicao, email: r.email });
  ligarBarraForca(document.getElementById('pw-repor'), document.getElementById('forca-repor'),
    { dados: dadosPessoais, confirmar: form.password2 });

  ligarFormulario(form, async dados => {
    const erros = {};
    const analise = RegrasPalavraPasse.analisar(dados.password, dadosPessoais());
    if (!analise.valida) erros.password = analise.erros[0];
    if (dados.password !== dados.password2) erros.password2 = 'As palavras-passe não coincidem.';
    if (Object.keys(erros).length) throw erroCampos(erros);
    try {
      const resposta = await api('/api/auth/repor', 'POST', { token, password: dados.password, password2: dados.password2 });
      location.href = comAviso('/login.html', resposta.mensagem);
    } catch (erro) {
      if (erro.codigo === 'link_invalido') return linkInvalido();
      throw erro;
    }
  });
})();
