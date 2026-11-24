<?php
// Passo 9 – Página de perfil dos utilizadores (com seguir utilizadores)
//  · cabeçalho com o banner (cenário de cinema ou imagem própria), foto e nome de exibição
//    (cabecalho_perfil() em lib.php; o desenho do cenário é feito pelo banner-perfil.js);
//  · "Segue-te", géneros favoritos e botão Partilhar;
//  · privacidade: o dono pode esconder as listas e os seguidores (Definições).
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
$segue_te = eu() && !$meu && valor('SELECT COUNT(*) FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?', [$id, eu()['id']]);

// Privacidade escolhida pelo dono nas Definições (o dono e os administradores veem sempre tudo)
$ve_tudo = $meu || e_admin();
$ver_listas = $ve_tudo || $p['mostrar_listas'];
$ver_seguidores = $ve_tudo || $p['mostrar_seguidores'];

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
$a_seguir = linhas('SELECT u.* FROM seguidores s JOIN utilizadores u ON u.id = s.seguido_id WHERE s.seguidor_id = ? ORDER BY s.criado_em DESC', [$id]);
$generos_favoritos = array_column(linhas('SELECT g.nome FROM utilizador_generos ug JOIN generos g ON g.id = ug.genero_id WHERE ug.utilizador_id = ? ORDER BY g.nome', [$id]), 'nome');
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

/** Lista de pessoas (seguidores / a seguir). */
function lista_pessoas(array $pessoas, string $vazio): string
{
    if (!$pessoas) return '<p class="empty">' . e($vazio) . '</p>';
    $html = '<div class="ulist">';
    foreach ($pessoas as $s) {
        $html .= '<a class="rv" href="perfil.php?u=' . urlencode($s['nome']) . '">' . avatar($s) . '<span><b>' . e(nome_visivel($s)) . '</b> <small class="muted">@' . e($s['nome']) . '</small></span></a>';
    }
    return $html . '</div>';
}

// Textos para quando o dono escondeu as listas ou os seguidores
$listas_privadas = '<p class="empty">@' . e($p['nome']) . ' escolheu não mostrar as suas listas.</p>';
$seguidores_privados = '<p class="empty">@' . e($p['nome']) . ' escolheu não mostrar quem segue e quem o segue.</p>';
$so_tu_listas = $meu && !$p['mostrar_listas'] ? '<p class="so-tu">🔒 Só tu vês isto</p>' : '';
$so_tu_seguidores = $meu && !$p['mostrar_seguidores'] ? '<p class="so-tu">🔒 Só tu vês isto</p>' : '';

// Botões do cabeçalho
if ($meu) {
    $acoes = '<a class="btn ghost sm" href="editar_perfil.php">✎ Editar perfil</a>';
} elseif (eu()) {
    $acoes = '<form method="post" action="acoes.php" class="inline">' . campo_csrf() . '<input type="hidden" name="acao" value="seguir"><input type="hidden" name="id" value="' . $id . '">'
        . '<button class="btn ' . ($sigo ? 'ghost' : 'primary') . ' sm">' . ($sigo ? 'A seguir ✓' : '+ Seguir') . '</button></form>'
        . '<a class="btn ghost sm" href="chat.php?com=' . $id . '">Mensagem</a>';
} else {
    $acoes = '<a class="btn primary sm" href="login.php?voltar=' . urlencode('perfil.php?u=' . $p['nome']) . '">+ Seguir</a>';
}
$acoes .= '<button class="btn ghost sm" type="button" data-copiar="' . e(URL_SITE . '/perfil.php?u=' . urlencode($p['nome'])) . '">Partilhar</button>';

// Perfil acabado de criar: cartão de boas-vindas só para o dono
$perfil_vazio = $meu && !$p['bio'] && !$avaliacoes && !$favoritos && !$n_seguidores && !$n_seguindo;

$titulo = nome_visivel($p) . ' (@' . $p['nome'] . ')';
$com_banner = true;   // o rodapé carrega o banner-perfil.js
require 'cabecalho.php';
?>
<div class="content"><div class="left">
  <?= cabecalho_perfil($p, [
      'acoes' => $acoes,
      'segue_te' => $segue_te,
      'generos' => $generos_favoritos,
      'contagens' => ['seguidores' => $n_seguidores, 'a_seguir' => $n_seguindo, 'avaliacoes' => count($avaliacoes), 'vistos' => count($vistos), 'projetos' => count($projetos)],
  ]) ?>

  <?php if ($perfil_vazio): ?>
    <div class="box cta boas-vindas"><div>
      <b>Bem-vindo ao TavDex, <?= e(nome_visivel($p)) ?>!</b>
      <p>O teu perfil ainda está vazio. Avalia o que já viste, segue outras pessoas e conta um pouco sobre ti.</p></div>
      <div class="btns"><a class="btn primary sm" href="catalogo.php">Explorar o catálogo</a>
        <a class="btn ghost sm" href="comunidade.php">Ver a comunidade</a>
        <a class="btn ghost sm" href="editar_perfil.php">Completar o perfil</a></div></div>
  <?php endif; ?>

  <div class="dcols"><div>
    <div class="tabsbox">
      <div class="tabs">
        <button data-tab="fav" class="on">Favoritos<?= $ver_listas ? ' (' . count($favoritos) . ')' : '' ?></button>
        <button data-tab="ver">Para ver<?= $ver_listas ? ' (' . count($para_ver) . ')' : '' ?></button>
        <button data-tab="vis">Vistos<?= $ver_listas ? ' (' . count($vistos) . ')' : '' ?></button>
        <button data-tab="ava">Avaliações</button>
        <button data-tab="prj">Projetos</button>
        <?php if ($meu): ?><button data-tab="recomendados">Recomendados</button><?php endif; ?>
        <button data-tab="seg">Seguidores</button>
        <button data-tab="aseg">A seguir</button>
      </div>
      <div data-pane="fav"><?= $ver_listas ? $so_tu_listas . grelha($favoritos, 'Ainda não há favoritos.') : $listas_privadas ?></div>
      <div data-pane="ver" hidden><?= $ver_listas ? $so_tu_listas . grelha($para_ver, 'A lista está vazia.') : $listas_privadas ?></div>
      <div data-pane="vis" hidden><?= $ver_listas ? $so_tu_listas . grelha($vistos, 'Ainda não marcou nada como visto.') : $listas_privadas ?></div>
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
      <div data-pane="seg" hidden><?= $ver_seguidores ? $so_tu_seguidores . lista_pessoas($seguidores, 'Ainda não tem seguidores.') : $seguidores_privados ?></div>
      <div data-pane="aseg" hidden><?= $ver_seguidores ? $so_tu_seguidores . lista_pessoas($a_seguir, 'Ainda não segue ninguém.') : $seguidores_privados ?></div>
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
