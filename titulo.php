<?php
// Passo 25 – Página individual de cada filme e série
// Passo 34 – Classificações (1 a 5 estrelas)
// Passo 35 – Reviews (com indicação de spoilers)
// Passo 36 – Editar a review (titulo.php?id=…&editar=1)
// Passo 37 – Apagar a review (op "apagar")
// Passos 39, 40 e 42 – Botões para Favoritos, Vistos e Para ver (tratados em acoes.php)
require 'lib.php';

$id = (int)($_GET['id'] ?? 0);
$t = linha(SQL_TITULOS . ' WHERE t.id = ?', [$id]);
if (!$t) {
    http_response_code(404);
    $titulo = 'Título não encontrado';
    require 'cabecalho.php';
    echo '<div class="content"><div class="left"><h1 class="ph">Título não encontrado</h1><p><a class="lk" href="catalogo.php">Ver o catálogo</a></p></div></div>';
    require 'rodape.php';
    exit;
}
$u = eu();

// ---------------------------------------------------------------------
// Ações (só com sessão iniciada)
// ---------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verificar_csrf();
    $u = exigir_login();
    switch ($_POST['op'] ?? '') {

        // Passos 34, 35 e 36 – avaliar e escrever a review (se já existir, é editada)
        case 'avaliar':
            $nota = (int)($_POST['nota'] ?? 0);
            if ($nota < 1 || $nota > 5) { aviso('Escolhe de 1 a 5 estrelas.', 'erro'); break; }
            $review = mb_substr(campo('review'), 0, 2000);
            if ($review !== '' && n_links($review) > 2) { aviso('A review tem links a mais.', 'erro'); break; }
            $spoiler = ($review !== '' && !empty($_POST['spoiler'])) ? 1 : 0;
            $existe = valor('SELECT id FROM avaliacoes WHERE utilizador_id = ? AND titulo_id = ?', [$u['id'], $id]);
            if ($existe) {
                sql('UPDATE avaliacoes SET nota = ?, review = ?, spoiler = ?, editado_em = ? WHERE id = ?',
                    [$nota, $review !== '' ? $review : null, $spoiler, agora(), $existe]);
                aviso('Avaliação atualizada.');
            } else {
                sql('INSERT INTO avaliacoes (utilizador_id, titulo_id, nota, review, spoiler, criado_em) VALUES (?, ?, ?, ?, ?, ?)',
                    [$u['id'], $id, $nota, $review !== '' ? $review : null, $spoiler, agora()]);
                // Quem avalia já viu: sai de "Para ver" e passa para "Vistos"
                sql("DELETE FROM listas WHERE utilizador_id = ? AND titulo_id = ? AND tipo = 'ver'", [$u['id'], $id]);
                if (!valor("SELECT COUNT(*) FROM listas WHERE utilizador_id = ? AND titulo_id = ? AND tipo = 'visto'", [$u['id'], $id])) {
                    sql("INSERT INTO listas (utilizador_id, titulo_id, tipo, criado_em) VALUES (?, ?, 'visto', ?)", [$u['id'], $id, agora()]);
                }
                aviso('Obrigado pela avaliação!');
            }
            break;

        // Passo 37 – apagar a review: o autor apaga a sua; um administrador pode apagar qualquer uma
        case 'apagar':
            $a = linha('SELECT * FROM avaliacoes WHERE id = ? AND titulo_id = ?', [(int)$_POST['avaliacao'], $id]);
            if ($a && ((int)$a['utilizador_id'] === (int)$u['id'] || e_admin())) {
                sql('DELETE FROM avaliacoes WHERE id = ?', [$a['id']]);
                aviso('Avaliação apagada.');
            }
            break;
    }
    ir('titulo.php?id=' . $id . '#reviews');
}

// ---------------------------------------------------------------------
// Dados da página
// ---------------------------------------------------------------------
$e_filme = $t['tipo'] === 'filme';
$generos = linhas('SELECT g.id, g.nome FROM generos g JOIN titulo_generos tg ON tg.genero_id = g.id WHERE tg.titulo_id = ? ORDER BY g.nome', [$id]);
$plataformas = plataformas_titulo($id);
$temporadas = $e_filme ? [] : linhas('SELECT * FROM temporadas WHERE titulo_id = ? ORDER BY numero', [$id]);
$n_episodios = array_sum(array_column($temporadas, 'episodios'));

// Em que listas o utilizador já tem este título
$nas_listas = $u ? array_column(linhas('SELECT tipo FROM listas WHERE utilizador_id = ? AND titulo_id = ?', [$u['id'], $id]), 'tipo') : [];

// Reviews: as mais recentes ou as melhores primeiro
$ordem = ($_GET['ordem'] ?? '') === 'melhores' ? 'a.nota DESC, a.criado_em DESC' : 'a.criado_em DESC';
$avaliacoes = linhas("SELECT a.*, u.nome, u.cor FROM avaliacoes a JOIN utilizadores u ON u.id = a.utilizador_id
                      WHERE a.titulo_id = ? ORDER BY $ordem", [$id]);
$minha = null;
foreach ($avaliacoes as $a) if ($u && (int)$a['utilizador_id'] === (int)$u['id']) $minha = $a;
$editar = $minha && isset($_GET['editar']);

// Quantas avaliações de cada nota (barras de 5 a 1)
$por_nota = array_fill(1, 5, 0);
foreach ($avaliacoes as $a) $por_nota[(int)$a['nota']]++;

// Títulos parecidos: partilham géneros, ordenados pelos géneros em comum e pela média
$parecidos = $generos ? linhas(SQL_TITULOS . ' WHERE t.id <> ? AND t.id IN (SELECT titulo_id FROM titulo_generos WHERE genero_id IN (' .
    implode(',', array_map('intval', array_column($generos, 'id'))) . '))
    ORDER BY (SELECT COUNT(*) FROM titulo_generos x WHERE x.titulo_id = t.id AND x.genero_id IN (' .
    implode(',', array_map('intval', array_column($generos, 'id'))) . ')) DESC, media DESC LIMIT 12', [$id]) : [];

/** Botão para pôr ou tirar o título de uma lista (o pedido vai para acoes.php). */
function botao_lista(int $titulo, string $tipo, bool $ja_tem, string $sim, string $nao): string
{
    return '<form method="post" action="acoes.php" class="inline">' . campo_csrf() .
        '<input type="hidden" name="acao" value="lista"><input type="hidden" name="titulo" value="' . $titulo . '">' .
        '<input type="hidden" name="tipo" value="' . $tipo . '"><input type="hidden" name="modo" value="' . ($ja_tem ? 'remover' : 'adicionar') . '">' .
        '<button class="btn ' . ($ja_tem ? 'primary' : 'ghost') . ' sm">' . ($ja_tem ? $sim : $nao) . '</button></form>';
}

/** Formulário de denúncia de uma review (abre ao clicar). */
function denunciar_review(int $id): string
{
    return '<details class="rep-d"><summary title="Denunciar">⚑</summary><form method="post" action="acoes.php">' . campo_csrf() .
        '<input type="hidden" name="acao" value="denunciar"><input type="hidden" name="tipo" value="review"><input type="hidden" name="alvo" value="' . $id . '">' .
        '<select name="motivo"><option>Spam</option><option>Ofensivo</option><option>Spoilers</option><option>Outro</option></select><button class="btn ghost sm">Denunciar</button></form></details>';
}

$titulo = $t['nome'];
$ativo = $e_filme ? 'Filmes' : 'Séries';
$img = fundo($t);
require 'cabecalho.php';
?>
<section class="det"<?= $img ? " style=\"--img:url('" . e($img) . "')\"" : '' ?>><div class="det-in">
  <?= cartaz($t) ?>
  <div class="det-txt">
    <span class="tag"><?= $e_filme ? 'FILME' : 'SÉRIE' ?><?= !$e_filme && $t['em_curso'] ? ' · EM CURSO' : '' ?></span>
    <h1><?= e($t['nome']) ?></h1>
    <p class="meta">
      <?php if ($t['media'] !== null): ?><span class="star"><i class="st">★</i> <?= number_format((float)$t['media'], 1) ?> <small>(<?= (int)$t['n_aval'] ?>)</small></span><?php endif; ?>
      <span><?= (int)$t['ano'] ?></span>
      <?php if ($e_filme && $t['duracao_min']): ?><span><?= intdiv((int)$t['duracao_min'], 60) ?>h <?= str_pad((string)((int)$t['duracao_min'] % 60), 2, '0', STR_PAD_LEFT) ?>m</span><?php endif; ?>
      <?php if ($temporadas): ?><span><?= count($temporadas) ?> temporada<?= count($temporadas) > 1 ? 's' : '' ?></span><?php endif; ?>
      <span class="age"><?= e($t['idade']) ?></span>
    </p>
    <?php if ($generos): ?><div class="gen-chips"><?php foreach ($generos as $g): ?><span><?= e($g['nome']) ?></span><?php endforeach; ?></div><?php endif; ?>
    <p class="desc"><?= nl2br(e($t['sinopse'])) ?></p>
    <?php if ($t['realizador'] !== ''): ?><p class="cred"><span><?= $e_filme ? 'Realização' : 'Criação' ?>:</span> <?= e($t['realizador']) ?></p><?php endif; ?>
    <?php if ($plataformas): ?>
      <div class="onde"><span>Onde ver</span><?php foreach ($plataformas as $p) echo etiqueta_plataforma($p); ?></div>
    <?php endif; ?>
    <div class="btns">
      <?php if ($u): ?>
        <?= botao_lista($id, 'favorito', in_array('favorito', $nas_listas, true), '♥ Nos favoritos', '♡ Favorito') ?>
        <?= botao_lista($id, 'ver', in_array('ver', $nas_listas, true), '✓ Na lista Para ver', '+ Para ver') ?>
        <?= botao_lista($id, 'visto', in_array('visto', $nas_listas, true), '✓ Visto', '👁 Marcar como visto') ?>
        <a class="btn light sm" href="#reviews" data-ir-tab="reviews">★ <?= $minha ? 'A minha avaliação' : 'Avaliar' ?></a>
      <?php else: ?>
        <a class="btn primary sm" href="login.php?voltar=<?= urlencode('titulo.php?id=' . $id) ?>">Inicia sessão para avaliar e guardar nas tuas listas</a>
      <?php endif; ?>
      <?php if (e_admin()): ?><a class="btn ghost sm" href="admin_titulo.php?id=<?= $id ?>">✎ Editar</a><?php endif; ?>
    </div>
  </div>
</div></section>

<div class="content"><div class="left">
  <div class="tabsbox">
    <div class="tabs">
      <button data-tab="reviews" class="on">Reviews (<?= count($avaliacoes) ?>)</button>
      <?php if (!$e_filme): ?><button data-tab="temporadas">Temporadas (<?= count($temporadas) ?>)</button><?php endif; ?>
      <button data-tab="detalhes">Detalhes</button>
      <?php if ($parecidos): ?><button data-tab="parecidos">Parecidos</button><?php endif; ?>
    </div>

    <!-- Reviews (passos 34 a 37) -->
    <div data-pane="reviews">
      <div class="dcols"><div>
        <?php if ($avaliacoes): ?>
          <p class="cr">Ordenar: <a class="lk" href="?id=<?= $id ?>#reviews">mais recentes</a> · <a class="lk" href="?id=<?= $id ?>&amp;ordem=melhores#reviews">melhores notas</a></p>
        <?php else: ?>
          <p class="empty">Ainda ninguém avaliou <?= e($t['nome']) ?>. Sê o primeiro!</p>
        <?php endif; ?>
        <?php foreach ($avaliacoes as $a): $eu_sou = $u && (int)$a['utilizador_id'] === (int)$u['id']; ?>
          <div class="box rv" id="av<?= (int)$a['id'] ?>"><?= avatar($a) ?><div>
            <b><?= link_perfil($a) ?></b> <?= estrelas($a['nota']) ?> <small><?= tempo($a['criado_em']) ?><?= $a['editado_em'] ? ' · editada' : '' ?></small>
            <?php if ($a['review']): ?>
              <?php if ($a['spoiler']): ?>
                <details class="spoiler-d"><summary>⚠ Esta review tem spoilers — carregar para ler</summary><p><?= nl2br(e($a['review'])) ?></p></details>
              <?php else: ?>
                <p><?= nl2br(e($a['review'])) ?></p>
              <?php endif; ?>
            <?php endif; ?>
          </div>
          <div class="acts">
            <?php if ($eu_sou): ?><a class="btn ghost sm" href="?id=<?= $id ?>&amp;editar=1#reviews" title="Editar">✎</a><?php endif; ?>
            <?php if ($eu_sou || e_admin()): ?>
              <form method="post" class="inline" data-confirm="Apagar esta avaliação?"><?= campo_csrf() ?><input type="hidden" name="op" value="apagar"><input type="hidden" name="avaliacao" value="<?= (int)$a['id'] ?>"><button class="del-btn" title="Apagar">🗑</button></form>
            <?php elseif ($u && $a['review']): ?>
              <?= denunciar_review((int)$a['id']) ?>
            <?php endif; ?>
          </div></div>
        <?php endforeach; ?>
      </div><div>
        <div class="box"><h3>Classificação</h3>
          <div class="score"><b><?= $t['media'] !== null ? number_format((float)$t['media'], 1) : '–' ?></b><?= $t['media'] !== null ? estrelas($t['media']) : '' ?></div>
          <small class="muted"><?= count($avaliacoes) ?> avaliação<?= count($avaliacoes) === 1 ? '' : 'ões' ?></small>
          <?php if ($avaliacoes): ?>
            <div class="ig">
              <?php for ($n = 5; $n >= 1; $n--): ?><div><small><?= $n ?>★</small><?= $por_nota[$n] ?> (<?= (int)round($por_nota[$n] / count($avaliacoes) * 100) ?>%)</div><?php endfor; ?>
            </div>
          <?php endif; ?>
        </div>

        <div class="box"><h3><?= $minha ? 'A minha avaliação' : 'Avaliar' ?></h3>
          <?php if (!$u): ?>
            <p><a class="lk" href="login.php?voltar=<?= urlencode('titulo.php?id=' . $id . '#reviews') ?>">Inicia sessão</a> para dares a tua nota e escreveres uma review.</p>
          <?php elseif ($minha && !$editar): ?>
            <p><?= estrelas($minha['nota']) ?> <small class="muted"><?= tempo($minha['criado_em']) ?></small></p>
            <?php if ($minha['review']): ?><p class="muted"><?= e(mb_strimwidth($minha['review'], 0, 140, '…')) ?></p><?php endif; ?>
            <a class="btn ghost sm" href="?id=<?= $id ?>&amp;editar=1#reviews">✎ Editar a minha avaliação</a>
          <?php else: ?>
            <form method="post" class="form rate"><?= campo_csrf() ?><input type="hidden" name="op" value="avaliar">
              <?= campo_estrelas((int)($minha['nota'] ?? 0)) ?>
              <textarea name="review" maxlength="2000" rows="4" placeholder="O que achaste? (opcional)"><?= e($minha['review'] ?? '') ?></textarea>
              <label class="chk"><input type="checkbox" name="spoiler" value="1" <?= !empty($minha['spoiler']) ? 'checked' : '' ?>> A minha review tem spoilers</label>
              <button class="btn primary sm"><?= $minha ? 'Guardar alterações' : 'Publicar avaliação' ?></button>
              <?php if ($editar): ?><a class="lk" href="?id=<?= $id ?>#reviews">Cancelar</a><?php endif; ?>
            </form>
          <?php endif; ?>
        </div>
      </div></div>
    </div>

    <?php if (!$e_filme): ?>
    <!-- Temporadas (geridas pelo administrador no passo 29) -->
    <div data-pane="temporadas" id="temporadas" hidden>
      <?php if (!$temporadas): ?><p class="empty">Ainda não há temporadas registadas.</p><?php endif; ?>
      <div class="seasons">
        <?php foreach ($temporadas as $s): ?>
          <div class="box season"><span class="s-n"><?= (int)$s['numero'] ?></span><div><b>Temporada <?= (int)$s['numero'] ?></b><small><?= (int)$s['ano'] ?> · <?= (int)$s['episodios'] ?> episódios</small></div></div>
        <?php endforeach; ?>
      </div>
    </div>
    <?php endif; ?>

    <!-- Detalhes -->
    <div data-pane="detalhes" hidden>
      <div class="ig">
        <div><small>Tipo</small><?= $e_filme ? 'Filme' : 'Série' ?></div>
        <div><small>Ano</small><?= (int)$t['ano'] ?></div>
        <?php if ($e_filme && $t['duracao_min']): ?><div><small>Duração</small><?= (int)$t['duracao_min'] ?> minutos</div><?php endif; ?>
        <?php if (!$e_filme): ?>
          <div><small>Temporadas</small><?= count($temporadas) ?></div>
          <div><small>Episódios</small><?= $n_episodios ?></div>
          <div><small>Estado</small><?= $t['em_curso'] ? 'Em curso' : 'Terminada' ?></div>
        <?php endif; ?>
        <div><small>Classificação etária</small><?= e($t['idade']) ?></div>
        <?php if ($t['realizador'] !== ''): ?><div><small><?= $e_filme ? 'Realização' : 'Criação' ?></small><?= e($t['realizador']) ?></div><?php endif; ?>
        <div><small>Géneros</small><?= $generos ? e(implode(', ', array_column($generos, 'nome'))) : '–' ?></div>
      </div>
      <div class="box onde-box"><h3>Onde ver</h3>
        <?php if ($plataformas): ?><div class="plats"><?php foreach ($plataformas as $p) echo etiqueta_plataforma($p); ?></div>
        <?php else: ?><p class="muted">Não sabemos em que plataformas está disponível em Portugal.</p><?php endif; ?>
      </div>
    </div>

    <?php if ($parecidos): ?>
    <!-- Títulos parecidos (mesmos géneros) -->
    <div data-pane="parecidos" hidden>
      <div class="grid g5"><?php foreach ($parecidos as $p) echo cartao_titulo($p); ?></div>
    </div>
    <?php endif; ?>
  </div>
</div></div>
<?php require 'rodape.php'; ?>
