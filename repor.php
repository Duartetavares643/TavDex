<?php
// Passo 8 – Recuperação da palavra-passe por email (definir a nova palavra-passe a partir do link)
require 'lib.php';

$token = $_GET['token'] ?? '';
$pedido = $token ? linha('SELECT * FROM recuperacoes WHERE token_hash = ? AND usado = 0', [hash('sha256', $token)]) : null;
$valido = $pedido && strtotime($pedido['expira_em']) > time();
$erro = '';

if ($valido && $_SERVER['REQUEST_METHOD'] === 'POST') {
    verificar_csrf();
    $pass = $_POST['password'] ?? '';
    if (strlen($pass) < 8 || !preg_match('/[A-Za-z]/', $pass) || !preg_match('/\d/', $pass)) {
        $erro = 'A palavra-passe deve ter pelo menos 8 caracteres, com letras e números.';
    } elseif ($pass !== ($_POST['password2'] ?? '')) {
        $erro = 'As palavras-passe não coincidem.';
    } else {
        sql('UPDATE utilizadores SET password_hash = ? WHERE id = ?', [password_hash($pass, PASSWORD_DEFAULT), $pedido['utilizador_id']]);
        sql('UPDATE recuperacoes SET usado = 1 WHERE utilizador_id = ?', [$pedido['utilizador_id']]);
        aviso('Palavra-passe alterada. Já podes entrar.');
        ir('login.php');
    }
}

$titulo = 'Nova palavra-passe';
require 'cabecalho.php';
?>
<div class="content"><div class="left"><div class="authx">
  <div class="brand"><img src="logo.png" alt="TavDex"><h2>Nova palavra-passe</h2></div>
  <form method="post" class="fm">
    <h1>Criar nova palavra-passe</h1>
    <?php if (!$valido): ?>
      <p class="msg">Este link é inválido ou já expirou.</p>
      <a class="btn primary" href="recuperar.php">Pedir um novo link</a>
    <?php else: ?>
      <?php if ($erro): ?><p class="msg"><?= e($erro) ?></p><?php endif; ?>
      <?= campo_csrf() ?>
      <input type="password" name="password" placeholder="Nova palavra-passe" required minlength="8" autocomplete="new-password">
      <input type="password" name="password2" placeholder="Repetir palavra-passe" required autocomplete="new-password">
      <button class="btn primary">Guardar</button>
    <?php endif; ?>
  </form>
</div></div></div>
<?php require 'rodape.php'; ?>
