<?php
// Passo 17 – Página de visualização de candidaturas (para o dono do projeto)
// Passo 18 – Aprovação / rejeição de um candidato
require 'lib.php';
$u = exigir_login();

$id = (int)($_GET['id'] ?? 0);
$p = linha('SELECT * FROM projetos WHERE id = ?', [$id]);
if (!$p || ((int)$p['dono_id'] !== (int)$u['id'] && !e_admin())) {
    aviso('Só o dono do projeto pode ver as candidaturas.', 'erro');
    ir('projetos.php');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verificar_csrf();
    $c = linha("SELECT c.*, v.funcao, v.projeto_id FROM candidaturas c JOIN projeto_vagas v ON v.id = c.vaga_id WHERE c.id = ? AND v.projeto_id = ? AND c.estado = 'pendente'",
               [(int)$_POST['candidatura'], $id]);
    if ($c) {
        if (($_POST['decisao'] ?? '') === 'aceitar') {
            // Aceitar: entra na equipa e a vaga fica fechada
            sql("UPDATE candidaturas SET estado = 'aceite' WHERE id = ?", [$c['id']]);
            sql('INSERT INTO projeto_equipa (projeto_id, funcao, utilizador_id) VALUES (?, ?, ?)', [$id, $c['funcao'], $c['utilizador_id']]);
            sql('UPDATE projeto_vagas SET aberta = 0 WHERE id = ?', [$c['vaga_id']]);
            notificar((int)$c['utilizador_id'], 'candidatura', 'A tua candidatura a ' . $c['funcao'] . ' em ' . $p['titulo'] . ' foi aceite! 🎬', 'projeto.php?id=' . $id);
            // As outras candidaturas pendentes à mesma vaga são rejeitadas
            foreach (linhas("SELECT utilizador_id FROM candidaturas WHERE vaga_id = ? AND estado = 'pendente'", [$c['vaga_id']]) as $o) {
                notificar((int)$o['utilizador_id'], 'candidatura', 'A vaga de ' . $c['funcao'] . ' em ' . $p['titulo'] . ' já foi preenchida.', 'projeto.php?id=' . $id);
            }
            sql("UPDATE candidaturas SET estado = 'rejeitada' WHERE vaga_id = ? AND estado = 'pendente'", [$c['vaga_id']]);
            aviso('Candidatura aceite. O candidato entrou na equipa.');
        } else {
            sql("UPDATE candidaturas SET estado = 'rejeitada' WHERE id = ?", [$c['id']]);
            notificar((int)$c['utilizador_id'], 'candidatura', 'A tua candidatura a ' . $c['funcao'] . ' em ' . $p['titulo'] . ' não foi aceite.', 'projeto.php?id=' . $id);
            aviso('Candidatura rejeitada.');
        }
    }
    ir('candidaturas.php?id=' . $id);
}

$filtro = $_GET['estado'] ?? 'pendente';
$cand = linhas('SELECT c.*, v.funcao, u.nome, u.cor, u.bio FROM candidaturas c JOIN projeto_vagas v ON v.id = c.vaga_id JOIN utilizadores u ON u.id = c.utilizador_id
                WHERE v.projeto_id = ?' . ($filtro !== 'todas' ? ' AND c.estado = ?' : '') . ' ORDER BY c.criado_em DESC',
               $filtro !== 'todas' ? [$id, $filtro] : [$id]);
$contagem = [];
foreach (linhas('SELECT c.estado, COUNT(*) AS n FROM candidaturas c JOIN projeto_vagas v ON v.id = c.vaga_id WHERE v.projeto_id = ? GROUP BY c.estado', [$id]) as $r) $contagem[$r['estado']] = $r['n'];

$titulo = 'Candidaturas – ' . $p['titulo'];
$ativo = 'Projetos';
require 'cabecalho.php';
?>
<div class="content"><div class="left narrow">
  <p><a class="lk" href="projeto.php?id=<?= $id ?>">← <?= e($p['titulo']) ?></a></p>
  <h1 class="ph">Candidaturas</h1>
  <div class="tabs links">
    <?php foreach (['pendente' => 'Pendentes', 'aceite' => 'Aceites', 'rejeitada' => 'Rejeitadas', 'todas' => 'Todas'] as $k => $n): ?>
      <a class="<?= $filtro === $k ? 'on' : '' ?>" href="?id=<?= $id ?>&estado=<?= $k ?>"><?= $n ?><?= $k !== 'todas' ? ' (' . ($contagem[$k] ?? 0) . ')' : '' ?></a>
    <?php endforeach; ?>
  </div>
  <?php if (!$cand): ?><p class="empty">Não há candidaturas aqui.</p><?php endif; ?>
  <?php foreach ($cand as $c): ?>
    <div class="box rv cd"><?= avatar($c) ?>
      <div><b><?= link_perfil($c) ?></b> <small>para <?= e($c['funcao']) ?> · <?= tempo($c['criado_em']) ?></small>
        <?php if ($c['mensagem']): ?><p>"<?= e($c['mensagem']) ?>"</p><?php endif; ?>
        <?php if ($c['bio']): ?><small class="muted"><?= e($c['bio']) ?></small><?php endif; ?></div>
      <?= badge_estado($c['estado']) ?>
      <?php if ($c['estado'] === 'pendente'): ?>
        <form method="post" class="cact"><?= campo_csrf() ?><input type="hidden" name="candidatura" value="<?= $c['id'] ?>">
          <button class="btn primary sm" name="decisao" value="aceitar">Aceitar</button>
          <button class="btn ghost sm" name="decisao" value="rejeitar">Rejeitar</button></form>
      <?php endif; ?>
    </div>
  <?php endforeach; ?>
</div></div>
<?php require 'rodape.php'; ?>
