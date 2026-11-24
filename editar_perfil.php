<?php
// =====================================================================
//  Passo 10 – Definições (edição do perfil e da conta) – só o próprio utilizador
//   Separador "Perfil": foto, cor, banner (cenário ou imagem própria), nome, @nome,
//     localização, biografia, géneros favoritos, privacidade e notificações,
//     com pré-visualização ao vivo e aviso de alterações por guardar (main.js).
//   Separador "Conta e segurança" (?tab=seguranca): proteção da conta, email
//     (com confirmação por link), palavra-passe, Google, sessões e apagar a conta.
//  Cada formulário envia um campo "op" e o switch decide o que fazer.
// =====================================================================
require 'lib.php';
$u = exigir_login();
$erros = [];
$aba = ($_GET['tab'] ?? '') === 'seguranca' ? 'seguranca' : 'perfil';
$tem_password = !empty($u['password_hash']);

/** Confirma a palavra-passe atual (as contas só do Google não têm, por isso passam). */
function password_certa(array $u): bool
{
    return empty($u['password_hash']) || password_verify($_POST['atual'] ?? '', $u['password_hash']);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verificar_csrf();
    $op = $_POST['op'] ?? '';
    if ($op !== 'perfil') $aba = 'seguranca';

    switch ($op) {
        // -----------------------------------------------------------------
        // Separador Perfil
        // -----------------------------------------------------------------
        case 'perfil':
            $nome = campo('nome');
            $nome_exibicao = mb_substr(preg_replace('/\s+/', ' ', campo('nome_exibicao')), 0, 50);
            $bio = mb_substr(campo('bio'), 0, 160);
            $loc = mb_substr(campo('localizacao'), 0, 40);
            $cor = cor_valida($_POST['cor'] ?? 330);
            $tema = tema_valido($_POST['tema_banner'] ?? null);
            $generos = array_slice(array_unique(array_map('intval', (array)($_POST['generos'] ?? []))), 0, 3);   // no máximo 3
            if (!preg_match('/^[A-Za-z0-9_.]{3,20}$/', $nome)) $erros[] = 'O nome de utilizador deve ter 3 a 20 caracteres (letras, números, _ ou .).';
            if ($nome_exibicao !== '' && !preg_match('/^[\p{L}][\p{L} \'.-]{1,49}$/u', $nome_exibicao)) $erros[] = 'O nome só pode ter letras e espaços (2 a 50 caracteres).';
            if (!$erros && valor('SELECT COUNT(*) FROM utilizadores WHERE nome = ? AND id <> ?', [$nome, $u['id']])) $erros[] = 'Esse nome de utilizador já existe.';
            // Imagens: o browser já as recortou; aqui confirma-se e grava-se em JPEG
            [$foto, $erro_foto] = ficheiro_imagem('foto');
            [$banner, $erro_banner] = ficheiro_imagem('banner');
            if ($erro_foto) $erros[] = 'Foto: ' . $erro_foto;
            if ($erro_banner) $erros[] = 'Banner: ' . $erro_banner;
            if ($foto && !($foto = recortar_imagem($foto, 512, 512))) $erros[] = 'Não foi possível ler a foto.';
            if ($banner && !($banner = recortar_imagem($banner, 1500, 500))) $erros[] = 'Não foi possível ler a imagem do banner.';
            if ($erros) break;

            sql('UPDATE utilizadores SET nome = ?, nome_exibicao = ?, bio = ?, localizacao = ?, cor = ?, tema_banner = ?, mostrar_listas = ?, mostrar_seguidores = ?, notif_email = ? WHERE id = ?',
                [$nome, $nome_exibicao ?: null, $bio, $loc, $cor, $tema, isset($_POST['mostrar_listas']) ? 1 : 0, isset($_POST['mostrar_seguidores']) ? 1 : 0, isset($_POST['notif_email']) ? 1 : 0, $u['id']]);
            // A versão muda sempre que a imagem muda (o endereço muda e o browser não mostra a antiga)
            if ($foto) sql('UPDATE utilizadores SET foto = ?, foto_versao = ? WHERE id = ?', [$foto, time(), $u['id']]);
            elseif (isset($_POST['remover_foto'])) sql('UPDATE utilizadores SET foto = NULL, foto_versao = 0 WHERE id = ?', [$u['id']]);
            if ($banner) sql('UPDATE utilizadores SET banner = ?, banner_versao = ? WHERE id = ?', [$banner, time(), $u['id']]);
            elseif (isset($_POST['remover_banner'])) sql('UPDATE utilizadores SET banner = NULL, banner_versao = 0 WHERE id = ?', [$u['id']]);
            // Géneros favoritos (só os que existem)
            sql('DELETE FROM utilizador_generos WHERE utilizador_id = ?', [$u['id']]);
            foreach ($generos as $g) {
                if (valor('SELECT COUNT(*) FROM generos WHERE id = ?', [$g])) sql('INSERT INTO utilizador_generos (utilizador_id, genero_id) VALUES (?, ?)', [$u['id'], $g]);
            }
            aviso('Perfil atualizado.');
            ir('perfil.php?u=' . urlencode($nome));

        // -----------------------------------------------------------------
        // Separador Conta e segurança
        // -----------------------------------------------------------------
        // Mudar o email: o novo só passa a valer depois de confirmado pelo link
        case 'email':
            $email = mb_strtolower(campo('email'));
            if (!password_certa($u)) $erros[] = 'A palavra-passe atual está errada.';
            elseif ($email === $u['email']) $erros[] = 'Esse já é o email da tua conta.';
            elseif ($erro = erro_email($email)) $erros[] = $erro;
            elseif (valor('SELECT COUNT(*) FROM utilizadores WHERE (email = ? OR email_pendente = ?) AND id <> ?', [$email, $email, $u['id']])) $erros[] = 'Esse email já está a ser usado.';
            elseif (!($limite = limite_envios((int)$u['id']))['pode']) $erros[] = $limite['motivo'];
            if ($erros) break;
            sql('UPDATE utilizadores SET email_pendente = ? WHERE id = ?', [$email, $u['id']]);
            enviar_confirmacao($u, $email, 'mudanca');
            aviso('Enviámos um link para ' . esconder_email($email) . '. O email só muda depois de o confirmares.');
            ir('editar_perfil.php?tab=seguranca');

        case 'cancelar_email':
            sql('UPDATE utilizadores SET email_pendente = NULL WHERE id = ?', [$u['id']]);
            sql('UPDATE verificacao_email SET usado = 1 WHERE utilizador_id = ?', [$u['id']]);
            aviso('Mudança de email cancelada.');
            ir('editar_perfil.php?tab=seguranca');

        // Alterar (ou, nas contas do Google, definir) a palavra-passe
        case 'password':
            $nova = $_POST['nova'] ?? '';
            if (!password_certa($u)) $erros[] = 'A palavra-passe atual está errada.';
            elseif ($erro = erro_palavra_passe($nova, dados_pessoais($u))) $erros[] = $erro;
            elseif ($nova !== ($_POST['nova2'] ?? '')) $erros[] = 'As palavras-passe não coincidem.';
            if ($erros) break;
            sql('UPDATE utilizadores SET password_hash = ? WHERE id = ?', [password_hash($nova, PASSWORD_DEFAULT), $u['id']]);
            if (isset($_POST['terminar_outras'])) terminar_sessoes_lembradas((int)$u['id'], true);
            aviso($tem_password ? 'Palavra-passe alterada.' : 'Palavra-passe definida. Já podes entrar também com o email e a palavra-passe.');
            ir('editar_perfil.php?tab=seguranca');

        // Desligar o Google (só com palavra-passe: senão a conta ficava sem forma de entrar)
        case 'google_desligar':
            if (!$tem_password) $erros[] = 'Define primeiro uma palavra-passe. Sem ela e sem o Google ficavas sem forma de entrar.';
            else {
                sql('UPDATE utilizadores SET google_id = NULL, google_email = NULL WHERE id = ?', [$u['id']]);
                aviso('Conta Google desligada.');
                ir('editar_perfil.php?tab=seguranca');
            }
            break;

        // Terminar a sessão nos outros dispositivos ("Manter sessão iniciada")
        case 'sessoes':
            terminar_sessoes_lembradas((int)$u['id'], true);
            aviso('Sessão terminada nos outros dispositivos.');
            ir('editar_perfil.php?tab=seguranca');

        // Apagar a conta: pede a palavra-passe (ou, sem ela, escrever o @nome)
        case 'apagar':
            $confirmado = $tem_password ? password_verify($_POST['confirmar'] ?? '', $u['password_hash']) : trim($_POST['confirmar'] ?? '') === '@' . $u['nome'];
            if (!$confirmado) {
                $erros[] = $tem_password ? 'Para apagar a conta escreve a tua palavra-passe.' : 'Para apagar a conta escreve @' . $u['nome'] . '.';
            } elseif ($u['papel'] === 'admin' && (int)valor("SELECT COUNT(*) FROM utilizadores WHERE papel = 'admin'") === 1) {
                $erros[] = 'És o único administrador: nomeia outro administrador antes de apagar a conta.';
            } else {
                sql('DELETE FROM utilizadores WHERE id = ?', [$u['id']]);
                apagar_cookie_lembrar();
                $_SESSION = [];
                session_destroy();
                session_start();
                aviso('A tua conta foi apagada.');
                ir('index.php');
            }
            break;
    }
}

// ---------------------------------------------------------------------
// Dados da página
// ---------------------------------------------------------------------
$cores = [330, 0, 25, 45, 150, 190, 215, 270];
$generos = linhas('SELECT id, nome FROM generos ORDER BY nome');
$meus_generos = array_column(linhas('SELECT genero_id FROM utilizador_generos WHERE utilizador_id = ?', [$u['id']]), 'genero_id');
if (isset($_POST['op']) && $_POST['op'] === 'perfil') $meus_generos = array_map('intval', (array)($_POST['generos'] ?? []));
$v = fn($campo) => $_POST[$campo] ?? ($u[$campo] ?? '');   // valor do campo (o escrito, se houve erro)
$outras_sessoes = (int)valor('SELECT COUNT(*) FROM sessoes_lembradas WHERE utilizador_id = ?' . (!empty($_SESSION['seletor']) ? ' AND seletor <> ?' : ''),
    !empty($_SESSION['seletor']) ? [$u['id'], $_SESSION['seletor']] : [$u['id']]);
$contagens = [
    'seguidores' => valor('SELECT COUNT(*) FROM seguidores WHERE seguido_id = ?', [$u['id']]),
    'a_seguir' => valor('SELECT COUNT(*) FROM seguidores WHERE seguidor_id = ?', [$u['id']]),
    'avaliacoes' => valor('SELECT COUNT(*) FROM avaliacoes WHERE utilizador_id = ?', [$u['id']]),
    'vistos' => valor("SELECT COUNT(*) FROM listas WHERE utilizador_id = ? AND tipo = 'visto'", [$u['id']]),
    'projetos' => valor('SELECT COUNT(*) FROM projetos WHERE dono_id = ?', [$u['id']]),
];
/** Linha da proteção da conta (✓ verde ou ! amarelo). */
$marca = fn(bool $bom, string $texto) => '<li class="' . ($bom ? 'ok' : 'aviso') . '"><b aria-hidden="true">' . ($bom ? '✓' : '!') . '</b> ' . $texto . '</li>';

$titulo = 'Definições';
$com_banner = true;
$com_regras = true;
require 'cabecalho.php';
?>
<div class="content"><div class="left">
  <h1 class="ph">Definições</h1>
  <?php foreach ($erros as $er): ?><div class="flash erro"><?= e($er) ?></div><?php endforeach; ?>

  <div class="tabsbox">
    <div class="tabs">
      <button data-tab="perfil" class="<?= $aba === 'perfil' ? 'on' : '' ?>">Perfil</button>
      <button data-tab="seguranca" class="<?= $aba === 'seguranca' ? 'on' : '' ?>">Conta e segurança</button>
    </div>

    <!-- ================= Separador Perfil ================= -->
    <div data-pane="perfil" <?= $aba === 'perfil' ? '' : 'hidden' ?>>
      <div class="def-cols">
        <form method="post" enctype="multipart/form-data" class="box form" data-def-perfil>
          <?= campo_csrf() ?><input type="hidden" name="op" value="perfil">

          <b>Foto de perfil</b>
          <div class="foto-campo">
            <label class="btn ghost sm">Escolher foto<input type="file" name="foto" accept="image/jpeg,image/png,image/webp" hidden data-imagem="foto" data-tamanho="512x512"></label>
            <?php if ($u['foto_versao']): ?><label class="chk"><input type="checkbox" name="remover_foto" data-remover="foto"> Remover a foto</label><?php endif; ?>
            <small class="muted">JPG, PNG ou WebP. É recortada ao centro, em quadrado.</small>
          </div>

          <b>Cor do avatar e do letreiro do banner</b>
          <div class="sw">
            <?php foreach ($cores as $c): ?><label title="Cor <?= $c ?>"><input type="radio" name="cor" value="<?= $c ?>" <?= (int)$v('cor') === $c ? 'checked' : '' ?>><i style="background:hsl(<?= $c ?> 75% 50%)"></i></label><?php endforeach; ?>
            <?php if (!in_array((int)$u['cor'], $cores, true)): ?><label title="A tua cor"><input type="radio" name="cor" value="<?= (int)$u['cor'] ?>" <?= (int)$v('cor') === (int)$u['cor'] ? 'checked' : '' ?>><i style="background:hsl(<?= (int)$u['cor'] ?> 75% 50%)"></i></label><?php endif; ?>
          </div>

          <b>Banner do perfil</b>
          <div class="temas-banner" role="radiogroup" aria-label="Cenário do banner" style="--h:<?= cor_valida($v('cor')) ?>" data-temas>
            <?php foreach (TEMAS_BANNER as $tema => $nome_tema): ?>
              <label class="tema-op"><input type="radio" name="tema_banner" value="<?= $tema ?>" <?= tema_valido($v('tema_banner')) === $tema ? 'checked' : '' ?>>
                <span class="tema-op__caixa"><span class="pbanner pbanner--mini" data-tema="<?= $tema ?>" aria-hidden="true"></span><span class="tema-op__nome"><?= $nome_tema ?></span></span></label>
            <?php endforeach; ?>
          </div>
          <div class="foto-campo">
            <label class="btn ghost sm">Usar uma imagem minha<input type="file" name="banner" accept="image/jpeg,image/png,image/webp" hidden data-imagem="banner" data-tamanho="1500x500"></label>
            <?php if ($u['banner_versao']): ?><label class="chk"><input type="checkbox" name="remover_banner" data-remover="banner"> Remover a imagem (usar o cenário)</label><?php endif; ?>
            <small class="muted">A imagem tapa o cenário. É recortada ao centro, na proporção 3:1.</small>
          </div>

          <label>Nome<input name="nome_exibicao" value="<?= e($v('nome_exibicao')) ?>" maxlength="50" placeholder="Ex.: Duarte Tavares" autocomplete="name" data-pre="nome"></label>
          <label>@nome de utilizador<input name="nome" value="<?= e($v('nome')) ?>" required maxlength="20" autocomplete="username" data-pre="arroba"></label>
          <label>Localização<input name="localizacao" value="<?= e($v('localizacao')) ?>" maxlength="40" placeholder="Ex.: Lisboa" data-pre="local"></label>
          <label>Biografia <small class="cc" data-count="bio"></small><textarea name="bio" id="bio" maxlength="160" data-pre="bio"><?= e($v('bio')) ?></textarea></label>

          <b>Géneros favoritos <small class="muted">(até 3, aparecem no perfil e ajudam as recomendações)</small></b>
          <div class="generos-op" data-max="3">
            <?php foreach ($generos as $g): ?><label class="chip"><input type="checkbox" name="generos[]" value="<?= $g['id'] ?>" <?= in_array((int)$g['id'], array_map('intval', $meus_generos), true) ? 'checked' : '' ?>><span><?= e($g['nome']) ?></span></label><?php endforeach; ?>
          </div>

          <b>Privacidade e notificações</b>
          <label class="chk"><input type="checkbox" name="mostrar_listas" <?= $v('mostrar_listas') ? 'checked' : '' ?>> Mostrar os meus favoritos, para ver e vistos no perfil</label>
          <label class="chk"><input type="checkbox" name="mostrar_seguidores" <?= $v('mostrar_seguidores') ? 'checked' : '' ?>> Mostrar quem sigo e quem me segue</label>
          <label class="chk"><input type="checkbox" name="notif_email" <?= $v('notif_email') ? 'checked' : '' ?>> Receber as notificações também por email</label>

          <button class="btn primary">Guardar alterações</button>
        </form>

        <div class="pre-perfil">
          <small class="muted">Assim é que os outros veem o teu perfil</small>
          <?= cabecalho_perfil($u, ['id' => 'pre-perfil', 'contagens' => $contagens]) ?>
        </div>
      </div>
    </div>

    <!-- ================= Separador Conta e segurança ================= -->
    <div data-pane="seguranca" <?= $aba === 'seguranca' ? '' : 'hidden' ?>>
      <div class="box">
        <h3>Proteção da conta</h3>
        <ul class="protecao">
          <?= $marca((bool)$u['email_verificado'], $u['email_verificado'] ? 'Email confirmado' : 'Email por confirmar') ?>
          <?= $marca($tem_password, $tem_password ? 'Palavra-passe definida' : 'Sem palavra-passe (entras só com o Google)') ?>
          <?= $marca((bool)$u['google_id'], $u['google_id'] ? 'Conta Google ligada' : 'Conta Google não ligada (opcional)') ?>
          <li class="info"><b aria-hidden="true">i</b> Último login: <?= $u['ultimo_login'] ? date('d/m/Y H:i', strtotime($u['ultimo_login'])) : '–' ?></li>
        </ul>
      </div>

      <form method="post" class="box form">
        <h3>Email</h3>
        <?= campo_csrf() ?><input type="hidden" name="op" value="email">
        <?php if ($u['email_pendente']): ?>
          <p class="email-pendente">À espera de confirmação: <b><?= e($u['email_pendente']) ?></b>. Abre o link que enviámos para esse email.</p>
        <?php endif; ?>
        <label>Email<input type="email" name="email" value="<?= e($_POST['email'] ?? $u['email']) ?>" required maxlength="120" autocomplete="email" data-email></label>
        <small class="nota-campo" data-sugestao-email></small>
        <?php if ($tem_password): ?><label>Palavra-passe atual<input type="password" name="atual" required autocomplete="current-password"></label><?php endif; ?>
        <small class="muted">O email novo só passa a valer depois de carregares no link que te enviamos.</small>
        <button class="btn ghost">Mudar o email</button>
      </form>
      <?php if ($u['email_pendente']): ?>
        <form method="post" class="inline"><?= campo_csrf() ?><input type="hidden" name="op" value="cancelar_email"><button class="btn ghost sm">Cancelar a mudança de email</button></form>
      <?php endif; ?>

      <form method="post" class="box form" data-dados-pessoais="<?= e(json_encode(dados_pessoais($u))) ?>">
        <h3><?= $tem_password ? 'Alterar palavra-passe' : 'Definir palavra-passe' ?></h3>
        <?= campo_csrf() ?><input type="hidden" name="op" value="password">
        <input type="text" name="username" value="<?= e($u['nome']) ?>" autocomplete="username" hidden>
        <?php if ($tem_password): ?><label>Palavra-passe atual<input type="password" name="atual" required autocomplete="current-password"></label><?php endif; ?>
        <label>Nova palavra-passe<span class="campo-pw"><input type="password" name="nova" required minlength="10" autocomplete="new-password" data-pw-nova><button type="button" class="ver-pw" data-ver-pw>Ver</button></span></label>
        <?= lista_requisitos() ?>
        <label>Repetir nova palavra-passe<input type="password" name="nova2" required autocomplete="new-password" data-pw-repetir></label>
        <small class="nota-campo" data-pw-iguais></small>
        <label class="chk"><input type="checkbox" name="terminar_outras" checked> Terminar a sessão nos outros dispositivos</label>
        <button class="btn ghost"><?= $tem_password ? 'Alterar palavra-passe' : 'Definir palavra-passe' ?></button>
      </form>

      <div class="box conta-ligada">
        <h3>Contas ligadas</h3>
        <div class="row-between">
          <span class="cl-nome"><?= logo_google() ?><span><b>Google</b><br><small class="muted"><?= $u['google_id'] ? e($u['google_email']) : 'Não ligada' ?></small></span></span>
          <?php if ($u['google_id']): ?>
            <form method="post" class="inline"><?= campo_csrf() ?><input type="hidden" name="op" value="google_desligar"><button class="btn ghost sm" <?= $tem_password ? '' : 'disabled title="Define primeiro uma palavra-passe"' ?>>Desligar</button></form>
          <?php else: ?>
            <a class="btn ghost sm" href="google.php?modo=ligar">Ligar</a>
          <?php endif; ?>
        </div>
      </div>

      <div class="box">
        <h3>Sessões</h3>
        <p class="muted"><?= $outras_sessoes ? 'Tens "Manter sessão iniciada" em ' . $outras_sessoes . ' outro' . ($outras_sessoes > 1 ? 's' : '') . ' dispositivo' . ($outras_sessoes > 1 ? 's' : '') . '.' : 'Não tens sessões guardadas noutros dispositivos.' ?></p>
        <?php if ($outras_sessoes): ?>
          <form method="post" class="inline"><?= campo_csrf() ?><input type="hidden" name="op" value="sessoes"><button class="btn ghost sm">Terminar a sessão nos outros dispositivos</button></form>
        <?php endif; ?>
      </div>

      <form method="post" class="box form danger" data-confirm="Tens a certeza? Todos os teus dados serão apagados e não é possível recuperar.">
        <h3>Apagar conta</h3>
        <p class="muted">Apaga a conta e todos os teus dados (avaliações, listas, projetos e mensagens).</p>
        <?= campo_csrf() ?><input type="hidden" name="op" value="apagar">
        <?php if ($tem_password): ?>
          <label>Palavra-passe<input type="password" name="confirmar" required autocomplete="current-password"></label>
        <?php else: ?>
          <label>Para confirmar, escreve <b>@<?= e($u['nome']) ?></b><input name="confirmar" required autocomplete="off"></label>
        <?php endif; ?>
        <button class="btn ghost">Apagar a minha conta</button>
      </form>
    </div>
  </div>
</div></div>
<?php require 'rodape.php'; ?>
