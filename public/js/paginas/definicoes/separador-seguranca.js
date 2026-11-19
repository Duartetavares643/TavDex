// =====================================================================
//  Definições – separador "Conta e segurança" (?tab=seguranca)
//  Proteção da conta, email, palavra-passe, conta Google, sessões ativas,
//  atividade recente e apagar a conta.
// =====================================================================

// Nomes legíveis dos eventos antigos (os novos já trazem a descrição)
const EVENTOS = {
  registo: 'Conta criada', registo_google: 'Conta criada com o Google', login: 'Sessão iniciada com palavra-passe',
  login_google: 'Sessão iniciada com o Google', login_falhado: 'Tentativa de login falhada', logout: 'Sessão terminada',
  email_confirmado: 'Email confirmado', email_pedido: 'Pedido para mudar o email', email_cancelado: 'Mudança de email cancelada',
  sessoes_todas: 'Sessão terminada em todos os dispositivos', nome_alterado: '@nome alterado',
  email_alterado: 'Email alterado', palavra_passe_alterada: 'Palavra-passe alterada', palavra_passe_definida: 'Palavra-passe definida',
  palavra_passe_reposta: 'Palavra-passe definida pelo link do email', google_ligado: 'Conta Google ligada',
  google_desligado: 'Conta Google desligada', sessoes_terminadas: 'Sessões terminadas noutros dispositivos',
};

// HTML do separador
function htmlSeparadorSeguranca(d) {
  const dataHora = t => t ? `${dataCurta(t)} ${t.slice(11, 16)}` : '';
  const pr = d.protecao;
  const outrasSessoes = d.sessoes.filter(s => !s.atual).length;
  const marca = (bom, texto) => `<li class="${bom ? 'ok' : 'aviso'}"><b aria-hidden="true">${bom ? '✓' : '!'}</b> ${texto}</li>`;
  return `
      <!-- ======================= CONTA E SEGURANÇA ======================= -->
      <div data-pane="seguranca" hidden>
        <div class="box"><h3>Proteção da conta</h3>
          <ul class="protecao">
            ${marca(pr.email_verificado, pr.email_verificado ? 'Email confirmado' : 'Email por confirmar (confirma-o pelo link de recuperação ou ligando o Google)')}
            ${marca(pr.tem_password, pr.tem_password ? 'Palavra-passe definida' : 'Sem palavra-passe (só entras com o Google)')}
            ${pr.tem_password && pr.palavra_passe_fraca !== null
              ? marca(!pr.palavra_passe_fraca, pr.palavra_passe_fraca ? 'Palavra-passe fraca — altera-a' : 'Palavra-passe forte') : ''}
            ${pr.tem_password && pr.palavra_passe_dias !== null
              ? `<li class="info"><b aria-hidden="true">·</b> Última alteração da palavra-passe: ${pr.palavra_passe_dias === 0 ? 'hoje' : `há ${pr.palavra_passe_dias} dia${pr.palavra_passe_dias === 1 ? '' : 's'}`}</li>` : ''}
            ${marca(pr.google, pr.google ? 'Google ligado' : 'Google não ligado')}
            ${marca(pr.sessoes <= 1, pr.sessoes <= 1 ? 'Só este dispositivo tem sessão iniciada' : `${pr.sessoes} sessões ativas`)}
          </ul>
        </div>

        <form class="box form" id="f-email" novalidate><h3>Email</h3>
          ${d.email_pendente ? `<div class="email-pendente" role="status">
              A aguardar confirmação de <b>${esc(d.email_pendente)}</b>.
              <button type="button" class="lk" id="email-reenviar">Reenviar</button> ·
              <button type="button" class="lk" id="email-cancelar">Cancelar</button>
            </div>` : ''}
          <label>Email<input name="email" id="def-email" type="email" value="${esc(d.email)}" required maxlength="120" autocomplete="email"></label>
          ${d.tem_password ? `<label>Palavra-passe atual${campoPassword('password', 'Palavra-passe atual', 'current-password', 'required')}</label>` : ''}
          <small class="muted">Enviamos um link para o email novo: o email só muda depois de o confirmares. O email antigo recebe um aviso.</small>
          <p class="msg" role="alert"></p><button class="btn primary sm" type="submit">Mudar email</button>
        </form>

        <form class="box form" id="f-pass" novalidate><h3>Palavra-passe</h3>
          <!-- O @nome escondido ajuda os gestores de palavras-passe a guardar na conta certa -->
          <input type="text" name="username" value="${esc(d.nome)}" autocomplete="username" hidden>
          ${d.tem_password
            ? `<label>Palavra-passe atual${campoPassword('atual', 'Palavra-passe atual', 'current-password', 'required')}</label>`
            : '<p>Entraste com o Google. Se definires uma palavra-passe, também podes entrar com o @nome ou o email.</p>'}
          <label>Nova palavra-passe${campoPassword('nova', 'Nova palavra-passe', 'new-password', 'required minlength="10" maxlength="72" id="pw-nova"')}</label>
          <div class="forca" id="forca-nova" aria-live="polite"><i></i><i></i><i></i><i></i><span></span></div>
          <label>Confirmar${campoPassword('nova2', 'Confirmar a palavra-passe', 'new-password', 'required maxlength="72"')}</label>
          ${outrasSessoes ? '<label class="chk"><input type="checkbox" name="terminarOutras" checked> Terminar a sessão nos outros dispositivos</label>' : ''}
          <p class="msg" role="alert"></p>
          <button class="btn primary sm" type="submit">${d.tem_password ? 'Alterar palavra-passe' : 'Definir palavra-passe'}</button>
        </form>

        <div class="box"><h3>Contas ligadas</h3>
          <div class="li conta-ligada">
            <div class="cl-nome">${LOGO_GOOGLE}<div><b>Google</b>
              <small>${d.google_email ? `Ligada a ${esc(d.google_email)}` : 'Entra num clique com a tua conta Google'}</small></div></div>
            ${d.google_email
              ? '<button class="btn ghost sm" id="desligar-google">Desligar</button>'
              : '<a class="btn primary sm" data-google href="/api/auth/google?modo=ligar">Ligar</a>'}
          </div>
        </div>

        <div class="box"><h3>Sessões ativas</h3>
          ${d.sessoes.map(s => `<div class="li sessao"><div>
              <b>${esc(s.dispositivo)}</b>
              <small>IP ${esc(s.ip)} · ${s.via === 'google' ? 'com o Google' : 'com palavra-passe'} ·
                ${s.atual ? '<span class="agora">Este dispositivo · agora</span>' : `ativa ${tempo(s.ultimo_acesso)}`}</small></div>
            ${s.atual ? '<button class="del-btn" id="sair-aqui">Sair</button>' : `<button class="del-btn" data-sessao="${s.id}">Terminar</button>`}</div>`).join('')}
          <div class="btns" style="margin-top:12px">
            ${outrasSessoes ? '<button class="btn ghost sm" id="terminar-outras">Terminar todas as outras</button>' : ''}
            <button class="btn ghost sm" type="button" data-sair-todos>Terminar sessão em todos os dispositivos</button>
          </div>
        </div>

        <div class="box"><h3>Atividade recente</h3><div class="tl">
          ${d.atividade.map(x => `<p>${esc(x.descricao || EVENTOS[x.tipo] || x.tipo)}<small>${dataHora(x.criado_em)} · IP ${esc(x.ip)}</small></p>`).join('') || '<p>Sem atividade.</p>'}
        </div></div>

        <form class="box form danger" id="f-apagar" novalidate><h3>Apagar conta</h3>
          <p>Apaga a conta e tudo o que lhe pertence (foto, avaliações, listas, projetos, mensagens). Não dá para desfazer.</p>
          ${d.tem_password ? `<label>Palavra-passe${campoPassword('password', 'Palavra-passe', 'current-password', 'required')}</label>` : ''}
          <label>Para confirmar, escreve <b>@${esc(d.nome)}</b><input name="confirmacao" autocomplete="off" required></label>
          <p class="msg" role="alert"></p><button class="btn ghost sm" type="submit">Apagar a minha conta</button>
        </form>
      </div>
  `;
}

// Liga os formulários e botões do separador
function ligarSeparadorSeguranca(d) {
  const outrasSessoes = d.sessoes.filter(s => !s.atual).length;
  // Palavra-passe nova: requisitos ao vivo (não pode conter o nome, o @nome nem o email da conta)
  const fPass = document.getElementById('f-pass');
  const dadosPessoais = () => ({ nome: d.nome, nomeExibicao: d.nome_exibicao, email: d.email });
  ligarBarraForca(document.getElementById('pw-nova'), document.getElementById('forca-nova'),
    { dados: dadosPessoais, confirmar: fPass.nova2 });
  ligarCampoEmail(document.getElementById('def-email'));

  ligarForm(document.getElementById('f-email'), async dados => {
    const erro = RegrasEmail.erroFormato(dados.email);
    if (erro) throw erroCampos({ email: erro });
    const r = await api('/api/utilizadores/eu/email', 'PUT', dados);
    location.href = comAviso('/definicoes.html?tab=seguranca', r.mensagem);
  });

  // Mudança de email à espera de confirmação: Reenviar · Cancelar
  document.getElementById('email-reenviar')?.addEventListener('click', async () => {
    const r = await tentar(() => api('/api/utilizadores/eu/email/reenviar', 'POST'));
    if (r) aviso(r.mensagem);
  });
  document.getElementById('email-cancelar')?.addEventListener('click', async () => {
    const r = await tentar(() => api('/api/utilizadores/eu/email', 'DELETE'));
    if (r) location.href = comAviso('/definicoes.html?tab=seguranca', r.mensagem);
  });

  ligarForm(fPass, async dados => {
    const erros = {};
    const analise = RegrasPalavraPasse.analisar(dados.nova, dadosPessoais());
    if (!analise.valida) erros.nova = analise.erros[0];
    if (dados.nova !== dados.nova2) erros.nova2 = 'As palavras-passe não coincidem.';
    if (Object.keys(erros).length) throw erroCampos(erros);
    const r = await api('/api/utilizadores/eu/password', 'PUT', {
      atual: dados.atual, nova: dados.nova, nova2: dados.nova2, terminarOutras: outrasSessoes ? dados.terminarOutras : false,
    });
    location.href = comAviso('/definicoes.html?tab=seguranca', r.mensagem);
  });

  ligarForm(document.getElementById('f-apagar'), async dados => {
    if (dados.confirmacao.trim().replace(/^@/, '').toLowerCase() !== d.nome.toLowerCase()) {
      throw erroCampos({ confirmacao: `Escreve @${d.nome} para confirmar.` });
    }
    const sim = await confirmarJanela({
      titulo: 'Apagar a conta?', texto: 'Tens a certeza? A conta vai ser apagada para sempre.',
      sim: 'Apagar para sempre', nao: 'Cancelar',
    });
    if (!sim) return;
    const r = await api('/api/utilizadores/eu', 'DELETE', dados);
    avisoNaProximaPagina(r.aviso);
    avisarOutrosSeparadores('saiu');
    location.href = '/';
  });

  document.getElementById('app').addEventListener('click', async e => {
    const sessaoBtn = e.target.closest('[data-sessao]');
    if (sessaoBtn && await tentar(() => api('/api/utilizadores/eu/sessoes/' + sessaoBtn.dataset.sessao, 'DELETE'))) {
      location.href = comAviso('/definicoes.html?tab=seguranca', 'Sessão terminada nesse dispositivo.');
    }
    if (e.target.id === 'sair-aqui') terminarSessao(false);
    if (e.target.id === 'terminar-outras' && await tentar(() => api('/api/utilizadores/eu/sessoes', 'DELETE'))) {
      location.href = comAviso('/definicoes.html?tab=seguranca', 'As outras sessões foram terminadas.');
    }
    if (e.target.id === 'desligar-google' && await confirmarJanela({ titulo: 'Desligar a conta Google?', texto: 'Deixas de poder entrar com o Google até a voltares a ligar.', sim: 'Desligar', nao: 'Cancelar' })) {
      const r = await tentar(() => api('/api/conta/google/desligar', 'POST'));
      if (r) location.href = comAviso('/definicoes.html?tab=seguranca', r.mensagem);
    }
  });
}
