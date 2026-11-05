// =====================================================================
//  Definições: perfil, conta e segurança (só o próprio utilizador)
//  Dados: GET /api/utilizadores/eu/definicoes
// =====================================================================
(async () => {
  const u = await sessao;
  if (!u) return irLogin();
  const d = await api('/api/utilizadores/eu/definicoes');

  // Nomes legíveis dos eventos de segurança
  const EVENTOS = {
    registo: 'Conta criada', registo_google: 'Conta criada com o Google', login: 'Entrou', login_google: 'Entrou com o Google',
    login_falhado: 'Tentativa de entrada falhada', logout: 'Saiu', email_alterado: 'Email alterado',
    palavra_passe_alterada: 'Palavra-passe alterada', palavra_passe_definida: 'Palavra-passe definida',
    palavra_passe_reposta: 'Palavra-passe reposta pelo email', google_ligado: 'Google ligado',
    google_desligado: 'Google desligado', sessoes_terminadas: 'Outras sessões terminadas',
  };
  // Resumo do navegador a partir do User-Agent
  const navegador = ua => {
    const b = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
    const s = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
    return `${b}${s ? ' · ' + s : ''}`;
  };
  // Algumas cores para escolher o avatar
  const CORES = [0, 20, 35, 50, 90, 140, 175, 199, 215, 240, 270, 300, 316, 330];

  mostrar(`<div class="content"><div class="left narrow">
    <h1 class="ph">Definições</h1>
    <div class="tabsbox">
      <div class="tabs"><button data-tab="perfil" class="on">Perfil</button><button data-tab="conta">Conta e segurança</button></div>

      <div data-pane="perfil">
        <form class="box form" id="f-perfil" novalidate>
          <div class="epv">${avatar({ nome: d.nome, cor: d.cor }, 'l')}<div><b>Cor do avatar</b>
            <div class="sw">${CORES.map(c => `<label title="Cor ${c}"><input type="radio" name="cor" value="${c}" ${c === d.cor ? 'checked' : ''}>
              <i style="background:hsl(${c} 75% 52%)"></i></label>`).join('')}
              ${CORES.includes(d.cor) ? '' : `<label><input type="radio" name="cor" value="${d.cor}" checked><i style="background:hsl(${d.cor} 75% 52%)"></i></label>`}
            </div></div></div>
          <label>Nome de utilizador (@)<input name="nome" value="${esc(d.nome)}" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_.]{3,20}"></label>
          <label>Localização<input name="localizacao" value="${esc(d.localizacao)}" maxlength="40"></label>
          <label>Bio <span class="cc" id="cc-bio"></span><textarea name="bio" id="bio" maxlength="160">${esc(d.bio)}</textarea></label>
          <label class="chk"><input type="checkbox" name="notif_email" ${d.notif_email ? 'checked' : ''}> Receber as notificações também por email</label>
          <p class="msg" role="alert"></p>
          <button class="btn primary" type="submit">Guardar perfil</button>
        </form>
      </div>

      <div data-pane="conta" hidden>
        <form class="box form" id="f-email" novalidate><h3>Email</h3>
          <label>Email<input name="email" type="email" value="${esc(d.email)}" required maxlength="120"></label>
          ${d.tem_password ? '<label>Palavra-passe atual<input name="password" type="password" required autocomplete="current-password"></label>' : ''}
          <small class="muted">Vamos avisar o email antigo da mudança.</small>
          <p class="msg" role="alert"></p><button class="btn primary sm" type="submit">Mudar email</button>
        </form>

        <form class="box form" id="f-pass" novalidate><h3>${d.tem_password ? 'Alterar palavra-passe' : 'Definir palavra-passe'}</h3>
          ${d.tem_password ? '<label>Atual<input name="atual" type="password" required autocomplete="current-password"></label>'
            : '<p>A tua conta só entra com o Google. Define uma palavra-passe para poderes entrar também com o email.</p>'}
          <label>Nova (mínimo 8 caracteres)<input name="nova" type="password" required minlength="8" maxlength="72" autocomplete="new-password"></label>
          <label>Repetir<input name="nova2" type="password" required autocomplete="new-password"></label>
          <p class="msg" role="alert"></p><button class="btn primary sm" type="submit">Guardar</button>
        </form>

        <div class="box"><h3>Conta Google</h3>
          ${d.google_email
            ? `<p>Ligada a <b>${esc(d.google_email)}</b>.</p><div class="btns" style="margin-top:12px"><button class="btn ghost sm" id="desligar-google">Desligar o Google</button></div>`
            : `<p>Liga a tua conta Google para entrares com um clique.</p><div class="btns" style="margin-top:12px"><a class="btn ghost sm" href="/api/auth/google?ligar=1">Ligar conta Google</a></div>`}
        </div>

        <div class="box"><h3>Sessões ativas</h3>
          ${d.sessoes.map(s => `<div class="li"><div><b>${esc(navegador(s.dispositivo))}</b> ${s.atual ? '<span class="badge" style="--c:150">Esta sessão</span>' : ''}
            <small>IP ${esc(s.ip)} · último acesso ${tempo(s.ultimo_acesso)} · desde ${dataCurta(s.criado_em)}</small></div>
            ${s.atual ? '' : `<button class="del-btn" data-sessao="${s.id}">Terminar</button>`}</div>`).join('')}
          ${d.sessoes.length > 1 ? '<div class="btns" style="margin-top:12px"><button class="btn ghost sm" id="terminar-outras">Terminar todas as outras</button></div>' : ''}
        </div>

        <div class="box"><h3>Atividade recente</h3><div class="tl">
          ${d.atividade.map(x => `<p>${esc(EVENTOS[x.tipo] || x.tipo)}<small>${tempo(x.criado_em)} · ${esc(navegador(x.dispositivo))} · IP ${esc(x.ip)}</small></p>`).join('') || '<p>Sem atividade.</p>'}
        </div></div>

        <form class="box form danger" id="f-apagar" novalidate><h3>Apagar conta</h3>
          <p>Apaga a conta e tudo o que lhe pertence (avaliações, listas, projetos, mensagens). Não dá para desfazer.</p>
          <label>Para confirmar, escreve <b>@${esc(d.nome)}</b><input name="confirmacao" autocomplete="off" required></label>
          <p class="msg" role="alert"></p><button class="btn ghost sm" type="submit">Apagar a minha conta</button>
        </form>
      </div>
    </div></div></div>`);
  abrirSeparadorDoEndereco();
  if (param('erro') || param('ok')?.includes('Google')) document.querySelector('[data-tab="conta"]').click();

  // Contador de caracteres da bio e pré-visualização da cor
  const bio = document.getElementById('bio');
  const cc = document.getElementById('cc-bio');
  const contar = () => { cc.textContent = `${bio.value.length}/160`; };
  bio.addEventListener('input', contar);
  contar();
  document.querySelectorAll('[name=cor]').forEach(r => r.addEventListener('change', () => {
    document.querySelector('.epv .av').style.setProperty('--h', r.value);
  }));

  ligarForm(document.getElementById('f-perfil'), async dados => {
    await api('/api/utilizadores/eu/perfil', 'PUT', dados);
    location.href = '/definicoes.html?ok=' + encodeURIComponent('Perfil guardado.');
  });
  ligarForm(document.getElementById('f-email'), async dados => {
    await api('/api/utilizadores/eu/email', 'PUT', dados);
    aviso('Email alterado.');
  });
  ligarForm(document.getElementById('f-pass'), async (dados, form) => {
    if (dados.nova !== dados.nova2) throw new Error('As palavras-passe não são iguais.');
    await api('/api/utilizadores/eu/password', 'PUT', dados);
    form.reset();
    location.href = '/definicoes.html?ok=' + encodeURIComponent('Palavra-passe guardada. As outras sessões foram terminadas.') + '#conta';
  });
  ligarForm(document.getElementById('f-apagar'), async dados => {
    if (!confirm('Tens a certeza? A conta vai ser apagada para sempre.')) return;
    await api('/api/utilizadores/eu', 'DELETE', dados);
    location.href = '/';
  });

  document.getElementById('app').addEventListener('click', async e => {
    const sessaoBtn = e.target.closest('[data-sessao]');
    if (sessaoBtn && await tentar(() => api('/api/utilizadores/eu/sessoes/' + sessaoBtn.dataset.sessao, 'DELETE'))) {
      sessaoBtn.closest('.li').remove();
    }
    if (e.target.id === 'terminar-outras' && await tentar(() => api('/api/utilizadores/eu/sessoes', 'DELETE'))) {
      location.href = '/definicoes.html?ok=' + encodeURIComponent('As outras sessões foram terminadas.') + '#conta';
    }
    if (e.target.id === 'desligar-google' && confirm('Desligar a conta Google?') && await tentar(() => api('/api/utilizadores/eu/google', 'DELETE'))) {
      location.href = '/definicoes.html?ok=' + encodeURIComponent('Conta Google desligada.') + '#conta';
    }
  });
})();
