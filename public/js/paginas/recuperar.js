// =====================================================================
//  Recuperar a palavra-passe: pede o link por email
// =====================================================================
(async () => {
  mostrar(`<div class="content"><div class="left narrow" style="max-width:520px">
    <div class="box"><form class="form" id="f-rec" novalidate>
      <h1 class="ph">Recuperar acesso</h1>
      <p>Escreve o email da tua conta. Enviamos um link para definires uma palavra-passe nova (válido 30 minutos).</p>
      <label>Email<input name="email" type="email" required maxlength="120" autocomplete="email"></label>
      <p class="msg" role="alert"></p>
      <button class="btn primary" type="submit">Enviar link</button>
      <a class="lk" href="/login.html">← Voltar ao login</a>
    </form></div></div></div>`);

  ligarForm(document.getElementById('f-rec'), async (dados, form) => {
    const r = await api('/api/auth/recuperar', 'POST', dados);
    // A resposta é sempre a mesma, exista a conta ou não
    form.innerHTML = `<h1 class="ph">Verifica o email</h1><p class="ok-msg">${esc(r.mensagem)}</p>
      <a class="btn ghost" href="/login.html">Voltar ao login</a>`;
  });
})();
