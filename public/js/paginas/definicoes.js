// =====================================================================
//  Definições (Passo 10) – só o próprio utilizador
//  Separador "Perfil": foto, cor, nome, @nome, localização, biografia, notificações
//  Separador "Conta e segurança" (?tab=seguranca): proteção, email, palavra-passe,
//  contas ligadas (Google), sessões ativas, atividade recente e apagar conta.
//  Dados: GET /api/utilizadores/eu/definicoes
// =====================================================================
(async () => {
  const u = await sessao;
  if (!u) return irLogin();
  let d;
  try {
    d = await api('/api/utilizadores/eu/definicoes');
  } catch (e) {
    return mostrarErro(e.message);
  }

  // Nomes legíveis dos eventos antigos (os novos já trazem a descrição)
  const EVENTOS = {
    registo: 'Conta criada', registo_google: 'Conta criada com o Google', login: 'Sessão iniciada com palavra-passe',
    login_google: 'Sessão iniciada com o Google', login_falhado: 'Tentativa de login falhada', logout: 'Sessão terminada',
    email_alterado: 'Email alterado', palavra_passe_alterada: 'Palavra-passe alterada', palavra_passe_definida: 'Palavra-passe definida',
    palavra_passe_reposta: 'Palavra-passe definida pelo link do email', google_ligado: 'Conta Google ligada',
    google_desligado: 'Conta Google desligada', sessoes_terminadas: 'Sessões terminadas noutros dispositivos',
  };
  const dataHora = t => t ? `${dataCurta(t)} ${t.slice(11, 16)}` : '';
  const pr = d.protecao;
  const outrasSessoes = d.sessoes.filter(s => !s.atual).length;
  const marca = (bom, texto) => `<li class="${bom ? 'ok' : 'aviso'}"><b aria-hidden="true">${bom ? '✓' : '!'}</b> ${texto}</li>`;

  mostrar(`<div class="content"><div class="left narrow">
    <h1 class="ph">Definições</h1>
    <div class="tabsbox">
      <div class="tabs"><button data-tab="perfil" class="on">Perfil</button><button data-tab="seguranca">Conta e segurança</button></div>

      <!-- ============================ PERFIL ============================ -->
      <div data-pane="perfil">
        <div class="def-cols">
        <form class="box form" id="f-perfil" novalidate>
          <h3>Foto de perfil</h3>
          <div class="foto-campo">
            <label class="btn ghost sm">Escolher foto<input type="file" name="foto" id="foto" accept="image/jpeg,image/png,image/webp" hidden></label>
            ${d.foto_versao ? '<label class="chk"><input type="checkbox" name="remover_foto" id="remover-foto"> Remover a foto</label>' : ''}
            <small class="muted">JPG, PNG ou WebP, até 5 MB. Fica recortada ao centro (256×256).</small>
          </div>

          <b>Cor do avatar</b>
          <div class="sw">${d.cores.map(c => `<label title="Cor ${c}"><input type="radio" name="cor" value="${c}" ${c === d.cor ? 'checked' : ''}>
              <i style="background:hsl(${c} 75% 52%)"></i></label>`).join('')}
            ${d.cores.includes(d.cor) ? '' : `<label><input type="radio" name="cor" value="${d.cor}" checked><i style="background:hsl(${d.cor} 75% 52%)"></i></label>`}
          </div>

          <b id="rot-banner">Banner do perfil</b>
          <!-- Cada opção mostra uma miniatura viva do cenário, na cor do avatar escolhida -->
          <div class="temas-banner" role="radiogroup" aria-labelledby="rot-banner" style="--h:${corValida(d.cor)}">
            ${Object.entries(TEMAS_BANNER).map(([tema, nome]) => `<label class="tema-op">
                <input type="radio" name="tema_banner" value="${tema}" ${tema === temaValido(d.tema_banner) ? 'checked' : ''}>
                <span class="tema-op__caixa">
                  <div class="pbanner pbanner--mini" data-tema="${tema}" style="--h:${corValida(d.cor)}" aria-hidden="true"></div>
                  <span class="tema-op__nome">${nome}</span>
                </span></label>`).join('')}
          </div>

          <label>Nome<input name="nome_exibicao" value="${esc(d.nome_exibicao || d.nome)}" required minlength="2" maxlength="50" autocomplete="name"></label>
          <label>@nome de utilizador<input name="nome" value="${esc(d.nome)}" required minlength="3" maxlength="30"
            pattern="[A-Za-z0-9_.]{3,30}" autocapitalize="off" spellcheck="false"></label>
          <label>Localização<input name="localizacao" value="${esc(d.localizacao)}" maxlength="40" placeholder="Ex.: Lisboa"></label>
          <label>Biografia <span class="cc" id="cc-bio"></span><textarea name="bio" id="bio" maxlength="160">${esc(d.bio)}</textarea></label>
          <label class="chk"><input type="checkbox" name="notif_email" ${d.notif_email ? 'checked' : ''}> Receber as notificações também por email</label>
          <p class="msg" role="alert"></p>
          <button class="btn primary" type="submit">Guardar alterações</button>
        </form>

        <!-- Pré-visualização: a mesma estrutura do perfil público (.pperfil + .pbanner + .phead) -->
        <aside class="pre-perfil">
          <small class="muted">Assim é que os outros veem o teu perfil</small>
          <section class="pperfil cartao-perfil" id="pre-perfil" style="--h:${corValida(d.cor)}">
            <div class="pbanner" id="pre-banner" data-tema="${temaValido(d.tema_banner)}" aria-hidden="true"></div>
            <div id="pre-partes"></div>
          </section>
        </aside>
        </div>
      </div>

      <!-- ======================= CONTA E SEGURANÇA ======================= -->
      <div data-pane="seguranca" hidden>
        <div class="box"><h3>Proteção da conta</h3>
          <ul class="protecao">
            ${marca(pr.email_verificado, pr.email_verificado ? 'Email confirmado' : 'Email por confirmar (confirma-o pelo link de recuperação ou ligando o Google)')}
            ${marca(pr.tem_password, pr.tem_password ? 'Palavra-passe definida' : 'Sem palavra-passe (só entras com o Google)')}
            ${marca(pr.google, pr.google ? 'Google ligado' : 'Google não ligado')}
            ${marca(pr.sessoes <= 1, pr.sessoes <= 1 ? 'Só este dispositivo tem sessão iniciada' : `${pr.sessoes} sessões ativas`)}
          </ul>
        </div>

        <form class="box form" id="f-email" novalidate><h3>Email</h3>
          <label>Email<input name="email" type="email" value="${esc(d.email)}" required maxlength="120" autocomplete="email"></label>
          ${d.tem_password ? `<label>Palavra-passe atual${campoPassword('password', 'Palavra-passe atual', 'current-password', 'required')}</label>` : ''}
          <small class="muted">Vamos avisar o email antigo da mudança. O email novo fica por confirmar.</small>
          <p class="msg" role="alert"></p><button class="btn primary sm" type="submit">Mudar email</button>
        </form>

        <form class="box form" id="f-pass" novalidate><h3>Palavra-passe</h3>
          ${d.tem_password
            ? `<label>Palavra-passe atual${campoPassword('atual', 'Palavra-passe atual', 'current-password', 'required')}</label>`
            : '<p>Entraste com o Google. Se definires uma palavra-passe, também podes entrar com o @nome ou o email.</p>'}
          <label>Nova palavra-passe${campoPassword('nova', 'Nova palavra-passe', 'new-password', 'required minlength="8" maxlength="72" id="pw-nova"')}</label>
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
          ${outrasSessoes ? '<div class="btns" style="margin-top:12px"><button class="btn ghost sm" id="terminar-outras">Terminar todas as outras</button></div>' : ''}
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
    </div></div></div>`);

  // Abre o separador pedido: ?tab=seguranca (ou o antigo #conta)
  if (location.hash === '#conta') history.replaceState(null, '', '?tab=seguranca');
  abrirSeparadorDoEndereco();

  // -------------------------------------------------------------------
  // Pré-visualização ao vivo do perfil (incluindo a foto ainda não guardada)
  // -------------------------------------------------------------------
  const fPerfil = document.getElementById('f-perfil');
  const campoFoto = document.getElementById('foto');
  const removerFoto = document.getElementById('remover-foto');
  const bio = document.getElementById('bio');
  const prePerfil = document.getElementById('pre-perfil');
  const preBanner = document.getElementById('pre-banner');
  const gradeTemas = fPerfil.querySelector('.temas-banner');
  let urlFotoNova = null;
  let contagens = null;   // números do perfil público (pedidos à API logo a seguir)

  const corEscolhida = () => corValida(fPerfil.querySelector('[name=cor]:checked')?.value);
  const temaEscolhido = () => temaValido(fPerfil.querySelector('[name=tema_banner]:checked')?.value);

  function preVisualizar() {
    const f = fPerfil.elements;
    const cor = corEscolhida();
    // Cenário e cor: o banner-perfil.js redesenha sozinho quando data-tema ou --h mudam.
    // A cor vai também para cada miniatura, para mudar logo (mesmo com "reduzir movimento").
    prePerfil.style.setProperty('--h', cor);
    preBanner.dataset.tema = temaEscolhido();
    gradeTemas.style.setProperty('--h', cor);
    gradeTemas.querySelectorAll('.pbanner').forEach(b => b.style.setProperty('--h', cor));

    // Avatar, nome, @nome, localização e biografia (partesPerfil escapa todo o texto)
    document.getElementById('pre-partes').innerHTML = partesPerfil({
      id: d.id, nome: f.nome.value.trim().replace(/^@/, ''), nome_exibicao: f.nome_exibicao.value.trim(),
      papel: d.papel, criado_em: d.criado_em, localizacao: f.localizacao.value.trim(), bio: bio.value.trim(),
      foto_versao: removerFoto && removerFoto.checked ? 0 : d.foto_versao,
    }, {
      fotoUrl: urlFotoNova,
      contagens,
      acoes: '<span class="btn ghost sm" aria-hidden="true">✎ Editar perfil</span>',
    });
    document.getElementById('cc-bio').textContent = `${bio.value.length}/160`;
  }
  fPerfil.addEventListener('input', preVisualizar);
  fPerfil.addEventListener('change', preVisualizar);
  // Os números (seguidores, avaliações, ...) vêm do perfil público
  api('/api/utilizadores/' + encodeURIComponent(d.nome))
    .then(r => { contagens = r.contagens; preVisualizar(); })
    .catch(() => {});

  campoFoto.addEventListener('change', () => {
    if (urlFotoNova) URL.revokeObjectURL(urlFotoNova);
    urlFotoNova = null;
    const ficheiro = campoFoto.files[0];
    if (!ficheiro) return preVisualizar();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(ficheiro.type)) {
      campoFoto.value = '';
      aviso('A foto tem de ser JPG, PNG ou WebP.', 'erro');
    } else if (ficheiro.size > 5 * 1024 * 1024) {
      campoFoto.value = '';
      aviso('A foto tem de ter no máximo 5 MB.', 'erro');
    } else {
      urlFotoNova = URL.createObjectURL(ficheiro);
      if (removerFoto) removerFoto.checked = false;
    }
    preVisualizar();
  });
  preVisualizar();

  // -------------------------------------------------------------------
  // Aviso "Tens alterações por guardar"
  // Ao abrir a página tira-se uma "fotografia" dos valores do separador Perfil.
  // Se o formulário estiver diferente dela e a pessoa tentar sair, aparece o aviso.
  // Se as alterações forem desfeitas à mão, volta a ficar igual e o aviso não aparece.
  // -------------------------------------------------------------------
  function valoresPerfil() {
    const f = fPerfil.elements;
    const ficheiro = campoFoto.files[0];
    return JSON.stringify({
      nome_exibicao: f.nome_exibicao.value, nome: f.nome.value, localizacao: f.localizacao.value, bio: bio.value,
      notif_email: f.notif_email.checked, cor: corEscolhida(), tema: temaEscolhido(),
      foto: ficheiro ? `${ficheiro.name}|${ficheiro.size}|${ficheiro.lastModified}` : '',
      remover_foto: !!(removerFoto && removerFoto.checked),
    });
  }
  const fotografia = valoresPerfil();
  let podeSair = false;   // passa a true depois de guardar (ou de escolher "Sair sem guardar")
  const temAlteracoes = () => !podeSair && valoresPerfil() !== fotografia;

  // Janela própria, no estilo da "Inicia sessão para continuar"
  function avisarAlteracoes(sairSemGuardar) {
    let janela = document.getElementById('janela-alteracoes');
    if (!janela) {
      janela = document.createElement('dialog');
      janela.id = 'janela-alteracoes';
      janela.className = 'modal modal-aviso';
      janela.setAttribute('role', 'dialog');
      janela.setAttribute('aria-modal', 'true');
      janela.setAttribute('aria-labelledby', 'alteracoes-titulo');
      janela.innerHTML = `<div class="modal-in">
          <h2 id="alteracoes-titulo">Tens alterações por guardar</h2>
          <p class="modal-txt">Queres sair sem guardar?</p>
          <div class="modal-btns">
            <button type="button" class="btn primary" data-continuar>Continuar a editar</button>
            <button type="button" class="btn ghost" data-sair>Sair sem guardar</button>
          </div>
        </div>`;
      document.body.append(janela);
      // Foco preso dentro da janela: o Tab anda só entre os dois botões
      janela.addEventListener('keydown', e => {
        if (e.key !== 'Tab') return;
        const botoes = [...janela.querySelectorAll('button')];
        const i = botoes.indexOf(document.activeElement);
        e.preventDefault();
        botoes[(i + (e.shiftKey ? botoes.length - 1 : 1)) % botoes.length].focus();
      });
      // Esc (evento "cancel" do dialog) = "Continuar a editar": só fecha, não perde nada
      janela.querySelector('[data-continuar]').addEventListener('click', () => janela.close());
      // Clicar fora da caixa também fecha (como "Continuar a editar")
      janela.addEventListener('click', e => { if (e.target === janela) janela.close(); });
    }
    janela.querySelector('[data-sair]').onclick = () => {
      podeSair = true;
      janela.close();
      sairSemGuardar();
    };
    if (typeof janela.showModal === 'function') janela.showModal(); else janela.setAttribute('open', '');
    janela.querySelector('[data-continuar]').focus();
  }

  // 1) Links internos do site (topo, rodapé, página). Corre na fase de captura,
  //    antes de o browser seguir o link.
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href]');
    if (!link || !temAlteracoes()) return;
    if (link.target === '_blank' || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const destino = new URL(link.href, location.href);
    if (destino.origin !== location.origin) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    avisarAlteracoes(() => { location.href = destino.href; });
  }, true);

  // 2) Trocar para o separador "Conta e segurança". "Sair sem guardar" recarrega a
  //    página já nesse separador, para as alterações desaparecerem mesmo.
  document.addEventListener('click', e => {
    if (!e.target.closest('.tabs [data-tab="seguranca"]') || !temAlteracoes()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    avisarAlteracoes(() => { location.href = '/definicoes.html?tab=seguranca'; });
  }, true);

  // 3) Fechar ou recarregar o separador do browser: aqui só dá para usar o aviso do próprio browser
  window.addEventListener('beforeunload', e => {
    if (!temAlteracoes()) return;
    e.preventDefault();
    e.returnValue = '';
  });

  // Guardar o perfil: primeiro a foto (se mudou), depois os outros campos
  ligarForm(fPerfil, async dados => {
    const erros = {};
    if (dados.nome_exibicao.trim().length < 2) erros.nome_exibicao = 'O nome tem de ter entre 2 e 50 caracteres.';
    if (!/^@?[A-Za-z0-9_.]{3,30}$/.test(dados.nome.trim())) erros.nome = 'O @nome tem de ter 3 a 30 letras, números, _ ou .';
    if (Object.keys(erros).length) throw erroCampos(erros);

    if (campoFoto.files[0]) {
      const envio = new FormData();
      envio.append('foto', campoFoto.files[0]);
      try {
        await api('/api/utilizadores/eu/foto', 'POST', envio);
      } catch (erro) {
        erro.erros = { foto: erro.message };
        throw erro;
      }
    } else if (removerFoto && removerFoto.checked) {
      await api('/api/utilizadores/eu/foto', 'DELETE');
    }
    let r;
    try {
      r = await api('/api/utilizadores/eu/perfil', 'PUT', {
        nome_exibicao: dados.nome_exibicao, nome: dados.nome, cor: dados.cor, tema_banner: dados.tema_banner,
        localizacao: dados.localizacao, bio: dados.bio, notif_email: dados.notif_email,
      });
    } catch (erro) {
      // O cenário são vários radios: a mensagem aparece em cima do botão
      if (erro.erros && erro.erros.tema_banner) erro.message = erro.erros.tema_banner;
      throw erro;
    }
    // Guardado: já pode sair sem aviso
    podeSair = true;
    location.href = comAviso('/perfil.html?u=' + encodeURIComponent(r.nome), r.mensagem);
  });

  // -------------------------------------------------------------------
  // Conta e segurança
  // -------------------------------------------------------------------
  ligarBarraForca(document.getElementById('pw-nova'), document.getElementById('forca-nova'));

  ligarForm(document.getElementById('f-email'), async dados => {
    const r = await api('/api/utilizadores/eu/email', 'PUT', dados);
    location.href = comAviso('/definicoes.html?tab=seguranca', r.mensagem);
  });

  ligarForm(document.getElementById('f-pass'), async dados => {
    const erros = {};
    if (dados.nova.length < 8 || !/[A-Za-zÀ-ÿ]/.test(dados.nova) || !/[0-9]/.test(dados.nova)) {
      erros.nova = 'A palavra-passe tem de ter 8 a 72 caracteres, com letras e números.';
    }
    if (dados.nova !== dados.nova2) erros.nova2 = 'As palavras-passe não são iguais.';
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
    if (!confirm('Tens a certeza? A conta vai ser apagada para sempre.')) return;
    await api('/api/utilizadores/eu', 'DELETE', dados);
    location.href = '/';
  });

  document.getElementById('app').addEventListener('click', async e => {
    const sessaoBtn = e.target.closest('[data-sessao]');
    if (sessaoBtn && await tentar(() => api('/api/utilizadores/eu/sessoes/' + sessaoBtn.dataset.sessao, 'DELETE'))) {
      location.href = comAviso('/definicoes.html?tab=seguranca', 'Sessão terminada nesse dispositivo.');
    }
    if (e.target.id === 'sair-aqui' && await tentar(() => api('/api/auth/logout', 'POST'))) {
      location.href = '/';
    }
    if (e.target.id === 'terminar-outras' && await tentar(() => api('/api/utilizadores/eu/sessoes', 'DELETE'))) {
      location.href = comAviso('/definicoes.html?tab=seguranca', 'As outras sessões foram terminadas.');
    }
    if (e.target.id === 'desligar-google' && confirm('Desligar a conta Google?')) {
      const r = await tentar(() => api('/api/conta/google/desligar', 'POST'));
      if (r) location.href = comAviso('/definicoes.html?tab=seguranca', r.mensagem);
    }
  });
})();
