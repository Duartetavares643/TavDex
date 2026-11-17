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
    email_confirmado: 'Email confirmado', email_pedido: 'Pedido para mudar o email', email_cancelado: 'Mudança de email cancelada',
    sessoes_todas: 'Sessão terminada em todos os dispositivos', nome_alterado: '@nome alterado',
    email_alterado: 'Email alterado', palavra_passe_alterada: 'Palavra-passe alterada', palavra_passe_definida: 'Palavra-passe definida',
    palavra_passe_reposta: 'Palavra-passe definida pelo link do email', google_ligado: 'Conta Google ligada',
    google_desligado: 'Conta Google desligada', sessoes_terminadas: 'Sessões terminadas noutros dispositivos',
  };
  const dataHora = t => t ? `${dataCurta(t)} ${t.slice(11, 16)}` : '';
  // O nome só aceita letras. Se ainda não há nome (ou o antigo tem números), sugere um
  // feito a partir do @nome, só com as letras: "ana_m" -> "Ana M", "rui99" -> "Rui".
  const nomeSugerido = d.nome_exibicao && !erroNomePessoa(d.nome_exibicao) ? d.nome_exibicao
    : (d.nome_exibicao || d.nome).replace(/[^\p{L}\p{M}' -]+/gu, ' ').replace(/\s+/g, ' ').trim()
      .replace(/(^|\s)\p{Ll}/gu, l => l.toUpperCase()) || '';
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
            <small class="muted">JPG, PNG ou WebP, até 5 MB. Depois de escolheres, podes recortá-la.</small>
          </div>

          <b>Cor do avatar</b>
          <div class="sw">${d.cores.map(c => `<label title="Cor ${c}"><input type="radio" name="cor" value="${c}" ${c === d.cor ? 'checked' : ''}>
              <i style="background:hsl(${c} 75% 52%)"></i></label>`).join('')}
            ${d.cores.includes(d.cor) ? '' : `<label><input type="radio" name="cor" value="${d.cor}" checked><i style="background:hsl(${d.cor} 75% 52%)"></i></label>`}
          </div>

          <b id="rot-banner">Banner do perfil</b>
          <!-- Imagem própria: fica por cima do cenário; escolher um cenário tira a imagem -->
          <div class="foto-campo">
            <label class="btn ghost sm">${d.banner_versao ? 'Trocar a imagem' : 'Carregar imagem'}<input type="file" id="banner-ficheiro" accept="image/jpeg,image/png,image/webp" hidden></label>
            ${d.banner_versao ? '<label class="chk"><input type="checkbox" id="remover-banner"> Remover a imagem</label>' : ''}
            <small class="muted">Usa uma imagem tua (JPG, PNG ou WebP, até 5 MB) ou escolhe um dos cenários abaixo.</small>
          </div>
          <!-- Cada opção mostra uma miniatura viva do cenário, na cor do avatar escolhida -->
          <div class="temas-banner" role="radiogroup" aria-labelledby="rot-banner" style="--h:${corValida(d.cor)}">
            ${Object.entries(TEMAS_BANNER).map(([tema, nome]) => `<label class="tema-op">
                <input type="radio" name="tema_banner" value="${tema}" ${tema === temaValido(d.tema_banner) ? 'checked' : ''}>
                <span class="tema-op__caixa">
                  <div class="pbanner pbanner--mini" data-tema="${tema}" style="--h:${corValida(d.cor)}" aria-hidden="true"></div>
                  <span class="tema-op__nome">${nome}</span>
                </span></label>`).join('')}
          </div>

          <label>Nome<input name="nome_exibicao" value="${esc(nomeSugerido)}" required minlength="2" maxlength="50" autocomplete="name"></label>
          <label>@nome de utilizador<input name="nome" id="def-nome" value="${esc(d.nome)}" required minlength="3" maxlength="30"
            pattern="[A-Za-z0-9_.]{3,30}" autocapitalize="off" spellcheck="false" ${d.pode_mudar_nome ? '' : 'readonly aria-readonly="true"'}></label>
          <small class="muted nota-nome">${d.pode_mudar_nome
            ? 'Só podes mudar o @nome uma vez a cada 30 dias. O endereço antigo do perfil continua a funcionar durante 30 dias.'
            : `Podes voltar a mudar o teu @nome a partir de ${esc(d.nome_livre_em)}.`}</small>
          <label>Localização<input name="localizacao" value="${esc(d.localizacao)}" maxlength="40" placeholder="Ex.: Lisboa"></label>
          <label>Biografia <span class="cc" id="cc-bio"></span><textarea name="bio" id="bio" maxlength="160">${esc(d.bio)}</textarea></label>

          <b id="rot-generos">Géneros favoritos <small class="muted">(até 3)</small></b>
          <div class="generos-op" role="group" aria-labelledby="rot-generos">
            ${d.generos.map(g => `<label class="chip"><input type="checkbox" data-lista data-genero value="${g.id}"
                ${d.meus_generos.includes(g.id) ? 'checked' : ''}><span>${esc(g.nome)}</span></label>`).join('')}
          </div>
          <small class="muted">Aparecem no teu perfil e ajudam o "Recomendado para ti" enquanto tens poucas avaliações.</small>

          <b>Privacidade</b>
          <label class="chk"><input type="checkbox" name="mostrar_listas" ${d.mostrar_listas ? 'checked' : ''}> Mostrar os meus favoritos e vistos no perfil</label>
          <label class="chk"><input type="checkbox" name="mostrar_seguidores" ${d.mostrar_seguidores ? 'checked' : ''}> Mostrar quem sigo e quem me segue</label>
          <label class="chk"><input type="checkbox" name="notif_email" ${d.notif_email ? 'checked' : ''}> Receber as notificações também por email</label>
          <p class="msg" role="alert"></p>
          <button class="btn primary" type="submit">Guardar alterações</button>
        </form>

        <!-- Pré-visualização: a mesma estrutura do perfil público (.pperfil + .pbanner + .phead) -->
        <aside class="pre-perfil">
          <small class="muted">Assim é que os outros veem o teu perfil</small>
          <section class="pperfil cartao-perfil" id="pre-perfil" style="--h:${corValida(d.cor)}">
            <div class="pbanner" id="pre-banner" data-tema="${temaValido(d.tema_banner)}" aria-hidden="true">${imagemBanner(d)}</div>
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
  const campoBanner = document.getElementById('banner-ficheiro');
  const removerBanner = document.getElementById('remover-banner');
  let bannerRecortado = null;   // Blob JPEG 1500×500 (ou null)
  let urlBannerNovo = null;
  let versaoBanner = 0;         // muda a cada recorte (para o aviso de alterações por guardar)

  const corEscolhida = () => corValida(fPerfil.querySelector('[name=cor]:checked')?.value);
  const temaEscolhido = () => temaValido(fPerfil.querySelector('[name=tema_banner]:checked')?.value);

  function preVisualizar() {
    const f = fPerfil.elements;
    const cor = corEscolhida();
    // Cenário e cor: o banner-perfil.js redesenha sozinho quando data-tema ou --h mudam.
    // A cor vai também para cada miniatura, para mudar logo (mesmo com "reduzir movimento").
    prePerfil.style.setProperty('--h', cor);
    preBanner.dataset.tema = temaEscolhido();
    // Imagem do banner: a nova (ainda não guardada), a guardada, ou nenhuma (fica o cenário)
    preBanner.querySelector('.pbanner__foto')?.remove();
    const comImagem = urlBannerNovo || (d.banner_versao && !(removerBanner && removerBanner.checked));
    if (comImagem) preBanner.insertAdjacentHTML('afterbegin', imagemBanner(d, urlBannerNovo));
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
      // Géneros favoritos escolhidos (os nomes estão nos próprios botões)
      generos: [...fPerfil.querySelectorAll('[data-genero]:checked')].map(c => c.nextElementSibling.textContent),
    });
    document.getElementById('cc-bio').textContent = `${bio.value.length}/160`;
  }
  fPerfil.addEventListener('input', preVisualizar);
  fPerfil.addEventListener('change', preVisualizar);
  // Os números (seguidores, avaliações, ...) vêm do perfil público
  api('/api/utilizadores/' + encodeURIComponent(d.nome))
    .then(r => { contagens = r.contagens; preVisualizar(); })
    .catch(() => {});

  // Escolher a foto -> janela para a recortar -> a foto recortada é a que se envia
  let fotoRecortada = null;   // Blob JPEG quadrado (ou null)
  let versaoFoto = 0;         // muda a cada recorte (para o aviso de alterações por guardar)
  campoFoto.addEventListener('change', async () => {
    const ficheiro = campoFoto.files[0];
    campoFoto.value = '';     // o ficheiro original não é enviado: só o recorte
    if (!ficheiro) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(ficheiro.type)) return aviso('A foto tem de ser JPG, PNG ou WebP.', 'erro');
    if (ficheiro.size > 5 * 1024 * 1024) return aviso('A foto tem de ter no máximo 5 MB.', 'erro');
    const recorte = await recortarFoto(ficheiro);
    if (!recorte) return;     // Cancelar: fica tudo como estava
    if (urlFotoNova) URL.revokeObjectURL(urlFotoNova);
    fotoRecortada = recorte;
    versaoFoto++;
    urlFotoNova = URL.createObjectURL(recorte);
    if (removerFoto) removerFoto.checked = false;
    preVisualizar();
  });

  // Imagem do banner: escolher -> recortar em 3:1 -> aparece logo na pré-visualização
  campoBanner.addEventListener('change', async () => {
    const ficheiro = campoBanner.files[0];
    campoBanner.value = '';
    if (!ficheiro) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(ficheiro.type)) return aviso('A imagem tem de ser JPG, PNG ou WebP.', 'erro');
    if (ficheiro.size > 5 * 1024 * 1024) return aviso('A imagem do banner tem de ter no máximo 5 MB.', 'erro');
    const recorte = await recortarFoto(ficheiro, 'banner');
    if (!recorte) return;
    if (urlBannerNovo) URL.revokeObjectURL(urlBannerNovo);
    bannerRecortado = recorte;
    versaoBanner++;
    urlBannerNovo = URL.createObjectURL(recorte);
    if (removerBanner) removerBanner.checked = false;
    preVisualizar();
  });
  // Escolher um cenário tira a imagem (senão o cenário escolhido não se via)
  gradeTemas.addEventListener('change', () => {
    if (urlBannerNovo) { URL.revokeObjectURL(urlBannerNovo); urlBannerNovo = null; bannerRecortado = null; versaoBanner++; }
    if (removerBanner) removerBanner.checked = true;
    preVisualizar();
  });
  preVisualizar();

  // Géneros favoritos: no máximo 3 (os outros ficam desativados quando já há 3)
  const caixasGeneros = [...fPerfil.querySelectorAll('[data-genero]')];
  const generosEscolhidos = () => caixasGeneros.filter(c => c.checked).map(c => Number(c.value));
  function limitarGeneros() {
    const cheio = generosEscolhidos().length >= 3;
    caixasGeneros.forEach(c => { c.disabled = cheio && !c.checked; });
  }
  fPerfil.addEventListener('change', e => { if (e.target.matches('[data-genero]')) limitarGeneros(); });
  limitarGeneros();

  // @nome disponível ao vivo (se ainda puder mudar)
  if (d.pode_mudar_nome) ligarNomeDisponivel(document.getElementById('def-nome'), d.nome);

  // Verificações de cada campo (o servidor volta a verificar tudo ao guardar)
  const verificacoes = {
    nome_exibicao: erroNomePessoa,   // só letras, espaços, hífen e apóstrofo (main.js)
    nome: erroFormatoNome,           // letras sem acentos, números, _ e . (main.js)
    localizacao: v => v.trim().length > 40 ? 'A localização tem no máximo 40 caracteres.' : '',
    bio: v => v.length > 160 ? 'A biografia tem no máximo 160 caracteres.' : '',
  };
  // O nome fica a vermelho logo enquanto se escreve (o @nome já tem o "Disponível" ao vivo)
  ligarVerificacaoCampo(fPerfil.nome_exibicao, erroNomePessoa);
  const aoVivo = ['nome_exibicao', ...(d.pode_mudar_nome ? ['nome'] : [])];
  // Os outros campos: mensagem ao sair do campo (sem mexer no foco)
  fPerfil.addEventListener('focusout', e => {
    const campo = e.target;
    const verificar = verificacoes[campo.name];
    if (!verificar || aoVivo.includes(campo.name)) return;
    const erro = verificar(campo.value);
    const id = `erro-f-perfil-${campo.name}`;
    document.getElementById(id)?.remove();
    if (!erro) { campo.removeAttribute('aria-invalid'); return; }
    const nota = document.createElement('small');
    nota.className = 'erro-campo';
    nota.id = id;
    nota.textContent = erro;
    campo.setAttribute('aria-invalid', 'true');
    campo.setAttribute('aria-describedby', id);
    campo.after(nota);
  });

  // -------------------------------------------------------------------
  // Aviso "Tens alterações por guardar"
  // Ao abrir a página tira-se uma "fotografia" dos valores do separador Perfil.
  // Se o formulário estiver diferente dela e a pessoa tentar sair, aparece o aviso.
  // Se as alterações forem desfeitas à mão, volta a ficar igual e o aviso não aparece.
  // -------------------------------------------------------------------
  function valoresPerfil() {
    const f = fPerfil.elements;
    return JSON.stringify({
      nome_exibicao: f.nome_exibicao.value, nome: f.nome.value, localizacao: f.localizacao.value, bio: bio.value,
      notif_email: f.notif_email.checked, cor: corEscolhida(), tema: temaEscolhido(),
      foto: versaoFoto, remover_foto: !!(removerFoto && removerFoto.checked),
      banner: bannerRecortado ? versaoBanner : 0, remover_banner: !!(removerBanner && removerBanner.checked),
      generos: generosEscolhidos().sort((a, b) => a - b),
      mostrar_listas: f.mostrar_listas.checked, mostrar_seguidores: f.mostrar_seguidores.checked,
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
    for (const [campo, verificar] of Object.entries(verificacoes)) {
      const erro = verificar(dados[campo] || '');
      if (erro) erros[campo] = erro;
    }
    if (Object.keys(erros).length) throw erroCampos(erros);

    if (fotoRecortada) {
      const envio = new FormData();
      envio.append('foto', fotoRecortada, 'foto.jpg');
      try {
        await api('/api/utilizadores/eu/foto', 'POST', envio);
      } catch (erro) {
        erro.erros = { foto: erro.message };
        throw erro;
      }
    } else if (removerFoto && removerFoto.checked) {
      await api('/api/utilizadores/eu/foto', 'DELETE');
    }
    // Banner: a imagem nova, ou tirar a imagem (volta ao cenário escolhido)
    if (bannerRecortado) {
      const envio = new FormData();
      envio.append('banner', bannerRecortado, 'banner.jpg');
      await api('/api/utilizadores/eu/banner', 'POST', envio);
    } else if (removerBanner && removerBanner.checked) {
      await api('/api/utilizadores/eu/banner', 'DELETE');
    }
    let r;
    try {
      r = await api('/api/utilizadores/eu/perfil', 'PUT', {
        nome_exibicao: dados.nome_exibicao, nome: dados.nome, cor: dados.cor, tema_banner: dados.tema_banner,
        localizacao: dados.localizacao, bio: dados.bio, notif_email: dados.notif_email,
        generos: generosEscolhidos(), mostrar_listas: dados.mostrar_listas, mostrar_seguidores: dados.mostrar_seguidores,
      });
    } catch (erro) {
      // O cenário e os géneros são vários botões: a mensagem aparece em cima do botão Guardar
      if (erro.erros && (erro.erros.tema_banner || erro.erros.generos)) erro.message = erro.erros.tema_banner || erro.erros.generos;
      throw erro;
    }
    // Guardado: já pode sair sem aviso
    podeSair = true;
    location.href = comAviso('/perfil.html?u=' + encodeURIComponent(r.nome), r.mensagem);
  });

  // -------------------------------------------------------------------
  // Conta e segurança
  // -------------------------------------------------------------------
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

  // -------------------------------------------------------------------
  // Recortar uma imagem antes de enviar: a imagem num <canvas> com a zona de recorte.
  //  · foto   → círculo, devolve um JPEG quadrado (512×512)
  //  · banner → retângulo 3:1, devolve um JPEG 1500×500
  // Arrastar (rato ou dedo) move a imagem; a barra (ou a roda do rato, ou + e −) faz zoom;
  // as setas do teclado também movem. O servidor continua a validar o conteúdo e a
  // reduzir a imagem com o sharp.
  // -------------------------------------------------------------------
  const RECORTES = {
    foto: {
      titulo: 'Recortar a foto', texto: 'Arrasta a foto para a acertar no círculo e usa o zoom.', usar: 'Usar esta foto',
      tela: [320, 320], zona: [140, 140], circulo: true, saida: [512, 512], classe: '',
    },
    banner: {
      titulo: 'Recortar o banner', texto: 'Arrasta a imagem para escolher a parte que aparece no banner e usa o zoom.', usar: 'Usar esta imagem',
      tela: [360, 200], zona: [170, 170 / 3], circulo: false, saida: [1500, 500], classe: 'banner',
    },
  };
  function recortarFoto(ficheiro, tipo = 'foto') {
    const cfg = RECORTES[tipo];
    return new Promise(resolve => {
      const url = URL.createObjectURL(ficheiro);
      const img = new Image();
      img.onerror = () => {
        URL.revokeObjectURL(url);
        aviso('Não foi possível abrir essa imagem.', 'erro');
        resolve(null);
      };
      img.onload = () => {
        let resultado = null;
        const janela = abrirJanela(`<div class="modal-in">
            <h2>${cfg.titulo}</h2>
            <p class="modal-txt">${cfg.texto}</p>
            <canvas class="recorte-tela ${cfg.classe ? 'recorte-tela--' + cfg.classe : ''}" width="${cfg.tela[0]}" height="${cfg.tela[1]}" tabindex="0"
              aria-label="Imagem a recortar. Usa as setas para mover e as teclas + e − para o zoom."></canvas>
            <label class="recorte-zoom">Zoom <input type="range" min="1" max="4" step="0.01" value="1"></label>
            <div class="modal-btns">
              <button type="button" class="btn primary" data-usar>${cfg.usar}</button>
              <button type="button" class="btn ghost" data-cancelar>Cancelar</button>
            </div>
          </div>`, {
          classe: 'modal-aviso modal-recorte' + (cfg.classe ? ' modal-recorte--' + cfg.classe : ''),
          aoFechar: () => { URL.revokeObjectURL(url); resolve(resultado); },
        });

        const tela = janela.querySelector('canvas');
        const ctx = tela.getContext('2d');
        const zoomCampo = janela.querySelector('[type=range]');
        const [TL, TA] = cfg.tela;            // tamanho do canvas
        const [RX, RY] = cfg.zona;            // metade da largura e da altura da zona de recorte
        const base = Math.max(2 * RX / img.width, 2 * RY / img.height);   // com zoom 1 a imagem cobre a zona
        let zoom = 1;
        let cx = 0;                           // deslocamento do centro da imagem (px do canvas)
        let cy = 0;

        // A imagem nunca pode deixar a zona de recorte com partes vazias
        function limitar() {
          const meiaL = img.width * base * zoom / 2;
          const meiaA = img.height * base * zoom / 2;
          cx = Math.max(-(meiaL - RX), Math.min(meiaL - RX, cx));
          cy = Math.max(-(meiaA - RY), Math.min(meiaA - RY, cy));
        }
        // Desenha a forma da zona de recorte (círculo ou retângulo) no caminho atual
        function zona() {
          if (cfg.circulo) ctx.arc(TL / 2, TA / 2, RX, 0, Math.PI * 2);
          else ctx.rect(TL / 2 - RX, TA / 2 - RY, 2 * RX, 2 * RY);
        }
        function desenhar() {
          limitar();
          const l = img.width * base * zoom;
          const a = img.height * base * zoom;
          ctx.clearRect(0, 0, TL, TA);
          ctx.drawImage(img, TL / 2 + cx - l / 2, TA / 2 + cy - a / 2, l, a);
          // Escurece tudo menos a zona (regra "evenodd": a zona fica como um buraco)
          ctx.fillStyle = 'rgba(8, 7, 11, .6)';
          ctx.beginPath();
          ctx.rect(0, 0, TL, TA);
          zona();
          ctx.fill('evenodd');
          ctx.strokeStyle = 'rgba(255, 255, 255, .85)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          zona();
          ctx.stroke();
        }
        function mudarZoom(novo) {
          zoom = Math.max(1, Math.min(4, novo));
          zoomCampo.value = zoom;
          desenhar();
        }

        // Arrastar com o rato ou com o dedo (pointer events servem para os dois)
        let arrasto = null;
        tela.addEventListener('pointerdown', e => {
          tela.setPointerCapture(e.pointerId);
          arrasto = { x: e.clientX, y: e.clientY };
        });
        tela.addEventListener('pointermove', e => {
          if (!arrasto) return;
          const escala = TL / tela.getBoundingClientRect().width;   // o canvas pode estar mais pequeno no ecrã
          cx += (e.clientX - arrasto.x) * escala;
          cy += (e.clientY - arrasto.y) * escala;
          arrasto = { x: e.clientX, y: e.clientY };
          desenhar();
        });
        const largar = () => { arrasto = null; };
        tela.addEventListener('pointerup', largar);
        tela.addEventListener('pointercancel', largar);
        tela.addEventListener('wheel', e => { e.preventDefault(); mudarZoom(zoom - e.deltaY * 0.002); }, { passive: false });
        tela.addEventListener('keydown', e => {
          const passos = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] };
          if (passos[e.key]) { e.preventDefault(); cx += passos[e.key][0]; cy += passos[e.key][1]; desenhar(); }
          if (e.key === '+' || e.key === '=') { e.preventDefault(); mudarZoom(zoom + 0.1); }
          if (e.key === '-') { e.preventDefault(); mudarZoom(zoom - 0.1); }
        });
        zoomCampo.addEventListener('input', () => mudarZoom(Number(zoomCampo.value)));

        janela.querySelector('[data-cancelar]').addEventListener('click', () => janela.close());
        janela.querySelector('[data-usar]').addEventListener('click', () => {
          // Recorta a zona (o quadrado do círculo, ou o retângulo), na resolução original da imagem
          const escala = base * zoom;
          const l = img.width * escala;
          const a = img.height * escala;
          const sx = (l / 2 - cx - RX) / escala;
          const sy = (a / 2 - cy - RY) / escala;
          const [SL, SA] = cfg.saida;
          const saida = document.createElement('canvas');
          saida.width = SL;
          saida.height = SA;
          saida.getContext('2d').drawImage(img, sx, sy, 2 * RX / escala, 2 * RY / escala, 0, 0, SL, SA);
          saida.toBlob(blob => {
            resultado = blob;
            janela.close();
          }, 'image/jpeg', 0.92);
        });
        desenhar();
        tela.focus();
      };
      img.src = url;
    });
  }
})();
