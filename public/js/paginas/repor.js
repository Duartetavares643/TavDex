// =====================================================================
//  "Nova palavra-passe" (Passo 8), a partir do link do email (?token=)
//  O link é verificado logo ao abrir a página.
// =====================================================================
(async () => {
  const token = param('token') || '';

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
        <h1>Definir nova palavra-passe</h1>
        ${campoPassword('password', 'Nova palavra-passe', 'new-password', 'required minlength="8" maxlength="72" id="pw-repor"')}
        <div class="forca" id="forca-repor" aria-live="polite"><i></i><i></i><i></i><i></i><span></span></div>
        ${campoPassword('password2', 'Confirmar a palavra-passe', 'new-password', 'required maxlength="72"')}
        <p class="msg" role="alert"></p>
        <button class="btn primary" type="submit">Guardar</button>
      </form>
    </div></div></div>`);

  ligarBarraForca(document.getElementById('pw-repor'), document.getElementById('forca-repor'));

  ligarForm(document.getElementById('f-repor'), async dados => {
    const erros = {};
    if (dados.password.length < 8 || !/[A-Za-zÀ-ÿ]/.test(dados.password) || !/[0-9]/.test(dados.password)) {
      erros.password = 'A palavra-passe tem de ter 8 a 72 caracteres, com letras e números.';
    }
    if (dados.password !== dados.password2) erros.password2 = 'As palavras-passe não são iguais.';
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
