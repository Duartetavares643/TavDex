// =====================================================================
//  Definições – separador "Perfil"
//  Foto, cor do avatar, banner, nome, @nome, localização, biografia, géneros
//  favoritos e privacidade, com pré-visualização ao vivo e aviso de
//  "alterações por guardar". Guardar: PUT /api/utilizadores/eu/perfil
// =====================================================================

// HTML do separador (formulário + pré-visualização do perfil)
function htmlSeparadorPerfil(d) {
  // O nome só aceita letras. Se ainda não há nome (ou o antigo tem números), sugere um
  // feito a partir do @nome, só com as letras: "ana_m" -> "Ana M", "rui99" -> "Rui".
  const nomeSugerido = d.nome_exibicao && !RegrasNomes.erroNomePessoa(d.nome_exibicao) ? d.nome_exibicao
    : (d.nome_exibicao || d.nome).replace(/[^\p{L}\p{M}' -]+/gu, ' ').replace(/\s+/g, ' ').trim()
      .replace(/(^|\s)\p{Ll}/gu, l => l.toUpperCase()) || '';
  return `
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
  `;
}

// Liga o separador: pré-visualização, foto, banner, géneros, verificações e Guardar
function ligarSeparadorPerfil(d) {
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

  // Atualiza a pré-visualização do perfil com o que está escrito no formulário
  function preVisualizar() {
    const f = fPerfil.elements;
    const cor = corEscolhida();
    // Cenário e cor: o js/banner/motor.js redesenha sozinho quando data-tema ou --h mudam.
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
    const recorte = await recortarImagem(ficheiro);
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
    const recorte = await recortarImagem(ficheiro, 'banner');
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
  // Com 3 géneros escolhidos, os outros ficam desativados
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
    nome_exibicao: RegrasNomes.erroNomePessoa,   // só letras, espaços, hífen e apóstrofo (js/regras-nomes.js)
    nome: RegrasNomes.erroArroba,           // letras sem acentos, números, _ e . (js/regras-nomes.js)
    localizacao: v => v.trim().length > 40 ? 'A localização tem no máximo 40 caracteres.' : '',
    bio: v => v.length > 160 ? 'A biografia tem no máximo 160 caracteres.' : '',
  };
  // O nome fica a vermelho logo enquanto se escreve (o @nome já tem o "Disponível" ao vivo)
  ligarVerificacaoCampo(fPerfil.nome_exibicao, RegrasNomes.erroNomePessoa);
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
  ligarFormulario(fPerfil, async dados => {
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
}
