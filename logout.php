<?php
// Passo 7 – Logout
// Termina a sessão por POST (com token CSRF), para que um link de outro site
// não consiga terminar a sessão de ninguém. Se o token já não for válido
// (por exemplo, a página esteve aberta muito tempo), mostra um botão de confirmação.
require 'lib.php';

/** Apaga a sessão atual e começa uma nova, vazia. */
function terminar_sessao(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 3600, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
    session_start();
    session_regenerate_id(true);
}

// Sem sessão iniciada não há nada a terminar
if (!eu()) {
    ir('index.php');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && hash_equals(token_csrf(), $_POST['csrf'] ?? '')) {
    terminar_sessao();
    aviso('Sessão terminada. Até breve!');
    ir('index.php');
}

// Token em falta ou expirado: pede confirmação com um formulário novo
$titulo = 'Terminar sessão';
require 'cabecalho.php';
?>
<div class="content"><div class="left narrow">
  <div class="box form" style="text-align:center;align-items:center;padding:40px">
    <h1 class="ph" style="margin:0">Terminar sessão?</h1>
    <p class="muted">Vais sair da conta <b><?= e(eu()['nome']) ?></b>.</p>
    <form method="post" class="btns"><?= campo_csrf() ?>
      <button class="btn primary">Terminar sessão</button>
      <a class="btn ghost" href="index.php">Cancelar</a>
    </form>
  </div>
</div></div>
<?php require 'rodape.php'; ?>
