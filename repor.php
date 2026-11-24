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
    $dono = linha('SELECT * FROM utilizadores WHERE id = ?', [$pedido['utilizador_id']]);
    if ($erro = erro_palavra_passe($pass, dados_pessoais($dono ?? []))) {
        // (a mensagem fica em $erro)
    } elseif ($pass !== ($_POST['password2'] ?? '')) {
        $erro = 'As palavras-passe não coincidem.';
    } else {
        // Quem abriu o link tem acesso ao email: fica também confirmado.
        // As sessões "Manter sessão iniciada" terminam (se alguém tinha entrado na conta, sai).
        sql('UPDATE utilizadores SET password_hash = ?, email_verificado = 1 WHERE id = ?', [password_hash($pass, PASSWORD_DEFAULT), $pedido['utilizador_id']]);
        sql('UPDATE recuperacoes SET usado = 1 WHERE utilizador_id = ?', [$pedido['utilizador_id']]);
        terminar_sessoes_lembradas((int)$pedido['utilizador_id']);
        aviso('Palavra-passe alterada. Já podes entrar.');
        ir('login.php');
    }
}

$titulo = 'Nova palavra-passe';
$com_regras = true;
require 'cabecalho.php';
?>
<div class="content"><div class="left"><div class="authx">
  <div class="brand"><img src="logo.png" alt="TavDex"><h2>Nova palavra-passe</h2></div>
  <form method="post" class="fm" data-dados-pessoais="<?= e(json_encode($valido ? dados_pessoais(linha('SELECT nome, nome_exibicao, email FROM utilizadores WHERE id = ?', [$pedido['utilizador_id']]) ?? []) : [])) ?>">
    <h1>Criar nova palavra-passe</h1>
    <?php if (!$valido): ?>
      <p class="msg">Este link é inválido ou já expirou.</p>
      <a class="btn primary" href="recuperar.php">Pedir um novo link</a>
    <?php else: ?>
      <?php if ($erro): ?><p class="msg"><?= e($erro) ?></p><?php endif; ?>
      <?= campo_csrf() ?>
      <div class="campo-pw"><input type="password" name="password" placeholder="Nova palavra-passe" required minlength="10" autocomplete="new-password" data-pw-nova><button type="button" class="ver-pw" data-ver-pw>Ver</button></div>
      <?= lista_requisitos() ?>
      <div class="campo-pw"><input type="password" name="password2" placeholder="Repetir palavra-passe" required autocomplete="new-password" data-pw-repetir><button type="button" class="ver-pw" data-ver-pw>Ver</button></div>
      <small class="nota-campo" data-pw-iguais></small>
      <button class="btn primary">Guardar</button>
    <?php endif; ?>
  </form>
</div></div></div>
<?php require 'rodape.php'; ?>
