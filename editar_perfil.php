<?php
// Passo 10 – Página de edição do perfil
require 'lib.php';
$u = exigir_login();
$erros = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verificar_csrf();
    $parte = $_POST['parte'] ?? '';

    if ($parte === 'perfil') {
        $nome = campo('nome');
        $email = mb_strtolower(campo('email'));
        $bio = mb_substr(campo('bio'), 0, 160);
        $loc = mb_substr(campo('localizacao'), 0, 40);
        $cor = max(0, min(359, (int)($_POST['cor'] ?? 330)));
        $notif_email = isset($_POST['notif_email']) ? 1 : 0;
        if (!preg_match('/^[A-Za-z0-9_.]{3,20}$/', $nome)) $erros[] = 'O nome de utilizador deve ter 3 a 20 caracteres (letras, números, _ ou .).';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $erros[] = 'O email não é válido.';
        if (!$erros && valor('SELECT COUNT(*) FROM utilizadores WHERE nome = ? AND id <> ?', [$nome, $u['id']])) $erros[] = 'Esse nome de utilizador já existe.';
        if (!$erros && valor('SELECT COUNT(*) FROM utilizadores WHERE email = ? AND id <> ?', [$email, $u['id']])) $erros[] = 'Esse email já está a ser usado.';
        if (!$erros) {
            sql('UPDATE utilizadores SET nome = ?, email = ?, bio = ?, localizacao = ?, cor = ?, notif_email = ? WHERE id = ?',
                [$nome, $email, $bio, $loc, $cor, $notif_email, $u['id']]);
            aviso('Perfil atualizado.');
            ir('perfil.php?u=' . urlencode($nome));
        }
    }

    if ($parte === 'password') {
        $atual = $_POST['atual'] ?? '';
        $nova = $_POST['nova'] ?? '';
        if (!password_verify($atual, $u['password_hash'])) $erros[] = 'A palavra-passe atual está errada.';
        elseif (strlen($nova) < 8 || !preg_match('/[A-Za-z]/', $nova) || !preg_match('/\d/', $nova)) $erros[] = 'A nova palavra-passe deve ter pelo menos 8 caracteres, com letras e números.';
        elseif ($nova !== ($_POST['nova2'] ?? '')) $erros[] = 'As palavras-passe não coincidem.';
        else {
            sql('UPDATE utilizadores SET password_hash = ? WHERE id = ?', [password_hash($nova, PASSWORD_DEFAULT), $u['id']]);
            aviso('Palavra-passe alterada.');
            ir('editar_perfil.php');
        }
    }

    if ($parte === 'apagar') {
        if (!password_verify($_POST['confirmar'] ?? '', $u['password_hash'])) {
            $erros[] = 'Para apagar a conta escreve a tua palavra-passe.';
        } elseif ($u['papel'] === 'admin' && (int)valor("SELECT COUNT(*) FROM utilizadores WHERE papel = 'admin'") === 1) {
            $erros[] = 'És o único administrador: nomeia outro administrador antes de apagar a conta.';
        } else {
            sql('DELETE FROM utilizadores WHERE id = ?', [$u['id']]);
            $_SESSION = [];
            session_destroy();
            session_start();
            aviso('A tua conta foi apagada.');
            ir('index.php');
        }
    }
}

$cores = [330, 0, 25, 45, 150, 190, 215, 270];
$titulo = 'Editar perfil';
require 'cabecalho.php';
?>
<div class="content"><div class="left narrow">
  <h1 class="ph">Editar perfil</h1>
  <?php foreach ($erros as $er): ?><div class="flash erro"><?= e($er) ?></div><?php endforeach; ?>

  <form method="post" class="box form">
    <?= campo_csrf() ?><input type="hidden" name="parte" value="perfil">
    <div class="epv"><?= avatar($u, 'l') ?><div><b>Cor do avatar</b><div class="sw">
      <?php foreach ($cores as $c): ?><label><input type="radio" name="cor" value="<?= $c ?>" <?= (int)$u['cor'] === $c ? 'checked' : '' ?>><i style="background:hsl(<?= $c ?> 75% 50%)"></i></label><?php endforeach; ?>
    </div></div></div>
    <label>Nome de utilizador<input name="nome" value="<?= e($_POST['nome'] ?? $u['nome']) ?>" required maxlength="20"></label>
    <label>Email<input type="email" name="email" value="<?= e($_POST['email'] ?? $u['email']) ?>" required></label>
    <label>Localização<input name="localizacao" value="<?= e($_POST['localizacao'] ?? $u['localizacao']) ?>" maxlength="40" placeholder="Cidade"></label>
    <label>Biografia <small class="cc" data-count="bio"></small><textarea name="bio" id="bio" maxlength="160"><?= e($_POST['bio'] ?? $u['bio']) ?></textarea></label>
    <label class="chk"><input type="checkbox" name="notif_email" <?= $u['notif_email'] ? 'checked' : '' ?>> Receber as notificações também por email</label>
    <button class="btn primary">Guardar alterações</button>
  </form>

  <form method="post" class="box form">
    <h3>Alterar palavra-passe</h3>
    <?= campo_csrf() ?><input type="hidden" name="parte" value="password">
    <label>Palavra-passe atual<input type="password" name="atual" required autocomplete="current-password"></label>
    <label>Nova palavra-passe<input type="password" name="nova" required minlength="8" autocomplete="new-password"></label>
    <label>Repetir nova palavra-passe<input type="password" name="nova2" required autocomplete="new-password"></label>
    <button class="btn ghost">Alterar palavra-passe</button>
  </form>

  <form method="post" class="box form danger" data-confirm="Tens a certeza? Todos os teus dados serão apagados e não é possível recuperar.">
    <h3>Apagar conta</h3>
    <p class="muted">Apaga a conta e todos os teus dados (avaliações, listas, projetos e mensagens).</p>
    <?= campo_csrf() ?><input type="hidden" name="parte" value="apagar">
    <label>Palavra-passe<input type="password" name="confirmar" required autocomplete="current-password"></label>
    <button class="btn ghost">Apagar a minha conta</button>
  </form>
</div></div>
<?php require 'rodape.php'; ?>
