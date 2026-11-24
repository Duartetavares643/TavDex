<?php
// Passo 24 – Página de catálogo
// Passo 26 – Pesquisa  ·  Passo 27 – Filtros e paginação  ·  Passo 28 – Ordenação  (com paginação)
require 'lib.php';

$tipo = in_array($_GET['tipo'] ?? '', ['filme', 'serie'], true) ? $_GET['tipo'] : '';
$q = trim($_GET['q'] ?? '');
$genero = (int)($_GET['genero'] ?? 0);
$ano = $_GET['ano'] ?? '';
$nota = (int)($_GET['nota'] ?? 0);
$plat = (int)($_GET['plat'] ?? 0);
$ordem = $_GET['ordem'] ?? 'nome';
$pagina = max(1, (int)($_GET['p'] ?? 1));
$por_pagina = 15;

$anos = ['2020' => '2020 em diante', '2010' => '2010 – 2019', '2000' => '2000 – 2009', 'antes' => 'Antes de 2000'];
$ordens = ['nome' => 'Nome (A–Z)', 'recentes' => 'Mais recentes', 'antigos' => 'Mais antigos', 'nota' => 'Melhor avaliação', 'populares' => 'Mais avaliados'];

// Construção da consulta com os filtros escolhidos (sempre com parâmetros, nunca texto colado)
$where = [];
$param = [];
if ($tipo) { $where[] = 'x.tipo = ?'; $param[] = $tipo; }
if ($q !== '') { $where[] = '(x.nome LIKE ? OR x.realizador LIKE ?)'; $param[] = "%$q%"; $param[] = "%$q%"; }
if ($genero) { $where[] = 'x.id IN (SELECT titulo_id FROM titulo_generos WHERE genero_id = ?)'; $param[] = $genero; }
if ($ano === '2020') $where[] = 'x.ano >= 2020';
elseif ($ano === '2010') $where[] = 'x.ano BETWEEN 2010 AND 2019';
elseif ($ano === '2000') $where[] = 'x.ano BETWEEN 2000 AND 2009';
elseif ($ano === 'antes') $where[] = 'x.ano < 2000';
if ($nota >= 1 && $nota <= 5) { $where[] = 'x.media >= ?'; $param[] = $nota; }
if ($plat) { $where[] = 'x.id IN (SELECT titulo_id FROM titulo_plataformas WHERE plataforma_id = ?)'; $param[] = $plat; }

$order = match ($ordem) {
    'recentes' => 'x.ano DESC, x.nome',
    'antigos' => 'x.ano, x.nome',
    'nota' => 'x.media IS NULL, x.media DESC, x.nome',
    'populares' => 'x.n_aval DESC, x.nome',
    default => 'x.nome',
};
$base = 'FROM (' . SQL_TITULOS . ') x' . ($where ? ' WHERE ' . implode(' AND ', $where) : '');
$total = (int)valor("SELECT COUNT(*) $base", $param);
$paginas = max(1, (int)ceil($total / $por_pagina));
$pagina = min($pagina, $paginas);
$titulos = linhas("SELECT x.* $base ORDER BY $order LIMIT $por_pagina OFFSET " . (($pagina - 1) * $por_pagina), $param);

$generos = linhas('SELECT g.* FROM generos g' . ($tipo ? ' WHERE g.id IN (SELECT tg.genero_id FROM titulo_generos tg JOIN titulos t ON t.id = tg.titulo_id WHERE t.tipo = ?)' : '') . ' ORDER BY g.nome', $tipo ? [$tipo] : []);
$plataformas = linhas('SELECT p.* FROM plataformas p WHERE EXISTS (SELECT 1 FROM titulo_plataformas tp WHERE tp.plataforma_id = p.id) ORDER BY p.nome');
$nome_pagina = $tipo === 'filme' ? 'Filmes' : ($tipo === 'serie' ? 'Séries' : 'Catálogo');
$titulo = $nome_pagina;
$ativo = $nome_pagina;
require 'cabecalho.php';
?>
<div class="content"><div class="left">
  <h1 class="ph"><?= $nome_pagina ?></h1>
  <?php $base = array_filter(['tipo' => $tipo, 'q' => $q, 'ano' => $ano, 'nota' => $nota ?: null, 'plat' => $plat ?: null, 'ordem' => $ordem !== 'nome' ? $ordem : null]); ?>
  <nav class="gchips" aria-label="Géneros">
    <a class="<?= $genero ? '' : 'on' ?>" href="?<?= e(http_build_query($base)) ?>">Todos</a>
    <?php foreach ($generos as $g): ?><a class="<?= $genero === (int)$g['id'] ? 'on' : '' ?>" href="?<?= e(http_build_query($base + ['genero' => $g['id']])) ?>"><?= e($g['nome']) ?></a><?php endforeach; ?>
  </nav>
  <form class="cf" method="get">
    <select name="tipo"><option value="">Filmes e séries</option><option value="filme" <?= $tipo === 'filme' ? 'selected' : '' ?>>Só filmes</option><option value="serie" <?= $tipo === 'serie' ? 'selected' : '' ?>>Só séries</option></select>
    <input name="q" value="<?= e($q) ?>" placeholder="Pesquisar por título ou realizador...">
    <?php if ($genero): ?><input type="hidden" name="genero" value="<?= $genero ?>"><?php endif; ?>
    <select name="plat"><option value="0">Todas as plataformas</option><?php foreach ($plataformas as $p): ?><option value="<?= $p['id'] ?>" <?= $plat === (int)$p['id'] ? 'selected' : '' ?>><?= e($p['nome']) ?></option><?php endforeach; ?></select>
    <select name="ano"><option value="">Qualquer ano</option><?php foreach ($anos as $k => $n): ?><option value="<?= $k ?>" <?= $ano === (string)$k ? 'selected' : '' ?>><?= $n ?></option><?php endforeach; ?></select>
    <select name="nota"><option value="0">Qualquer avaliação</option><?php for ($i = 4; $i >= 2; $i--): ?><option value="<?= $i ?>" <?= $nota === $i ? 'selected' : '' ?>><?= $i ?>★ ou mais</option><?php endfor; ?></select>
    <select name="ordem"><?php foreach ($ordens as $k => $n): ?><option value="<?= $k ?>" <?= $ordem === $k ? 'selected' : '' ?>><?= $n ?></option><?php endforeach; ?></select>
    <button class="btn primary sm">Aplicar</button>
    <a class="btn ghost sm" href="catalogo.php<?= $tipo ? '?tipo=' . $tipo : '' ?>">Limpar</a>
  </form>
  <p class="cr"><?= $total ?> resultado<?= $total === 1 ? '' : 's' ?></p>
  <?php if (!$titulos): ?><p class="empty">Sem resultados para estes filtros.</p><?php endif; ?>
  <div class="grid g5"><?php foreach ($titulos as $t) echo cartao_titulo($t); ?></div>
  <?= paginacao($total, $pagina, $por_pagina, array_filter(['tipo' => $tipo, 'q' => $q, 'genero' => $genero ?: null, 'ano' => $ano, 'nota' => $nota ?: null, 'plat' => $plat ?: null, 'ordem' => $ordem])) ?>
</div></div>
<?php require 'rodape.php'; ?>
