// =====================================================================
//  Confirmação do email (registo e mudança de email)
//   /confirmar-email          "Quase pronto! Enviámos um link para d•••••@gmail.com"
//                             + Reenviar (60 s de espera, com contagem decrescente)
//   /confirmar-email/<token>  o link do email: mostra o botão "Confirmar email".
//                             A confirmação é feita por POST quando se carrega no botão,
//                             para os antivírus de email que abrem links sozinhos não a gastarem.
//  Dados: /api/confirmacao (routes/confirmacao-email.js)
// =====================================================================
(async () => {
  // O token vem no caminho (/confirmar-email/<token>); tira-se logo da barra de endereço
  const partes = location.pathname.split('/').filter(Boolean);
  const token = partes[0] === 'confirmar-email' && partes[1] ? partes[1] : '';
  if (token) history.replaceState(null, '', '/confirmar-email');

  const caixa = conteudo => mostrar(`<div class="content"><div class="left narrow" style="max-width:560px">
    <div class="box form confirmar-email">${conteudo}</div></div></div>`);

  // -------------------------------------------------------------------
  // Link inválido ou expirado: pedir um link novo (resposta sempre igual)
  // -------------------------------------------------------------------
  function pedirNovoLink(titulo = 'Link inválido', texto = 'Este link não é válido ou já expirou.') {
    caixa(`<img src="/img/logo.png" alt="" class="modal-logo">
      <h1 class="ph"></h1><p class="txt-principal"></p>
      <form id="f-novo-link" class="fm-simples" novalidate>
        <label>Escreve o teu email para receberes um link novo
          <input name="email" type="email" required maxlength="120" autocomplete="email" placeholder="Email"></label>
        <p class="msg" role="alert"></p>
        <button class="btn primary" type="submit">Enviar link novo</button>
      </form>
      <a class="lk" href="/">Voltar ao início</a>`);
    document.querySelector('.ph').textContent = titulo;
    document.querySelector('.txt-principal').textContent = texto;
    const form = document.getElementById('f-novo-link');
    ligarCampoEmail(form.email);
    ligarForm(form, async (dados, f) => {
      const erro = RegrasEmail.erroFormato(dados.email);
      if (erro) throw erroCampos({ email: erro });
      const r = await api('/api/confirmacao/reenviar', 'POST', { email: dados.email });
      f.innerHTML = '<p class="ok-msg"></p>';
      f.querySelector('.ok-msg').textContent = r.mensagem;
    });
  }

  // -------------------------------------------------------------------
  // Com token: "Confirmar email"
  // -------------------------------------------------------------------
  if (token) {
    const r = await api('/api/confirmacao/' + encodeURIComponent(token)).catch(() => ({ valido: false }));
    if (!r.valido) return pedirNovoLink();
    const mudanca = r.tipo === 'mudanca';
    caixa(`<img src="/img/logo.png" alt="" class="modal-logo">
      <h1 class="ph">${mudanca ? 'Confirmar o novo email' : 'Confirmar o email'}</h1>
      <p>Confirma que <b>${esc(r.email)}</b> é teu${mudanca ? ' para terminar a mudança de email' : ' para ativares a tua conta TavDex'}.</p>
      <p class="msg" role="alert"></p>
      <button class="btn primary" type="button" id="confirmar">Confirmar email</button>`);
    const botao = document.getElementById('confirmar');
    botao.focus();
    botao.addEventListener('click', async () => {
      botao.disabled = true;
      try {
        const resposta = await api('/api/confirmacao', 'POST', { token });
        if (mudanca) {
          location.href = comAviso(sessaoAtual ? '/definicoes.html?tab=seguranca' : '/login.html', resposta.mensagem);
        } else {
          // Registo: a sessão já foi iniciada pelo servidor
          avisarOutrosSeparadores('entrou');
          location.href = comAviso('/', resposta.mensagem);
        }
      } catch (erro) {
        if (erro.codigo === 'link_invalido') return pedirNovoLink();
        document.querySelector('.msg').textContent = erro.message;
        botao.disabled = false;
      }
    });
    return;
  }

  // -------------------------------------------------------------------
  // Sem token: "Quase pronto!" (depois do registo ou de um login por confirmar)
  // -------------------------------------------------------------------
  const estado = await api('/api/confirmacao').catch(() => ({ conta: false }));
  if (!estado.conta) {
    if (await sessao) return location.replace('/');
    return pedirNovoLink('Confirma o teu email', 'Abre o link que enviámos para o teu email. Se o link expirou, pede um novo aqui.');
  }

  caixa(`<img src="/img/logo.png" alt="" class="modal-logo">
    <h1 class="ph">Quase pronto!</h1>
    <p>Enviámos um link para <b>${esc(estado.email)}</b>. Abre-o para ativar a tua conta. O link é válido durante 24 horas.</p>
    <p class="muted">Não encontras o email? Vê a pasta de spam ou de promoções.</p>
    <p class="msg" role="alert" aria-live="polite"></p>
    <button class="btn ghost" type="button" id="reenviar">Reenviar email</button>
    <a class="lk" href="/">Voltar ao início</a>`);

  // Botão "Reenviar email": desativado durante 60 segundos, com contagem decrescente
  const botao = document.getElementById('reenviar');
  let relogio = null;
  function esperar(segundos) {
    clearInterval(relogio);
    let falta = segundos;
    const atualizar = () => {
      botao.disabled = falta > 0;
      botao.textContent = falta > 0 ? `Reenviar email (${falta} s)` : 'Reenviar email';
      if (falta-- <= 0) clearInterval(relogio);
    };
    atualizar();
    relogio = setInterval(atualizar, 1000);
  }
  esperar(estado.espera || 60);

  botao.addEventListener('click', async () => {
    const msg = document.querySelector('.msg');
    botao.disabled = true;
    try {
      const r = await api('/api/confirmacao/reenviar', 'POST');
      msg.className = 'msg ok-msg';
      msg.textContent = r.mensagem;
      esperar(r.espera || 60);
    } catch (erro) {
      msg.className = 'msg';
      msg.textContent = erro.message;
      esperar(erro.codigo === 'espera' ? 10 : 0);
    }
  });
})();
