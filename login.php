<?php
// Passo 38 – Lista de conteúdos favoritos
// Passo 43 – Lista de conteúdos vistos
// (e a lista "para ver"). Os botões de remover usam acoes.php (passos 41, 42 e 44).
require 'lib.php';
$u = exigir_login();

$listas = ['favorito' => 'Favoritos', 'ver' => 'Para ver', 'visto' => 'Vistos'];
$l = array_key_exists($_GET['l'] ?? '', $listas) ? $_GET['l'] : 'favorito';
$contagem = [];
foreach (linhas('SELECT tipo, COUNT(*) AS n FROM listas WHERE utilizador_id = ? GROUP BY tipo', [$u['id']]) as $r) $contagem[$r['tipo']] = $r['n'];
$titulos = linhas(SQL_TITULOS . ' JOIN listas l ON l.titulo_id = t.id WHERE l.utilizador_id = ? AND l.tipo = ? ORDER BY l.criado_em DESC', [$u['id'], $l]);

/** Pequeno formulário para uma ação de lista. */
function form_lista(int $titulo, string $tipo, string $modo, string $texto, string $classe = 'ghost'): string
{
    return '<form method="post" action="acoes.php" class="inline">' . campo_csrf() . '<input type="hidden" name="acao" value="lista"><input type="hidden" name="titulo" value="' . $titulo . '">' .
        '<input type="hidden" name="tipo" value="' . $tipo . '"><input type="hidden" name="modo" value="' . $modo . '"><button class="btn ' . $classe . ' sm">' . $texto . '</button></form>';
}

$titulo = 'As minhas listas';
require 'cabecalho.php';
?>
<div class="content"><div class="left">
  <h1 class="ph">As minhas listas</h1>
  <div class="tabs links"><?php foreach ($listas as $k => $nome): ?><a class="<?= $l === $k ? 'on' : '' ?>" href="?l=<?= $k ?>"><?= $nome ?> (<?= $contagem[$k] ?? 0 ?>)</a><?php endforeach; ?></div>
  <?php if (!$titulos): ?><p class="empty">A lista está vazia. Abre um filme ou série no <a class="lk" href="catalogo.php">catálogo</a> e usa os botões ♥ Favorito, + Para ver ou ✓ Já vi.</p><?php endif; ?>
  <div class="grid g5">
    <?php foreach ($titulos as $t): ?>
      <div class="lcard"><?= cartao_titulo($t) ?>
        <div class="lbtns">
          <?php if ($l === 'ver'): ?><?= form_lista((int)$t['id'], 'visto', 'adicionar', '✓ Já vi', 'primary') ?><?php endif; ?>
          <?= form_lista((int)$t['id'], $l, 'remover', 'Remover') ?>
        </div>
      </div>
    <?php endforeach; ?>
  </div>
</div></div>
<?php require 'rodape.php'; ?>
