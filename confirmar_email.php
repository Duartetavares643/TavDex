<?php
// =====================================================================
//  Confirmação do email por link (registo e mudança de email)
//   confirmar_email.php              "Quase pronto! Enviámos um link para d•••••@gmail.com"
//   confirmar_email.php?token=...    o link do email: mostra o botão "Confirmar email"
//
//  Segurança:
//   · o token tem 32 bytes aleatórios; na base de dados fica só o hash SHA-256;
//   · vale 24 horas e só uma vez; um envio novo anula os links anteriores;
//   · a confirmação é feita com um botão (POST), para os antivírus de email
//     que abrem os links sozinhos não gastarem o token;
//   · no máximo 5 envios por hora, com 60 segundos entre envios (contas.php).
// =====================================================================
require 'lib.php';

/** O link é válido? Devolve [pedido, conta, tipo] ou null. */
function pedido_valido(string $token): ?array
{
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) return null;
    $p = linha('SELECT * FROM verificacao_email WHERE token_hash = ? AND usado = 0', [hash('sha256', $token)]);
    if (!$p || strtotime($p['expira_em']) < time()) return null;
    $u = linha('SELECT * FROM utilizadores WHERE id = ?', [$p['utilizador_id']]);
    if (!$u || $u['bloqueado']) return null;
    if ($p['email'] === $u['email'] && !$u['email_verificado']) return [$p, $u, 'registo'];
    if ($u['email_pendente'] && $p['email'] === $u['email_pendente']) return [$p, $u, 'mudanca'];
    return null;
}

/** Conta "por confirmar" guardada na sessão depois do registo (ou de um login por confirmar). */
function conta_da_sessao(): ?array
{
    $id = $_SESSION['por_confirmar'] ?? 0;
    $u = $id ? linha('SELECT * FROM utilizadores WHERE id = ?', [$id]) : null;
    return $u && !$u['email_verificado'] && !$u['bloqueado'] ? $u : null;
}

$token = $_GET['token'] ?? ($_POST['token'] ?? '');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verificar_csrf();
    $op = $_POST['op'] ?? '';

    // Confirmar (botão da página do link)
    if ($op === 'confirmar') {
        $r = pedido_valido($token);
        if (!$r) {
            aviso('Este link não é válido ou já expirou.', 'erro');
            ir('confirmar_email.php');
        }
        [$p, $u, $tipo] = $r;
        sql('UPDATE verificacao_email SET usado = 1 WHERE utilizador_id = ?', [$u['id']]);   // só serve uma vez
        if ($tipo === 'registo') {
            sql('UPDATE utilizadores SET email_verificado = 1 WHERE id = ?', [$u['id']]);
            iniciar_sessao($u);   // quem abriu o link tem acesso ao email: entra logo
            aviso('Email confirmado! Bem-vindo ao TavDex, ' . nome_visivel($u) . '.');
            ir('index.php');
        }
        // Mudança de email: volta a confirmar que ninguém ficou entretanto com este email
        if (valor('SELECT COUNT(*) FROM utilizadores WHERE email = ? AND id <> ?', [$p['email'], $u['id']])) {
            sql('UPDATE utilizadores SET email_pendente = NULL WHERE id = ?', [$u['id']]);
            aviso('Este email já está a ser usado por outra conta. Escolhe outro nas Definições.', 'erro');
            ir('editar_perfil.php?tab=seguranca');
        }
        $antigo = $u['email'];
        sql('UPDATE utilizadores SET email = ?, email_pendente = NULL, email_verificado = 1 WHERE id = ?', [$p['email'], $u['id']]);
        // Aviso para o email antigo (se não foi o dono, fica a saber)
        if (!MODO_DEV) enviar_email($antigo, 'TavDex – o email da tua conta foi alterado',
            'Olá ' . nome_visivel($u) . ",\n\nO email da tua conta TavDex (@{$u['nome']}) foi alterado para " . esconder_email($p['email']) . ".\nSe não foste tu, recupera a conta e contacta a administração do TavDex.");
        aviso('Email confirmado! O email da tua conta foi alterado.');
        ir(eu() ? 'editar_perfil.php?tab=seguranca' : 'login.php');
    }

    // Reenviar o link (conta guardada na sessão)
    if ($op === 'reenviar' && ($u = conta_da_sessao())) {
        $limite = limite_envios((int)$u['id']);
        if (!$limite['pode']) aviso($limite['motivo'], 'erro');
        else {
            enviar_confirmacao($u, $u['email'], 'registo');
            aviso('Enviámos um novo link para ' . esconder_email($u['email']) . '.');
        }
        ir('confirmar_email.php');
    }

    // Reenviar escrevendo o email (ex.: o link expirou). A resposta é SEMPRE igual,
    // para não revelar que emails têm conta.
    if ($op === 'reenviar_email') {
        $conta = linha('SELECT * FROM utilizadores WHERE email = ? AND email_verificado = 0 AND bloqueado = 0', [mb_strtolower(campo('email'))]);
        if ($conta && limite_envios((int)$conta['id'])['pode']) enviar_confirmacao($conta, $conta['email'], 'registo');
        aviso('Se existir uma conta por confirmar com esse email, enviámos um link novo. Vê também a pasta de spam ou de promoções.');
        ir('confirmar_email.php');
    }
    ir('confirmar_email.php');
}

$r = $token ? pedido_valido($token) : null;
$conta = $token ? null : conta_da_sessao();   // (não se chama $u: o cabecalho.php usa $u para quem tem sessão)
$espera = $conta ? limite_envios((int)$conta['id'])['espera'] : 0;

$titulo = 'Confirmar email';
require 'cabecalho.php';
?>
<div class="content"><div class="left narrow">
  <div class="box confirmar-email">
    <img class="modal-logo" src="logo.png" alt="">
    <?php if ($token && $r): ?>
      <h1 class="ph"><?= $r[2] === 'registo' ? 'Confirma o teu email' : 'Confirma o teu novo email' ?></h1>
      <p class="muted">Carrega no botão para confirmar <b><?= e(esconder_email($r[0]['email'])) ?></b>.</p>
      <form method="post" class="fm-simples"><?= campo_csrf() ?>
        <input type="hidden" name="op" value="confirmar"><input type="hidden" name="token" value="<?= e($token) ?>">
        <button class="btn primary">Confirmar email</button>
      </form>

    <?php elseif ($token): ?>
      <h1 class="ph">Link inválido</h1>
      <p class="muted">Este link não é válido ou já expirou (os links valem 24 horas e só uma vez).</p>
      <form method="post" class="fm-simples"><?= campo_csrf() ?><input type="hidden" name="op" value="reenviar_email">
        <label>Escreve o teu email para receberes um link novo<input type="email" name="email" required autocomplete="email"></label>
        <button class="btn primary">Enviar link novo</button>
      </form>

    <?php elseif ($conta): ?>
      <h1 class="ph">Quase pronto!</h1>
      <p>Enviámos um link para <b><?= e(esconder_email($conta['email'])) ?></b>.<br>Abre-o para ativar a tua conta (vê também a pasta de spam).</p>
      <form method="post" class="fm-simples"><?= campo_csrf() ?><input type="hidden" name="op" value="reenviar">
        <button class="btn ghost" <?= $espera ? 'disabled data-espera="' . $espera . '"' : '' ?>>Reenviar email<?= $espera ? ' (' . $espera . ' s)' : '' ?></button>
      </form>
      <small class="muted">O email está errado? <a class="lk" href="registar.php">Cria a conta outra vez</a> (a conta por confirmar é apagada ao fim de 7 dias).</small>

    <?php else: ?>
      <h1 class="ph">Confirmar email</h1>
      <p class="muted">Não recebeste o link ou já expirou? Escreve o email da tua conta.</p>
      <form method="post" class="fm-simples"><?= campo_csrf() ?><input type="hidden" name="op" value="reenviar_email">
        <label>Email<input type="email" name="email" required autocomplete="email"></label>
        <button class="btn primary">Enviar link novo</button>
      </form>
      <small><a class="lk" href="login.php">← Voltar a iniciar sessão</a></small>
    <?php endif; ?>
  </div>
</div></div>
<?php require 'rodape.php'; ?>
