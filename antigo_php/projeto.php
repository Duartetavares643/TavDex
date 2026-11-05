<?php
// Passo 14 – Página individual de cada projeto
// Passo 15 – Candidatura a um projeto
// Passo 16 – Retirar a candidatura
// Passo 19 – Avaliar e fazer reviews de um projeto
require 'lib.php';

$id = (int)($_GET['id'] ?? 0);
$p = linha('SELECT p.*, u.nome AS dono_nome, u.cor AS dono_cor FROM projetos p JOIN utilizadores u ON u.id = p.dono_id WHERE p.id = ?', [$id]);
if (!$p) {
    http_response_code(404);
    $titulo = 'Projeto não encontrado';
    require 'cabecalho.php';
    echo '<div class="content"><div class="left"><h1 class="ph">Projeto não encontrado</h1><p><a class="lk" href="projetos.php">Ver todos os projetos</a></p></div></div>';
    require 'rodape.php';
    exit;
}
$u = eu();
$dono = $u && (int)$u['id'] === (int)$p['dono_id'];
$pode_gerir = $dono || e_admin();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verificar_csrf();
    $u = exigir_login();
    switch ($_POST['op'] ?? '') {

        // Passo 15 – candidatar-se a uma vaga aberta
        case 'candidatar':
            $vaga = linha('SELECT * FROM projeto_vagas WHERE id = ? AND projeto_id = ? AND aberta = 1', [(int)$_POST['vaga'], $id]);
            if (!$vaga || $dono) { aviso('Esta vaga não está disponível.', 'erro'); break; }
            if (demasiado('candidaturas', 'utilizador_id', (int)$u['id'], 10, 3600)) { aviso('Já enviaste muitas candidaturas na última hora. Tenta mais tarde.', 'erro'); break; }
            if (valor('SELECT COUNT(*) FROM candidaturas WHERE vaga_id = ? AND utilizador_id = ?', [$vaga['id'], $u['id']])) {
                aviso('Já te candidataste a esta vaga.', 'erro');
                break;
            }
            sql('INSERT INTO candidaturas (vaga_id, utilizador_id, mensagem, criado_em) VALUES (?, ?, ?, ?)', [$vaga['id'], $u['id'], mb_substr(campo('mensagem'), 0, 500), agora()]);
            notificar((int)$p['dono_id'], 'candidatura', $u['nome'] . ' candidatou-se a ' . $vaga['funcao'] . ' em ' . $p['titulo'] . '.', 'candidaturas.php?id=' . $id);
            aviso('Candidatura enviada! Vais receber uma notificação com a resposta.');
            break;

        // Passo 16 – retirar uma candidatura que ainda está pendente
        case 'retirar':
            sql("DELETE FROM candidaturas WHERE id = ? AND utilizador_id = ? AND estado = 'pendente'", [(int)$_POST['candidatura'], $u['id']]);
            aviso('Candidatura retirada.');
            break;

        // Passo 19 – avaliar (1 a 5) e escrever uma review; volta a enviar para editar
        case 'avaliar':
            $nota = (int)($_POST['nota'] ?? 0);
            if ($nota < 1 || $nota > 5) { aviso('Escolhe de 1 a 5 estrelas.', 'erro'); break; }
            if ($dono) { aviso('Não podes avaliar o teu próprio projeto.', 'erro'); break; }
            $review = mb_substr(campo('review'), 0, 1000);
            if (valor('SELECT COUNT(*) FROM projeto_avaliacoes WHERE projeto_id = ? AND utilizador_id = ?', [$id, $u['id']])) {
                sql('UPDATE projeto_avaliacoes SET nota = ?, review = ? WHERE projeto_id = ? AND utilizador_id = ?', [$nota, $review, $id, $u['id']]);
                aviso('Avaliação atualizada.');
            } else {
                sql('INSERT INTO projeto_avaliacoes (projeto_id, utilizador_id, nota, review, criado_em) VALUES (?, ?, ?, ?, ?)', [$id, $u['id'], $nota, $review, agora()]);
                notificar((int)$p['dono_id'], 'projeto', $u['nome'] . ' avaliou o teu projeto ' . $p['titulo'] . ' com ' . $nota . '★.', 'projeto.php?id=' . $id . '#avaliacoes');
                aviso('Obrigado pela avaliação!');
            }
            break;

        case 'apagar_avaliacao':
            // O autor apaga a sua; um administrador pode apagar qualquer uma
            $a = linha('SELECT * FROM projeto_avaliacoes WHERE id = ? AND projeto_id = ?', [(int)$_POST['avaliacao'], $id]);
            if ($a && ((int)$a['utilizador_id'] === (int)$u['id'] || e_admin())) {
                sql('DELETE FROM projeto_avaliacoes WHERE id = ?', [$a['id']]);
                aviso('Avaliação apagada.');
            }
            break;
    }
    ir('projeto.php?id=' . $id . '#' . ($_POST['op'] === 'avaliar' || $_POST['op'] === 'apagar_avaliacao' ? 'avaliacoes' : 'vagas'));
}

$equipa = linhas('SELECT e.*, u.nome AS unome, u.cor FROM projeto_equipa e LEFT JOIN utilizadores u ON u.id = e.utilizador_id WHERE e.projeto_id = ? ORDER BY e.id', [$id]);
$vagas = linhas('SELECT * FROM projeto_vagas WHERE projeto_id = ? AND aberta = 1 ORDER BY id', [$id]);
$minhas = $u ? linhas('SELECT c.*, v.funcao FROM candidaturas c JOIN projeto_vagas v ON v.id = c.vaga_id WHERE v.projeto_id = ? AND c.utilizador_id = ? ORDER BY c.criado_em DESC', [$id, $u['id']]) : [];
$ja_candidatei = array_column($minhas, 'vaga_id');
$avaliacoes = linhas('SELECT a.*, u.nome, u.cor FROM projeto_avaliacoes a JOIN utilizadores u ON u.id = a.utilizador_id WHERE a.projeto_id = ? ORDER BY a.criado_em DESC', [$id]);
$media = $avaliacoes ? array_sum(array_column($avaliacoes, 'nota')) / count($avaliacoes) : null;
$minha_av = null;
foreach ($avaliacoes as $a) if ($u && (int)$a['utilizador_id'] === (int)$u['id']) $minha_av = $a;
$pendentes = $pode_gerir ? (int)valor("SELECT COUNT(*) FROM candidaturas c JOIN projeto_vagas v ON v.id = c.vaga_id WHERE v.projeto_id = ? AND c.estado = 'pendente'", [$id]) : 0;

$titulo = $p['titulo'];
$ativo = 'Projetos';
require 'cabecalho.php';
?>
<div class="content"><div class="left">
  <div class="dh pdh" style="--h:<?= cor_de($p['titulo']) ?>"><div>
    <span class="tag">PROJETO · <?= e(mb_strtoupper($p['tipo'])) ?></span>
    <h1><?= e($p['titulo']) ?></h1>
    <p class="meta"><?= badge_estado($p['estado']) ?><?php if ($p['genero']): ?><span><?= e($p['genero']) ?></span><?php endif; ?>
      <?php if ($media): ?><span class="star"><i class="st">★</i> <?= number_format($media, 1) ?> (<?= count($avaliacoes) ?>)</span><?php endif; ?></p>
    <p class="desc"><?= nl2br(e($p['sinopse'])) ?></p>
    <p class="muted">Criado por <?= link_perfil(['nome' => $p['dono_nome']]) ?> · <?= tempo($p['criado_em']) ?></p>
    <div class="btns">
      <?php if ($pode_gerir): ?>
        <a class="btn primary sm" href="projeto_editar.php?id=<?= $id ?>">✎ Editar projeto</a>
        <a class="btn ghost sm" href="candidaturas.php?id=<?= $id ?>">Candidaturas<?= $pendentes ? ' (' . $pendentes . ' novas)' : '' ?></a>
      <?php elseif ($vagas): ?>
        <a class="btn primary sm" href="#vagas">Candidatar-me</a>
      <?php endif; ?>
    </div>
  </div></div>

  <div class="dcols"><div>
    <h2 class="sh">Equipa</h2>
    <div class="cast">
      <?php foreach ($equipa as $m): ?>
        <div class="pp"><?= avatar(['nome' => $m['unome'] ?? $m['nome'], 'cor' => $m['cor'] ?? 215], 'l') ?>
          <b><?= $m['unome'] ? link_perfil(['nome' => $m['unome']]) : e($m['nome']) ?></b><small><?= e($m['funcao']) ?></small></div>
      <?php endforeach; ?>
    </div>

    <h2 class="sh" id="vagas">Vagas abertas</h2>
    <?php if (!$vagas): ?><p class="empty">Este projeto não tem vagas abertas neste momento.</p><?php endif; ?>
    <?php foreach ($vagas as $v): ?>
      <div class="box vaga"><b><?= e($v['funcao']) ?></b><?php if ($v['descricao']): ?><p><?= e($v['descricao']) ?></p><?php endif; ?>
        <?php if (!$u): ?><p><a class="lk" href="login.php?voltar=<?= urlencode('projeto.php?id=' . $id) ?>">Inicia sessão para te candidatares</a></p>
        <?php elseif ($dono): ?>
        <?php elseif (in_array($v['id'], $ja_candidatei)): ?><p class="muted">Já te candidataste a esta vaga.</p>
        <?php else: ?>
          <form method="post" class="form"><?= campo_csrf() ?><input type="hidden" name="op" value="candidatar"><input type="hidden" name="vaga" value="<?= $v['id'] ?>">
            <textarea name="mensagem" maxlength="500" rows="2" placeholder="Fala um pouco da tua experiência (opcional)"></textarea>
            <button class="btn primary sm">Candidatar-me a <?= e($v['funcao']) ?></button></form>
        <?php endif; ?></div>
    <?php endforeach; ?>

    <?php if ($minhas): ?>
      <h2 class="sh">As minhas candidaturas</h2>
      <?php foreach ($minhas as $c): ?>
        <div class="box rv li"><div><b><?= e($c['funcao']) ?></b> <?= badge_estado($c['estado']) ?> <small><?= tempo($c['criado_em']) ?></small></div>
          <?php if ($c['estado'] === 'pendente'): ?>
            <form method="post" class="inline" data-confirm="Retirar a candidatura?"><?= campo_csrf() ?><input type="hidden" name="op" value="retirar"><input type="hidden" name="candidatura" value="<?= $c['id'] ?>"><button class="btn ghost sm">Retirar candidatura</button></form>
          <?php endif; ?></div>
      <?php endforeach; ?>
    <?php endif; ?>
  </div><div id="avaliacoes">
    <div class="box"><h3>Avaliações</h3>
      <div class="score"><b><?= $media ? number_format($media, 1) : '–' ?></b><?= $media ? estrelas($media) : '' ?></div>
      <small class="muted"><?= count($avaliacoes) ?> avaliação<?= count($avaliacoes) === 1 ? '' : 'ões' ?></small>
      <?php if ($u && !$dono): ?>
        <form method="post" class="form rate"><?= campo_csrf() ?><input type="hidden" name="op" value="avaliar">
          <?= campo_estrelas((int)($minha_av['nota'] ?? 0)) ?>
          <textarea name="review" maxlength="1000" rows="3" placeholder="Escreve a tua opinião (opcional)"><?= e($minha_av['review'] ?? '') ?></textarea>
          <button class="btn primary sm"><?= $minha_av ? 'Atualizar avaliação' : 'Avaliar projeto' ?></button></form>
      <?php endif; ?>
    </div>
    <?php foreach ($avaliacoes as $a): ?>
      <div class="box rv"><?= avatar($a) ?><div><b><?= link_perfil($a) ?></b> <?= estrelas($a['nota']) ?> <small><?= tempo($a['criado_em']) ?></small>
        <?php if ($a['review']): ?><p><?= nl2br(e($a['review'])) ?></p><?php endif; ?></div>
        <?php if ($u && ((int)$a['utilizador_id'] === (int)$u['id'] || e_admin())): ?>
          <form method="post" class="inline" data-confirm="Apagar esta avaliação?"><?= campo_csrf() ?><input type="hidden" name="op" value="apagar_avaliacao"><input type="hidden" name="avaliacao" value="<?= $a['id'] ?>"><button class="del-btn" title="Apagar">🗑</button></form>
        <?php endif; ?></div>
    <?php endforeach; ?>
  </div></div>
</div></div>
<?php require 'rodape.php'; ?>
