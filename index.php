<?php
// Passo 4 – Página inicial, com recomendações personalizadas (organizada como uma plataforma de streaming:
// destaque grande no topo e, por baixo, filas de cartazes por tema)
require 'lib.php';
$titulo = '';
$ativo = 'Início';
$u = eu();

// Destaque do topo: os 5 títulos com melhor média (com pelo menos 3 avaliações)
$destaques = linhas(SQL_TITULOS . ' WHERE (SELECT COUNT(*) FROM avaliacoes a WHERE a.titulo_id = t.id) >= 3 ORDER BY media DESC LIMIT 5');
$top10 = linhas(SQL_TITULOS . ' WHERE (SELECT COUNT(*) FROM avaliacoes a WHERE a.titulo_id = t.id) >= 3 ORDER BY media DESC, n_aval DESC LIMIT 10');
$populares = linhas(SQL_TITULOS . ' ORDER BY n_aval DESC, t.nome LIMIT 12');
$novidades = linhas(SQL_TITULOS . ' ORDER BY t.ano DESC, t.id DESC LIMIT 12');
$projetos = linhas(SQL_PROJETOS . ' ORDER BY p.criado_em DESC LIMIT 4');

// Para quem tem sessão: a sua lista (para ver + favoritos) e recomendações
$minha_lista = $u ? linhas(SQL_TITULOS . " WHERE t.id IN (SELECT titulo_id FROM listas WHERE utilizador_id = ? AND tipo IN ('ver','favorito'))
                                          AND t.id NOT IN (SELECT titulo_id FROM listas WHERE utilizador_id = ? AND tipo = 'visto') ORDER BY t.nome LIMIT 12", [$u['id'], $u['id']]) : [];
$recomendados = $u ? recomendacoes($u['id'], 12) : [];

// Filas por género: os 3 géneros com mais títulos
$generos = linhas('SELECT g.id, g.nome, COUNT(*) AS n FROM generos g JOIN titulo_generos tg ON tg.genero_id = g.id GROUP BY g.id, g.nome ORDER BY n DESC, g.nome LIMIT 3');

/** Desenha uma fila horizontal de cartazes. */
function fila(string $nome, array $titulos, string $link, bool $largos = false): void
{
    if (!$titulos) return;
    echo '<section class="row"><div class="row-head"><h2>' . e($nome) . '</h2><a href="' . e($link) . '">Ver tudo →</a></div>';
    echo '<div class="hrow' . ($largos ? '' : ' cartazes') . '">';
    foreach ($titulos as $t) echo $largos ? cartao_fila($t) : cartao_titulo($t);
    echo '</div></section>';
}

/** Duração para mostrar: "2h 46m" nos filmes, "3 temporadas" nas séries. */
function duracao(array $t): string
{
    if ($t['duracao_min']) return intdiv((int)$t['duracao_min'], 60) . 'h ' . str_pad((int)$t['duracao_min'] % 60, 2, '0', STR_PAD_LEFT) . 'm';
    $n = (int)valor('SELECT COUNT(*) FROM temporadas WHERE titulo_id = ?', [$t['id']]);
    return $n ? $n . ' temporada' . ($n > 1 ? 's' : '') : '';
}

require 'cabecalho.php';
?>
<section class="hero2" data-hero aria-label="Em destaque">
  <?php foreach ($destaques as $i => $t): $img = fundo($t); ?>
    <div class="slide<?= $i ? '' : ' on' ?>" style="--h:<?= cor_de($t['nome']) ?><?= $img ? ";--img:url('" . e($img) . "')" : '' ?>">
      <div class="ht">
        <span class="rank"><b>TOP</b> N.º <?= $i + 1 ?> no TavDex · <?= $t['tipo'] === 'filme' ? 'Filme' : 'Série' ?></span>
        <h1><?= e($t['nome']) ?></h1>
        <p class="meta"><span class="star"><i class="st">★</i> <?= number_format((float)$t['media'], 1) ?></span><span><?= (int)$t['ano'] ?></span>
          <?php if ($d = duracao($t)): ?><span><?= $d ?></span><?php endif; ?>
          <span><?= e(generos_titulo($t['id'])) ?></span><span class="age"><?= e($t['idade']) ?></span></p>
        <p class="desc"><?= e($t['sinopse']) ?></p>
        <div class="btns"><a href="titulo.php?id=<?= $t['id'] ?>" class="btn light">▶ Ver detalhes</a>
          <?php if ($u): ?>
            <form method="post" action="acoes.php" class="inline"><?= campo_csrf() ?><input type="hidden" name="acao" value="lista"><input type="hidden" name="titulo" value="<?= $t['id'] ?>"><input type="hidden" name="tipo" value="ver"><input type="hidden" name="modo" value="adicionar"><button class="btn ghost">+ A minha lista</button></form>
          <?php endif; ?></div>
      </div>
    </div>
  <?php endforeach; ?>
  <div class="hctl"><div class="hdots"><?php foreach ($destaques as $i => $t): ?><i class="<?= $i ? '' : 'on' ?>" data-i="<?= $i ?>"></i><?php endforeach; ?></div>
    <button type="button" data-hs="-1" aria-label="Anterior">‹</button><button type="button" data-hs="1" aria-label="Seguinte">›</button></div>
</section>

<div class="wrap filas">
  <?php if (!$u): ?>
    <div class="box cta"><div><b>Junta-te ao TavDex</b><p>Avalia filmes e séries, cria listas, recebe recomendações e apresenta os teus projetos.</p></div><a class="btn primary sm" href="registar.php">Criar conta grátis</a></div>
  <?php endif; ?>
  <?php fila('A minha lista', $minha_lista, 'listas.php?l=ver'); ?>
  <?php fila('Recomendado para ti', $recomendados, 'perfil.php?u=' . urlencode($u['nome'] ?? '') . '#recomendados'); ?>
  <?php if ($top10): ?>
    <section class="row"><div class="row-head"><h2>Top 10 no TavDex</h2><a href="catalogo.php?ordem=nota">Ver tudo →</a></div><?= top10($top10) ?></section>
  <?php endif; ?>
  <?php fila('Mais populares', $populares, 'catalogo.php?ordem=populares', true); ?>
  <?php foreach ($generos as $g): ?>
    <?php fila($g['nome'], linhas(SQL_TITULOS . ' WHERE t.id IN (SELECT titulo_id FROM titulo_generos WHERE genero_id = ?) ORDER BY media DESC LIMIT 12', [$g['id']]), 'catalogo.php?genero=' . $g['id']); ?>
  <?php endforeach; ?>
  <?php fila('Novidades', $novidades, 'catalogo.php?ordem=recentes'); ?>
  <section class="row"><div class="row-head"><h2>Projetos da comunidade</h2><a href="projetos.php">Ver tudo →</a></div>
    <div class="pjrow"><?php foreach ($projetos as $p) echo cartao_projeto($p); ?></div></section>
</div>
<?php require 'rodape.php'; ?>
