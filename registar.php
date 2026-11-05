<?php
// Passo 8 – Recuperação de login (pedido do link por email)
require 'lib.php';

$enviado = false;
$link_dev = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verificar_csrf();
    $email = mb_strtolower(campo('email'));
    $u = linha('SELECT id, nome, email FROM utilizadores WHERE email = ?', [$email]);
    if ($u) {
        // Token aleatório: só a versão em hash fica na base de dados
        $token = bin2hex(random_bytes(32));
        sql('UPDATE recuperacoes SET usado = 1 WHERE utilizador_id = ?', [$u['id']]);
        sql('INSERT INTO recuperacoes (utilizador_id, token_hash, expira_em) VALUES (?, ?, ?)',
            [$u['id'], hash('sha256', $token), date('Y-m-d H:i:s', time() + 3600)]);
        $link = URL_SITE . '/repor.php?token=' . $token;
        if (MODO_DEV) {
            $link_dev = 'repor.php?token=' . $token;
        } else {
            enviar_email($u['email'], 'Recuperar palavra-passe – TavDex',
                "Olá {$u['nome']},\n\nPara criares uma nova palavra-passe abre este link (válido 1 hora):\n$link\n\nSe não foste tu, ignora este email.");
        }
    }
    // A mensagem é sempre igual para não revelar que emails existem
    $enviado = true;
}

$titulo = 'Recuperar palavra-passe';
require 'cabecalho.php';
?>
<div class="content"><div class="left"><div class="authx">
  <div class="brand"><img src="logo.png" alt="TavDex"><h2>Recuperar palavra-passe</h2><p>Enviamos-te um link por email.</p></div>
  <form method="post" class="fm">
    <h1>Esqueceste-te da palavra-passe?</h1>
    <?php if ($enviado): ?>
      <p class="ok-msg">Se existir uma conta com este email, enviámos um link para repor a palavra-passe. O link é válido durante 1 hora.</p>
      <?php if ($link_dev): ?><p class="dev">Modo de desenvolvimento (sem servidor de email): <a class="lk" href="<?= e($link_dev) ?>">abrir o link de recuperação</a></p><?php endif; ?>
    <?php else: ?>
      <p class="muted">Indica o email da tua conta e enviamos um link para criares uma nova palavra-passe.</p>
    <?php endif; ?>
    <?= campo_csrf() ?>
    <input type="email" name="email" placeholder="Email" required>
    <button class="btn primary">Enviar link</button>
    <small><a href="login.php" class="lk">← Voltar a iniciar sessão</a></small>
  </form>
</div></div></div>
<?php require 'rodape.php'; ?>
