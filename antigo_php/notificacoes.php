<?php
// Passo 21 – Página de notificações
// Passo 22 – Silenciar notificações
require 'lib.php';
$u = exigir_login();
$uid = (int)$u['id'];
$tipos = ['seguidor' => 'Novos seguidores', 'comentario' => 'Comentários e respostas', 'candidatura' => 'Candidaturas', 'mensagem' => 'Mensagens', 'projeto' => 'Projetos', 'sistema' => 'Avisos do TavDex'];

// Abrir uma notificação: marca como lida e segue o link
if (isset($_GET['abrir'])) {
    $n = linha('SELECT * FROM notificacoes WHERE id = ? AND utilizador_id = ?', [(int)$_GET['abrir'], $uid]);
    if ($n) {
        sql('UPDATE notificacoes SET lida = 1 WHERE id = ?', [$n['id']]);
        if ($n['link'] && preg_match('#^[\w./?=&%\#-]+$#', $n['link'])) ir($n['link']);
    }
    ir('notificacoes.php');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verificar_csrf();
    switch ($_POST['op'] ?? '') {
        case 'todas_lidas':
            sql('UPDATE notificacoes SET lida = 1 WHERE utilizador_id = ?', [$uid]);
            break;
        case 'limpar':
            sql('DELETE FROM notificacoes WHERE utilizador_id = ? AND lida = 1', [$uid]);
            aviso('Notificações lidas apagadas.');
            break;
        case 'apagar':
            sql('DELETE FROM notificacoes WHERE id = ? AND utilizador_id = ?', [(int)$_POST['id'], $uid]);
            break;
        // Passo 22 – escolher que tipos de notificação ficam silenciados
        case 'preferencias':
            $ativos = $_POST['tipos'] ?? [];
            sql('DELETE FROM notif_silenciadas WHERE utilizador_id = ?', [$uid]);
            foreach (array_keys($tipos) as $t) {
                if (!in_array($t, $ativos, true)) sql('INSERT INTO notif_silenciadas (utilizador_id, tipo) VALUES (?, ?)', [$uid, $t]);
            }
            sql('UPDATE utilizadores SET notif_email = ? WHERE id = ?', [isset($_POST['email']) ? 1 : 0, $uid]);
            aviso('Preferências guardadas.');
            break;
        case 'silenciar_tudo':
            foreach (array_keys($tipos) as $t) {
                if (!valor('SELECT COUNT(*) FROM notif_silenciadas WHERE utilizador_id = ? AND tipo = ?', [$uid, $t])) {
                    sql('INSERT INTO notif_silenciadas (utilizador_id, tipo) VALUES (?, ?)', [$uid, $t]);
                }
            }
            aviso('Todas as notificações foram silenciadas.');
            break;
    }
    ir('notificacoes.php');
}

$filtro = $_GET['f'] ?? 'todas';
[$lista, $total, $pag] = paginado('SELECT * FROM notificacoes WHERE utilizador_id = ?' . ($filtro === 'por_ler' ? ' AND lida = 0' : ''), [$uid], 'ORDER BY criado_em DESC, id DESC', 20);
$silenciadas = array_column(linhas('SELECT tipo FROM notif_silenciadas WHERE utilizador_id = ?', [$uid]), 'tipo');
$icones = ['seguidor' => '👤', 'comentario' => '💬', 'candidatura' => '🎬', 'mensagem' => '✉️', 'projeto' => '🎞', 'sistema' => '⚑'];

$titulo = 'Notificações';
require 'cabecalho.php';
?>
<div class="content"><div class="left">
  <div class="ah"><h1 class="ph">Notificações</h1>
    <div class="btns">
      <form method="post" class="inline"><?= campo_csrf() ?><input type="hidden" name="op" value="todas_lidas"><button class="btn ghost sm">Marcar todas como lidas</button></form>
      <form method="post" class="inline"><?= campo_csrf() ?><input type="hidden" name="op" value="limpar"><button class="btn ghost sm">Apagar lidas</button></form>
    </div></div>
  <div class="dcols"><div>
    <div class="tabs links"><a class="<?= $filtro === 'todas' ? 'on' : '' ?>" href="?f=todas">Todas</a><a class="<?= $filtro === 'por_ler' ? 'on' : '' ?>" href="?f=por_ler">Por ler</a></div>
    <?php if (!$lista): ?><p class="empty">Não tens notificações.</p><?php endif; ?>
    <?php foreach ($lista as $n): ?>
      <div class="box rv notif<?= $n['lida'] ? '' : ' unread' ?>">
        <span class="ni"><?= $icones[$n['tipo']] ?? '•' ?></span>
        <a href="?abrir=<?= $n['id'] ?>"><?= e($n['texto']) ?> <small><?= tempo($n['criado_em']) ?></small></a>
        <form method="post" class="inline"><?= campo_csrf() ?><input type="hidden" name="op" value="apagar"><input type="hidden" name="id" value="<?= $n['id'] ?>"><button class="del-btn" title="Apagar">✕</button></form>
      </div>
    <?php endforeach; ?>
    <?= paginacao($total, $pag, 20, ['f' => $filtro]) ?>
  </div><div>
    <form method="post" class="box nset"><?= campo_csrf() ?><input type="hidden" name="op" value="preferencias">
      <h3>Que notificações queres receber?</h3>
      <?php foreach ($tipos as $t => $nome): ?>
        <label><input type="checkbox" name="tipos[]" value="<?= $t ?>" <?= in_array($t, $silenciadas, true) ? '' : 'checked' ?>> <?= $nome ?></label>
      <?php endforeach; ?>
      <label><input type="checkbox" name="email" <?= $u['notif_email'] ? 'checked' : '' ?>> Receber também por email</label>
      <small>Os tipos desmarcados ficam silenciados: não aparecem nem são enviados por email.</small>
      <button class="btn primary sm">Guardar</button>
    </form>
    <form method="post" class="box"><?= campo_csrf() ?><input type="hidden" name="op" value="silenciar_tudo">
      <h3>Silenciar tudo</h3><p class="muted">Deixas de receber qualquer notificação até voltares a ativar.</p>
      <button class="btn ghost sm">🔕 Silenciar todas</button></form>
  </div></div>
</div></div>
<?php require 'rodape.php'; ?>
