<?php
// Passo 6 – Página de login
require 'lib.php';
if (eu()) ir('index.php');

$erro = '';
$email = '';
// Proteção simples contra tentativas repetidas: 5 falhas = esperar 5 minutos
$bloqueado_ate = $_SESSION['login_espera'] ?? 0;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verificar_csrf();
    $email = mb_strtolower(campo('email'));
    $pass = $_POST['password'] ?? '';

    if ($bloqueado_ate > time()) {
        $erro = 'Demasiadas tentativas. Tenta novamente daqui a ' . ceil(($bloqueado_ate - time()) / 60) . ' min.';
    } else {
        // Aceita email ou nome de utilizador
        $u = linha('SELECT * FROM utilizadores WHERE email = ? OR nome = ?', [$email, campo('email')]);
        if ($u && password_verify($pass, $u['password_hash'])) {
            if ($u['bloqueado']) {
                $erro = 'Esta conta foi bloqueada por um administrador.';
            } else {
                session_regenerate_id(true);       // evita roubo de sessão
                $_SESSION['uid'] = (int)$u['id'];
                unset($_SESSION['login_falhas'], $_SESSION['login_espera']);
                aviso('Olá, ' . $u['nome'] . '!');
                $voltar = $_GET['voltar'] ?? 'index.php';
                ir(preg_match('#^/?[\w./?=&%-]*$#', $voltar) && !str_starts_with($voltar, '//') ? $voltar : 'index.php');
            }
        } else {
            $_SESSION['login_falhas'] = ($_SESSION['login_falhas'] ?? 0) + 1;
            if ($_SESSION['login_falhas'] >= 5) {
                $_SESSION['login_espera'] = time() + 300;
                $_SESSION['login_falhas'] = 0;
            }
            $erro = 'Email ou palavra-passe incorretos.';
        }
    }
}

$titulo = 'Entrar';
require 'cabecalho.php';
?>
<div class="content"><div class="left"><div class="authx">
  <div class="brand"><img src="logo.png" alt="TavDex"><h2>Descobre. Organiza. Avalia.</h2><p>Bem-vindo de volta.</p></div>
  <form method="post" class="fm">
    <h1>Iniciar sessão</h1>
    <?php if ($erro): ?><p class="msg"><?= e($erro) ?></p><?php endif; ?>
    <?= campo_csrf() ?>
    <input name="email" value="<?= e($email) ?>" placeholder="Email ou nome de utilizador" required autocomplete="username">
    <input type="password" name="password" placeholder="Palavra-passe" required autocomplete="current-password">
    <a href="recuperar.php" class="lk fl">Esqueceste-te da palavra-passe?</a>
    <button class="btn primary">Entrar</button>
    <small>Sem conta? <a href="registar.php" class="lk">Registar</a></small>
  </form>
</div></div></div>
<?php require 'rodape.php'; ?>
