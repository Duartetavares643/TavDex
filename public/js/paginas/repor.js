// =====================================================================
//  Definir a palavra-passe nova a partir do link do email (?token=)
// =====================================================================
(async () => {
  const token = param('token') || '';
  mostrar(`<div class="content"><div class="left narrow" style="max-width:520px">
    <div class="box"><form class="form" id="f-repor" novalidate>
      <h1 class="ph">Nova palavra-passe</h1>
      <label>Palavra-passe nova<input name="password" type="password" required minlength="8" maxlength="72" autocomplete="new-password"></label>
      <label>Repetir<input name="password2" type="password" required autocomplete="new-password"></label>
      <p class="msg" role="alert"></p>
      <button class="btn primary" type="submit">Guardar</button>
    </form></div></div></div>`);

  ligarForm(document.getElementById('f-repor'), async (dados, form) => {
    if (dados.password !== dados.password2) throw new Error('As palavras-passe não são iguais.');
    await api('/api/auth/repor', 'POST', { token, password: dados.password });
    form.innerHTML = `<h1 class="ph">Pronto!</h1><p class="ok-msg">A palavra-passe foi alterada e as sessões abertas foram terminadas.</p>
      <a class="btn primary" href="/login.html">Entrar</a>`;
  });
})();
