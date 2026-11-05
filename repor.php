<?php
// Passo 5 – Página de registo
require 'lib.php';
if (eu()) ir('index.php');

$erros = [];
$nome = $email = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verificar_csrf();
    $nome = campo('nome');
    $email = mb_strtolower(campo('email'));
    $pass = $_POST['password'] ?? '';
    $pass2 = $_POST['password2'] ?? '';

    // Validações
    if (!preg_match('/^[A-Za-z0-9_.]{3,20}$/', $nome)) $erros[] = 'O nome de utilizador deve ter 3 a 20 caracteres (letras, números, _ ou .).';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $erros[] = 'O email não é válido.';
    if (strlen($pass) < 8 || !preg_match('/[A-Za-z]/', $pass) || !preg_match('/\d/', $pass)) $erros[] = 'A palavra-passe deve ter pelo menos 8 caracteres, com letras e números.';
    if ($pass !== $pass2) $erros[] = 'As palavras-passe não coincidem.';
    if (!$erros && valor('SELECT COUNT(*) FROM utilizadores WHERE nome = ?', [$nome])) $erros[] = 'Esse nome de utilizador já existe.';
    if (!$erros && valor('SELECT COUNT(*) FROM utilizadores WHERE email = ?', [$email])) $erros[] = 'Já existe uma conta com esse email.';
    // Anti-spam: armadilha para robôs e, no site inteiro, no máximo 20 contas novas em 10 minutos
    if (caiu_na_armadilha()) $erros[] = 'Não foi possível criar a conta.';
    elseif (!$erros && (int)valor('SELECT COUNT(*) FROM utilizadores WHERE criado_em >= ?', [date('Y-m-d H:i:s', time() - 600)]) >= 20) $erros[] = 'Há muitos registos neste momento. Tenta outra vez daqui a alguns minutos.';

    if (!$erros) {
        sql('INSERT INTO utilizadores (nome, email, password_hash, cor, criado_em) VALUES (?, ?, ?, ?, ?)',
            [$nome, $email, password_hash($pass, PASSWORD_DEFAULT), random_int(0, 359), agora()]);
        session_regenerate_id(true);
        $_SESSION['uid'] = (int)bd()->lastInsertId();
        aviso('Conta criada. Bem-vindo ao TavDex, ' . $nome . '!');
        ir('index.php');
    }
}

$titulo = 'Criar conta';
require 'cabecalho.php';
?>
<div class="content"><div class="left"><div class="authx">
  <div class="brand"><img src="logo.png" alt="TavDex"><h2>Descobre. Organiza. Avalia.</h2><p>Junta-te à comunidade.</p></div>
  <form method="post" class="fm" novalidate>
    <h1>Criar conta</h1>
    <?php foreach ($erros as $er): ?><p class="msg"><?= e($er) ?></p><?php endforeach; ?>
    <?= campo_csrf() ?><?= campo_armadilha() ?>
    <input name="nome" value="<?= e($nome) ?>" placeholder="Nome de utilizador" required maxlength="20" autocomplete="username">
    <input type="email" name="email" value="<?= e($email) ?>" placeholder="Email" required autocomplete="email">
    <input type="password" name="password" placeholder="Palavra-passe (mín. 8, letras e números)" required minlength="8" autocomplete="new-password">
    <input type="password" name="password2" placeholder="Repetir palavra-passe" required autocomplete="new-password">
    <button class="btn primary">Registar</button>
    <small>Já tens conta? <a href="login.php" class="lk">Entrar</a></small>
  </form>
</div></div></div>
<?php require 'rodape.php'; ?>
