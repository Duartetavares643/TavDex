<?php
// Passo 20 – Chat da comunidade
// Sala "Geral" para todos e conversas privadas entre utilizadores.
// As mensagens novas aparecem sozinhas (o JavaScript pergunta ao chat_api.php a cada 4 segundos).
require 'lib.php';
$u = exigir_login();

// Com quem é a conversa: 0 = sala geral
$com = (int)($_GET['com'] ?? 0);
$outro = $com ? linha('SELECT id, nome, cor FROM utilizadores WHERE id = ?', [$com]) : null;
if ($com && (!$outro || $com === (int)$u['id'])) ir('chat.php');

// Começar uma conversa nova pelo nome
if (isset($_GET['nome'])) {
    $alvo = linha('SELECT id FROM utilizadores WHERE nome = ?', [trim($_GET['nome'])]);
    if ($alvo && (int)$alvo['id'] !== (int)$u['id']) ir('chat.php?com=' . $alvo['id']);
    aviso('Utilizador não encontrado.', 'erro');
    ir('chat.php');
}

// Lista das conversas privadas (última mensagem de cada uma)
$conversas = linhas('SELECT u.id, u.nome, u.cor, MAX(m.criado_em) AS ultima
                     FROM mensagens m JOIN utilizadores u ON u.id = CASE WHEN m.de_id = ? THEN m.para_id ELSE m.de_id END
                     WHERE m.para_id IS NOT NULL AND (m.de_id = ? OR m.para_id = ?)
                     GROUP BY u.id, u.nome, u.cor ORDER BY ultima DESC', [$u['id'], $u['id'], $u['id']]);
if ($outro && !in_array($outro['id'], array_column($conversas, 'id'))) array_unshift($conversas, $outro + ['ultima' => null]);

// Ao abrir uma conversa privada, as notificações de mensagem dessa pessoa ficam lidas
if ($outro) sql("UPDATE notificacoes SET lida = 1 WHERE utilizador_id = ? AND tipo = 'mensagem' AND link = ?", [$u['id'], 'chat.php?com=' . $outro['id']]);

$titulo = 'Chat';
$ativo = 'Comunidade';
require 'cabecalho.php';
?>
<div class="content"><div class="left">
  <h1 class="ph">Chat</h1>
  <div class="msgx">
    <div class="convs">
      <a class="cv<?= $com ? '' : ' on' ?>" href="chat.php"><span class="av s" style="--h:350">#</span><div><b>Geral</b><small>Sala de toda a comunidade</small></div></a>
      <?php foreach ($conversas as $c): ?>
        <a class="cv<?= $com === (int)$c['id'] ? ' on' : '' ?>" href="chat.php?com=<?= $c['id'] ?>"><?= avatar($c) ?><div><b><?= e($c['nome']) ?></b><small><?= $c['ultima'] ? tempo($c['ultima']) : 'nova conversa' ?></small></div></a>
      <?php endforeach; ?>
      <form class="newc" method="get"><input name="nome" placeholder="Nova conversa: nome" required><button class="btn ghost sm">Abrir</button></form>
    </div>
    <div class="cpane" data-chat="<?= $com ?>" data-eu="<?= (int)$u['id'] ?>" data-admin="<?= e_admin() ? 1 : 0 ?>" data-csrf="<?= token_csrf() ?>">
      <div class="chh"><b><?= $outro ? link_perfil($outro) : '# Geral' ?></b></div>
      <div id="msgs"><p class="empty">A carregar…</p></div>
      <form id="chat"><input name="texto" maxlength="1000" placeholder="Escreve uma mensagem..." autocomplete="off" required><button class="btn primary">Enviar</button></form>
    </div>
  </div>
</div></div>
<?php require 'rodape.php'; ?>
