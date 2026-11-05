<?php
// Passo 9 – Página de perfil dos utilizadores
require 'lib.php';

$nome = $_GET['u'] ?? (eu()['nome'] ?? '');
$p = $nome !== '' ? linha('SELECT * FROM utilizadores WHERE nome = ?', [$nome]) : null;
if (!$p) {
    if (!eu()) ir('login.php');
    http_response_code(404);
    $titulo = 'Perfil não encontrado';
    require 'cabecalho.php';
    echo '<div class="content"><div class="left"><h1 class="ph">Utilizador não encontrado</h1></div></div>';
    require 'rodape.php';
    exit;
}
$id = (int)$p['id'];
$meu = eu() && (int)eu()['id'] === $id;

$n_seguidores = (int)valor('SELECT COUNT(*) FROM seguidores WHERE seguido_id = ?', [$id]);
$n_seguindo = (int)valor('SELECT COUNT(*) FROM seguidores WHERE seguidor_id = ?', [$id]);
$sigo = eu() && !$meu && valor('SELECT COUNT(*) FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?', [eu()['id'], $id]);

/** Títulos de uma lista do utilizador. */
function lista_de(int $id, string $tipo): array
{
    return linhas(SQL_TITULOS . ' JOIN listas l ON l.titulo_id = t.id WHERE l.utilizador_id = ? AND l.tipo = ? ORDER BY l.criado_em DESC', [$id, $tipo]);
}
$favoritos = lista_de($id, 'favorito');
$para_ver = lista_de($id, 'ver');
$vistos = lista_de($id, 'visto');
$avaliacoes = linhas('SELECT a.*, t.nome, t.id AS tid FROM avaliacoes a JOIN titulos t ON t.id = a.titulo_id WHERE a.utilizador_id = ? ORDER BY a.criado_em DESC', [$id]);
$projetos = linhas(SQL_PROJETOS . ' WHERE p.dono_id = ? OR p.id IN (SELECT projeto_id FROM projeto_equipa WHERE utilizador_id = ?) ORDER BY p.criado_em DESC', [$id, $id]);
$seguidores = linhas('SELECT u.* FROM seguidores s JOIN utilizadores u ON u.id = s.seguidor_id WHERE s.seguido_id = ? ORDER BY s.criado_em DESC', [$id]);
$recomendados = $meu ? recomendacoes($id, 10) : [];
$compat = eu() && !$meu ? compatibilidade((int)eu()['id'], $id) : null;

// Géneros preferidos: contagem dos géneros dos favoritos e das avaliações com 4 ou 5 estrelas
$generos = linhas("SELECT g.nome, COUNT(*) AS n FROM generos g JOIN titulo_generos tg ON tg.genero_id = g.id
                   WHERE tg.titulo_id IN (SELECT titulo_id FROM listas WHERE utilizador_id = ? AND tipo = 'favorito')
                      OR tg.titulo_id IN (SELECT titulo_id FROM avaliacoes WHERE utilizador_id = ? AND nota >= 4)
                   GROUP BY g.nome ORDER BY n DESC, g.nome LIMIT 5", [$id, $id]);
$max = $generos ? $generos[0]['n'] : 1;

function grelha(array $titulos, string $vazio): string
{
    if (!$titulos) return '<p class="empty">' . e($vazio) . '</p>';
    return '<div class="grid g5">' . implode('', array_map('cartao_titulo', $titulos)) . '</div>';
}

$titulo = $p['nome'];
require 'cabecalho.php';
?>
<div class="content"><div class="left">
  <div class="box pbn" style="--h:<?= (int)$p['cor'] ?>">
    <?= avatar($p, 'l') ?>
    <div class="pinfo">
      <h2><?= e($p['nome']) ?> <?php if ($p['papel'] === 'admin'): ?><span class="badge" style="--c:330">Admin</span><?php endif; ?></h2>
      <small class="hd">Membro desde <?= date('m/Y', strtotime($p['criado_em'])) ?><?= $p['localizacao'] ? ' · 📍 ' . e($p['localizacao']) : '' ?></small>
      <?php if ($p['bio']): ?><p class="bio"><?= e($p['bio']) ?></p><?php endif; ?>
    </div>
    <?php if ($meu): ?>
      <a class="btn ghost sm" href="editar_perfil.php">✎ Editar perfil</a>
    <?php elseif (eu()): ?>
      <div class="btns">
        <form method="post" action="acoes.php" class="inline"><?= campo_csrf() ?><input type="hidden" name="acao" value="seguir"><input type="hidden" name="id" value="<?= $id ?>">
          <button class="btn <?= $sigo ? 'ghost' : 'primary' ?> sm"><?= $sigo ? 'A seguir ✓' : '+ Seguir' ?></button></form>
        <a class="btn ghost sm" href="chat.php?com=<?= $id ?>">Mensagem</a>
      </div>
    <?php endif; ?>
  </div>

  <div class="pstats">
    <div class="box ps"><b><?= $n_seguidores ?></b><span>Seguidores</span></div>
    <div class="box ps"><b><?= $n_seguindo ?></b><span>A seguir</span></div>
    <div class="box ps"><b><?= count($avaliacoes) ?></b><span>Avaliações</span></div>
    <div class="box ps"><b><?= count($vistos) ?></b><span>Vistos</span></div>
    <div class="box ps"><b><?= count($projetos) ?></b><span>Projetos</span></div>
  </div>

  <div class="dcols"><div>
    <div class="tabsbox">
      <div class="tabs">
        <button data-tab="fav" class="on">Favoritos (<?= count($favoritos) ?>)</button>
        <button data-tab="ver">Para ver (<?= count($para_ver) ?>)</button>
        <button data-tab="vis">Vistos (<?= count($vistos) ?>)</button>
        <button data-tab="ava">Avaliações</button>
        <button data-tab="prj">Projetos</button>
        <?php if ($meu): ?><button data-tab="recomendados">Recomendados</button><?php endif; ?>
        <button data-tab="seg">Seguidores</button>
      </div>
      <div data-pane="fav"><?= grelha($favoritos, 'Ainda não há favoritos.') ?></div>
      <div data-pane="ver" hidden><?= grelha($para_ver, 'A lista está vazia.') ?></div>
      <div data-pane="vis" hidden><?= grelha($vistos, 'Ainda não marcou nada como visto.') ?></div>
      <div data-pane="ava" hidden>
        <?php if (!$avaliacoes): ?><p class="empty">Ainda não avaliou nenhum título.</p><?php endif; ?>
        <?php foreach ($avaliacoes as $a): ?>
          <div class="box rev"><a class="lk" href="titulo.php?id=<?= $a['tid'] ?>"><b><?= e($a['nome']) ?></b></a> <?= estrelas($a['nota']) ?> <small><?= tempo($a['criado_em']) ?></small>
            <?php if ($a['review']): ?><p class="<?= $a['spoiler'] ? 'spoiler' : '' ?>"><?= nl2br(e($a['review'])) ?></p><?php endif; ?></div>
        <?php endforeach; ?>
      </div>
      <div data-pane="prj" hidden>
        <?php if (!$projetos): ?><p class="empty">Sem projetos.</p><?php else: ?><div class="pjc"><?php foreach ($projetos as $pr) echo cartao_projeto($pr); ?></div><?php endif; ?>
      </div>
      <?php if ($meu): ?><div data-pane="recomendados" hidden><?= grelha($recomendados, 'Avalia alguns títulos para receberes recomendações.') ?></div><?php endif; ?>
      <div data-pane="seg" hidden>
        <?php if (!$seguidores): ?><p class="empty">Ainda não tem seguidores.</p><?php endif; ?>
        <div class="ulist"><?php foreach ($seguidores as $s): ?><a class="rv" href="perfil.php?u=<?= urlencode($s['nome']) ?>"><?= avatar($s) ?><b><?= e($s['nome']) ?></b></a><?php endforeach; ?></div>
      </div>
    </div>
  </div><div>
    <?php if ($compat): ?>
      <div class="box compat"><h3>Compatibilidade de gostos</h3>
        <?php if ($compat['percent'] === null): ?>
          <p class="muted">Avaliaram <?= $compat['n'] ?> título<?= $compat['n'] === 1 ? '' : 's' ?> em comum. São precisos pelo menos 3 para calcular a compatibilidade.</p>
        <?php else: $pc = $compat['percent']; ?>
          <div class="anel" style="--p:<?= $pc ?>" role="img" aria-label="<?= $pc ?>% de compatibilidade"><b><?= $pc ?>%</b></div>
          <p class="frase"><?= $pc >= 85 ? 'Gostos quase iguais!' : ($pc >= 70 ? 'Têm muitos gostos em comum' : ($pc >= 50 ? 'Gostos parecidos' : 'Gostos bem diferentes')) ?></p>
          <small class="muted">Com base em <?= $compat['n'] ?> títulos que os dois avaliaram</small>
          <div class="compat-l">
            <?php if ($compat['concordam']): ?><h4>Onde concordam</h4><ul><?php foreach ($compat['concordam'] as $c): ?><li><a class="lk-u" href="titulo.php?id=<?= $c['id'] ?>"><?= e($c['nome']) ?></a><span><?= (int)$c['na'] ?>★ · <?= (int)$c['nb'] ?>★</span></li><?php endforeach; ?></ul><?php endif; ?>
            <?php if ($compat['discordam']): ?><h4>Onde discordam</h4><ul><?php foreach ($compat['discordam'] as $c): ?><li><a class="lk-u" href="titulo.php?id=<?= $c['id'] ?>"><?= e($c['nome']) ?></a><span>tu <?= (int)$c['na'] ?>★ · <?= (int)$c['nb'] ?>★</span></li><?php endforeach; ?></ul><?php endif; ?>
          </div>
        <?php endif; ?>
        <?php if ($compat['favs']): ?><div class="compat-l"><h4>Favoritos em comum</h4><ul><?php foreach (array_slice($compat['favs'], 0, 5) as $c): ?><li><a class="lk-u" href="titulo.php?id=<?= $c['id'] ?>"><?= e($c['nome']) ?></a><span>♥</span></li><?php endforeach; ?></ul></div><?php endif; ?>
      </div>
    <?php endif; ?>
    <div class="box"><h3>Géneros preferidos</h3>
      <?php if (!$generos): ?><p class="empty">Sem dados ainda.</p><?php endif; ?>
      <?php foreach ($generos as $g): ?>
        <div class="rb"><span class="gname"><?= e($g['nome']) ?></span><div class="bar"><i style="width:<?= round($g['n'] * 100 / $max) ?>%"></i></div><span><?= $g['n'] ?></span></div>
      <?php endforeach; ?>
    </div>
    <div class="box"><h3>Atividade recente</h3><div class="tl">
      <?php foreach (array_slice($avaliacoes, 0, 4) as $a): ?><p>Avaliou <?= e($a['nome']) ?> com <?= (int)$a['nota'] ?>★<small><?= tempo($a['criado_em']) ?></small></p><?php endforeach; ?>
      <?php if (!$avaliacoes): ?><p>Juntou-se ao TavDex<small><?= tempo($p['criado_em']) ?></small></p><?php endif; ?>
    </div></div>
  </div></div>
</div></div>
<?php require 'rodape.php'; ?>
