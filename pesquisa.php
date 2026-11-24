<?php
// Passo 26 – Pesquisa geral (barra do topo): filmes, séries, projetos e pessoas
require 'lib.php';
$q = trim($_GET['q'] ?? '');
$titulos = $projetos = $pessoas = [];
if ($q !== '') {
    $like = '%' . $q . '%';
    $titulos = linhas(SQL_TITULOS . ' WHERE t.nome LIKE ? OR t.realizador LIKE ? ORDER BY t.nome LIMIT 20', [$like, $like]);
    $projetos = linhas(SQL_PROJETOS . ' WHERE p.titulo LIKE ? OR p.sinopse LIKE ? ORDER BY p.titulo LIMIT 10', [$like, $like]);
    $pessoas = linhas('SELECT * FROM utilizadores WHERE nome LIKE ? ORDER BY nome LIMIT 10', [$like]);
}
$titulo = 'Pesquisa';
require 'cabecalho.php';
?>
<div class="content"><div class="left">
  <h1 class="ph">Pesquisa</h1>
  <form class="cf" method="get"><input name="q" value="<?= e($q) ?>" placeholder="O que procuras?" autofocus><button class="btn primary sm">Pesquisar</button></form>
  <?php if ($q === ''): ?>
    <p class="empty">Escreve o nome de um filme, série, projeto ou pessoa.</p>
  <?php elseif (!$titulos && !$projetos && !$pessoas): ?>
    <p class="empty">Sem resultados para "<?= e($q) ?>".</p>
  <?php endif; ?>
  <?php if ($titulos): ?><h2 class="sh">Filmes e séries (<?= count($titulos) ?>)</h2><div class="grid g5"><?php foreach ($titulos as $t) echo cartao_titulo($t); ?></div><?php endif; ?>
  <?php if ($projetos): ?><h2 class="sh">Projetos (<?= count($projetos) ?>)</h2><div class="pjc"><?php foreach ($projetos as $p) echo cartao_projeto($p); ?></div><?php endif; ?>
  <?php if ($pessoas): ?><h2 class="sh">Pessoas (<?= count($pessoas) ?>)</h2>
    <div class="ulist"><?php foreach ($pessoas as $p): ?><a class="box rv" href="perfil.php?u=<?= urlencode($p['nome']) ?>"><?= avatar($p) ?><div><b><?= e($p['nome']) ?></b><?php if ($p['bio']): ?><br><small><?= e($p['bio']) ?></small><?php endif; ?></div></a><?php endforeach; ?></div>
  <?php endif; ?>
</div></div>
<?php require 'rodape.php'; ?>
