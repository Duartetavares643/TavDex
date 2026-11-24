<?php
// Passo 6 – Página de login
//  · entra com o email ou o @nome e a palavra-passe, ou com o Google (google.php);
//  · "Manter sessão iniciada": fica com sessão durante 30 dias neste browser (contas.php);
//  · contas com o email ainda por confirmar vão para confirmar_email.php.
require 'lib.php';
if (eu()) ir('index.php');

$erro = '';
$email = '';
// Proteção simples contra tentativas repetidas: 5 falhas = esperar 5 minutos
$bloqueado_ate = $_SESSION['login_espera'] ?? 0;
// Só volta para páginas do próprio site
$voltar = $_GET['voltar'] ?? 'index.php';
if (!preg_match('#^/?[\w./?=&%-]*$#', $voltar) || str_starts_with($voltar, '//')) $voltar = 'index.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verificar_csrf();
    $email = mb_strtolower(campo('email'));
    $pass = $_POST['password'] ?? '';

    if ($bloqueado_ate > time()) {
        $erro = 'Demasiadas tentativas. Tenta novamente daqui a ' . ceil(($bloqueado_ate - time()) / 60) . ' min.';
    } else {
        // Aceita email ou nome de utilizador
        $u = linha('SELECT * FROM utilizadores WHERE email = ? OR nome = ?', [$email, campo('email')]);
        // Contas criadas só com o Google não têm palavra-passe (password_hash vazio)
        if ($u && $u['password_hash'] && password_verify($pass, $u['password_hash'])) {
            if ($u['bloqueado']) {
                $erro = 'Esta conta foi bloqueada por um administrador.';
            } elseif (!$u['email_verificado']) {
                // Ainda não confirmou o email: mostra a página para reenviar o link
                $_SESSION['por_confirmar'] = (int)$u['id'];
                aviso('Confirma primeiro o teu email: abre o link que te enviámos.', 'erro');
                ir('confirmar_email.php');
            } else {
                iniciar_sessao($u, isset($_POST['manter']));
                aviso('Olá, ' . nome_visivel($u) . '!');
                ir($voltar);
            }
        } else {
            $_SESSION['login_falhas'] = ($_SESSION['login_falhas'] ?? 0) + 1;
            if ($_SESSION['login_falhas'] >= 5) {
                $_SESSION['login_espera'] = time() + 300;
                $_SESSION['login_falhas'] = 0;
            }
            $erro = $u && !$u['password_hash'] && $u['google_id']
                ? 'Esta conta foi criada com o Google: usa o botão "Continuar com Google".'
                : 'Email ou palavra-passe incorretos.';
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
    <?= botao_google('Continuar com Google', $voltar) ?>
    <div class="sep-ou">ou</div>
    <?= campo_csrf() ?>
    <input name="email" value="<?= e($email) ?>" placeholder="Email ou nome de utilizador" required autocomplete="username">
    <div class="campo-pw"><input type="password" name="password" placeholder="Palavra-passe" required autocomplete="current-password"><button type="button" class="ver-pw" data-ver-pw>Ver</button></div>
    <label class="chk"><input type="checkbox" name="manter" data-manter> Manter sessão iniciada</label>
    <a href="recuperar.php" class="lk fl">Esqueceste-te da palavra-passe?</a>
    <button class="btn primary">Entrar</button>
    <small>Sem conta? <a href="registar.php" class="lk">Registar</a></small>
  </form>
</div></div></div>
<?php require 'rodape.php'; ?>
