<?php
// Passo 30 – Inserção de novos filmes e séries
// Passo 32 – Alteração de filmes e séries
// Passo 29 – Gestão de séries (temporadas e episódios)
require 'lib.php';
exigir_admin();

$id = (int)($_GET['id'] ?? $_POST['id'] ?? 0);
$t = $id ? linha('SELECT * FROM titulos WHERE id = ?', [$id]) : null;
if ($id && !$t) ir('admin.php?s=titulos');
$erros = [];
$dados = $t ?? ['nome' => '', 'tipo' => 'filme', 'ano' => date('Y'), 'duracao_min' => '', 'idade' => 'M/12', 'sinopse' => '', 'realizador' => '', 'em_curso' => 0];
$generos = linhas('SELECT * FROM generos ORDER BY nome');
$todas_plataformas = linhas('SELECT * FROM plataformas ORDER BY nome');
$plats_escolhidas = $id ? array_column(linhas('SELECT plataforma_id FROM titulo_plataformas WHERE titulo_id = ?', [$id]), 'plataforma_id') : [];
$escolhidos = $id ? array_column(linhas('SELECT genero_id FROM titulo_generos WHERE titulo_id = ?', [$id]), 'genero_id') : [];

/** Verifica uma imagem enviada (JPG, PNG ou WEBP até 3 MB) e devolve a extensão, ou null se não houver ficheiro. */
function validar_imagem(string $campo, string $nome, array &$erros): ?string
{
    $f = $_FILES[$campo] ?? null;
    if (!$f || $f['error'] === UPLOAD_ERR_NO_FILE) return null;
    if ($f['error'] !== UPLOAD_ERR_OK || $f['size'] > 3 * 1024 * 1024) { $erros[] = "O $nome tem de ter no máximo 3 MB."; return null; }
    $info = @getimagesize($f['tmp_name']);      // confirma que é mesmo uma imagem
    $ext = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'][$info['mime'] ?? ''] ?? null;
    if (!$ext) $erros[] = "O $nome tem de ser uma imagem JPG, PNG ou WEBP.";
    return $ext;
}

/** Guarda a imagem já verificada com um nome gerado pelo site (nunca o nome original). */
function guardar_imagem(string $campo, int $id, string $ext): ?string
{
    $nome = $campo . '-' . $id . '-' . time() . '.' . $ext;
    return move_uploaded_file($_FILES[$campo]['tmp_name'], __DIR__ . '/' . $nome) ? $nome : null;
}

/** Apaga um ficheiro de imagem carregado no site (as imagens do TMDB não são ficheiros). */
function apagar_ficheiro(?string $nome): void
{
    if ($nome && preg_match('/^(cartaz|fundo)-[\w.-]+$/', $nome) && is_file(__DIR__ . '/' . $nome)) unlink(__DIR__ . '/' . $nome);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verificar_csrf();
    $op = $_POST['op'] ?? 'dados';

    if ($op === 'dados') {
        $dados = [
            'nome' => mb_substr(campo('nome'), 0, 150),
            'tipo' => campo('tipo') === 'serie' ? 'serie' : 'filme',
            'ano' => (int)campo('ano'),
            'duracao_min' => campo('duracao_min') !== '' ? (int)campo('duracao_min') : null,
            'idade' => in_array(campo('idade'), ['M/6', 'M/12', 'M/14', 'M/16', 'M/18'], true) ? campo('idade') : 'M/12',
            'sinopse' => mb_substr(campo('sinopse'), 0, 3000),
            'realizador' => mb_substr(campo('realizador'), 0, 100),
            'em_curso' => isset($_POST['em_curso']) ? 1 : 0,
            'tmdb_id' => (int)campo('tmdb_id') ?: null,
        ];
        $escolhidos = array_map('intval', $_POST['generos'] ?? []);
        if (mb_strlen($dados['nome']) < 1) $erros[] = 'Indica o nome.';
        if ($dados['ano'] < 1888 || $dados['ano'] > (int)date('Y') + 5) $erros[] = 'O ano não é válido.';
        if (mb_strlen($dados['sinopse']) < 10) $erros[] = 'Escreve uma sinopse com pelo menos 10 caracteres.';
        if ($dados['tipo'] === 'serie') $dados['duracao_min'] = null; else $dados['em_curso'] = 0;
        // Novo género escrito à mão
        $novo = mb_substr(campo('novo_genero'), 0, 40);
        if ($novo !== '') {
            $gid = valor('SELECT id FROM generos WHERE nome = ?', [$novo]);
            if (!$gid) { sql('INSERT INTO generos (nome) VALUES (?)', [$novo]); $gid = bd()->lastInsertId(); }
            $escolhidos[] = (int)$gid;
        }
        if (!$escolhidos) $erros[] = 'Escolhe pelo menos um género.';
        $repetido = valor('SELECT COUNT(*) FROM titulos WHERE nome = ? AND ano = ? AND id <> ?', [$dados['nome'], $dados['ano'], $id]);
        if ($repetido) $erros[] = 'Já existe um título com esse nome e ano.';
        $ext = validar_imagem('cartaz', 'cartaz', $erros);
        $ext_fundo = validar_imagem('fundo', 'fundo', $erros);

        if (!$erros) {
            $v = [$dados['nome'], $dados['tipo'], $dados['ano'], $dados['duracao_min'], $dados['idade'], $dados['sinopse'], $dados['realizador'], $dados['em_curso'], $dados['tmdb_id']];
            if ($id) {
                sql('UPDATE titulos SET nome = ?, tipo = ?, ano = ?, duracao_min = ?, idade = ?, sinopse = ?, realizador = ?, em_curso = ?, tmdb_id = ? WHERE id = ?', [...$v, $id]);
            } else {
                sql('INSERT INTO titulos (nome, tipo, ano, duracao_min, idade, sinopse, realizador, em_curso, tmdb_id, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [...$v, agora()]);
                $id = (int)bd()->lastInsertId();
            }
            sql('DELETE FROM titulo_generos WHERE titulo_id = ?', [$id]);
            foreach (array_unique($escolhidos) as $g) sql('INSERT INTO titulo_generos (titulo_id, genero_id) VALUES (?, ?)', [$id, $g]);
            // Onde ver: plataformas escolhidas (só as que existem)
            $ids_validos = array_column($todas_plataformas, 'id');
            sql('DELETE FROM titulo_plataformas WHERE titulo_id = ?', [$id]);
            foreach (array_unique(array_map('intval', $_POST['plataformas'] ?? [])) as $pl) {
                if (in_array($pl, array_map('intval', $ids_validos), true)) sql('INSERT INTO titulo_plataformas (titulo_id, plataforma_id) VALUES (?, ?)', [$id, $pl]);
            }

            $cartaz = $ext ? guardar_imagem('cartaz', $id, $ext) : null;
            if ($cartaz) {
                apagar_ficheiro($t['cartaz'] ?? null);
                sql('UPDATE titulos SET cartaz = ? WHERE id = ?', [$cartaz, $id]);
            }
            $fundo = $ext_fundo ? guardar_imagem('fundo', $id, $ext_fundo) : null;
            if ($fundo) {
                apagar_ficheiro($t['fundo'] ?? null);
                sql('UPDATE titulos SET fundo = ? WHERE id = ?', [$fundo, $id]);
            }
            $falhou = ($ext && !$cartaz) || ($ext_fundo && !$fundo);
            aviso(($t ? 'Título atualizado.' : 'Título adicionado ao catálogo.') . ($falhou ? ' Não foi possível guardar uma das imagens.' : ''), $falhou ? 'erro' : 'ok');
            ir('admin_titulo.php?id=' . $id);
        }
    }

    if ($op === 'tirar_imagens' && $t) {
        apagar_ficheiro($t['cartaz']);
        apagar_ficheiro($t['fundo']);
        sql('UPDATE titulos SET cartaz = NULL, fundo = NULL WHERE id = ?', [$id]);
        aviso('Imagens removidas. O título volta a usar o cartaz desenhado.');
        ir('admin_titulo.php?id=' . $id);
    }

    // Imagens reais pelo TMDB (precisa da chave em config.php)
    if ($op === 'tmdb' && $t) {
        if (TMDB_CHAVE === '') aviso('Para usar o TMDB, põe a tua chave em config.php (TMDB_CHAVE).', 'erro');
        elseif (tmdb_atualizar($t)) aviso('Imagens encontradas no TMDB.');
        else aviso('Não encontrei este título no TMDB. Indica o "N.º no TMDB" e tenta outra vez.', 'erro');
        ir('admin_titulo.php?id=' . $id);
    }

    // Passo 29 – temporadas das séries
    if ($op === 'temporada' && $t && $t['tipo'] === 'serie') {
        $num = (int)$_POST['numero'];
        $ano = (int)$_POST['ano'];
        $ep = (int)$_POST['episodios'];
        if ($num < 1 || $ep < 1 || $ano < 1900) {
            $erros[] = 'Preenche o número da temporada, o ano e os episódios.';
        } else {
            if (valor('SELECT COUNT(*) FROM temporadas WHERE titulo_id = ? AND numero = ?', [$id, $num])) {
                sql('UPDATE temporadas SET ano = ?, episodios = ? WHERE titulo_id = ? AND numero = ?', [$ano, $ep, $id, $num]);
                aviso('Temporada ' . $num . ' atualizada.');
            } else {
                sql('INSERT INTO temporadas (titulo_id, numero, ano, episodios) VALUES (?, ?, ?, ?)', [$id, $num, $ano, $ep]);
                aviso('Temporada ' . $num . ' adicionada.');
            }
            ir('admin_titulo.php?id=' . $id . '#temporadas');
        }
    }
    if ($op === 'rem_temporada' && $t) {
        sql('DELETE FROM temporadas WHERE id = ? AND titulo_id = ?', [(int)$_POST['temporada'], $id]);
        aviso('Temporada removida.');
        ir('admin_titulo.php?id=' . $id . '#temporadas');
    }
}

$temporadas = $t && $t['tipo'] === 'serie' ? linhas('SELECT * FROM temporadas WHERE titulo_id = ? ORDER BY numero', [$id]) : [];
$titulo = $t ? 'Editar ' . $t['nome'] : 'Novo título';
require 'cabecalho.php';
?>
<div class="content"><div class="left narrow">
  <p><a class="lk" href="admin.php?s=titulos">← Filmes e séries</a><?php if ($t): ?> · <a class="lk" href="titulo.php?id=<?= $id ?>">Ver página</a><?php endif; ?></p>
  <h1 class="ph"><?= $t ? 'Editar ' . e($t['nome']) : 'Adicionar filme ou série' ?></h1>
  <?php foreach ($erros as $er): ?><div class="flash erro"><?= e($er) ?></div><?php endforeach; ?>

  <form method="post" enctype="multipart/form-data" class="box form">
    <?= campo_csrf() ?><input type="hidden" name="op" value="dados"><input type="hidden" name="id" value="<?= $id ?>">
    <label>Nome<input name="nome" value="<?= e($dados['nome']) ?>" required maxlength="150"></label>
    <div class="row2">
      <label>Tipo<select name="tipo" data-tipo><option value="filme" <?= $dados['tipo'] === 'filme' ? 'selected' : '' ?>>Filme</option><option value="serie" <?= $dados['tipo'] === 'serie' ? 'selected' : '' ?>>Série</option></select></label>
      <label>Ano<input type="number" name="ano" value="<?= e($dados['ano']) ?>" min="1888" max="<?= date('Y') + 5 ?>" required></label>
      <label data-so="filme">Duração (min)<input type="number" name="duracao_min" value="<?= e($dados['duracao_min']) ?>" min="1" max="999"></label>
      <label>Classificação<select name="idade"><?php foreach (['M/6', 'M/12', 'M/14', 'M/16', 'M/18'] as $i): ?><option <?= $dados['idade'] === $i ? 'selected' : '' ?>><?= $i ?></option><?php endforeach; ?></select></label>
    </div>
    <label>Realização / criação<input name="realizador" value="<?= e($dados['realizador']) ?>" maxlength="100"></label>
    <label>Sinopse<textarea name="sinopse" rows="4" required maxlength="3000"><?= e($dados['sinopse']) ?></textarea></label>
    <fieldset class="gp2"><legend>Géneros</legend>
      <?php foreach ($generos as $g): ?><label class="chip"><input type="checkbox" name="generos[]" value="<?= $g['id'] ?>" <?= in_array($g['id'], $escolhidos) ? 'checked' : '' ?>><span><?= e($g['nome']) ?></span></label><?php endforeach; ?>
      <input name="novo_genero" placeholder="Outro género (opcional)" maxlength="40">
    </fieldset>
    <fieldset class="gp2"><legend>Onde ver (subscrição em Portugal)</legend>
      <?php foreach ($todas_plataformas as $p): ?><label class="chip"><input type="checkbox" name="plataformas[]" value="<?= $p['id'] ?>" <?= in_array($p['id'], $plats_escolhidas) ? 'checked' : '' ?>><span><?= e($p['nome']) ?></span></label><?php endforeach; ?>
    </fieldset>
    <label class="chk" data-so="serie"><input type="checkbox" name="em_curso" <?= $dados['em_curso'] ? 'checked' : '' ?>> Série ainda em curso</label>
    <div class="row2">
      <label>Cartaz – vertical (JPG, PNG ou WEBP, até 3 MB)<input type="file" name="cartaz" accept="image/jpeg,image/png,image/webp"></label>
      <label>Fundo – horizontal, para o destaque (opcional)<input type="file" name="fundo" accept="image/jpeg,image/png,image/webp"></label>
    </div>
    <label>N.º no TMDB (opcional)<input type="number" name="tmdb_id" value="<?= e($dados['tmdb_id'] ?? '') ?>" min="1" placeholder="Ex.: 157336 (está no endereço da página do filme no themoviedb.org)"></label>
    <button class="btn primary"><?= $t ? 'Guardar alterações' : 'Adicionar ao catálogo' ?></button>
  </form>

  <?php if ($t): ?>
    <div class="box imgs" id="imagens"><h3>Imagens</h3>
      <div class="imgs-ver"><div class="cprev"><?= cartaz($t) ?></div>
        <?php if (fundo($t)): ?><div class="fprev" style="background-image:url('<?= e(fundo($t)) ?>')"></div><?php else: ?><p class="muted">Sem imagem de fundo: o destaque usa as cores do título.</p><?php endif; ?></div>
      <div class="btns">
        <form method="post" class="inline"><?= campo_csrf() ?><input type="hidden" name="op" value="tmdb"><input type="hidden" name="id" value="<?= $id ?>"><button class="btn primary sm">🎬 Procurar imagens no TMDB</button></form>
        <?php if ($t['cartaz'] || $t['fundo']): ?><form method="post" class="inline"><?= campo_csrf() ?><input type="hidden" name="op" value="tirar_imagens"><input type="hidden" name="id" value="<?= $id ?>"><button class="btn ghost sm">Tirar imagens</button></form><?php endif; ?>
      </div>
      <?php if (TMDB_CHAVE === ''): ?><small class="muted">Para procurar no TMDB, cria uma chave gratuita em themoviedb.org e cola-a em config.php.</small><?php endif; ?>
    </div>
  <?php endif; ?>

  <?php if ($t && $t['tipo'] === 'serie'): ?>
    <div class="box" id="temporadas"><h3>Temporadas</h3>
      <?php if (!$temporadas): ?><p class="empty">Ainda não há temporadas.</p><?php endif; ?>
      <?php foreach ($temporadas as $s): ?>
        <div class="rv li"><div><b>Temporada <?= (int)$s['numero'] ?></b> <small><?= (int)$s['ano'] ?> · <?= (int)$s['episodios'] ?> episódios</small></div>
          <form method="post" class="inline" data-confirm="Remover a temporada <?= (int)$s['numero'] ?>?"><?= campo_csrf() ?><input type="hidden" name="op" value="rem_temporada"><input type="hidden" name="id" value="<?= $id ?>"><input type="hidden" name="temporada" value="<?= $s['id'] ?>"><button class="btn ghost sm">Remover</button></form></div>
      <?php endforeach; ?>
      <form method="post" class="inline-form"><?= campo_csrf() ?><input type="hidden" name="op" value="temporada"><input type="hidden" name="id" value="<?= $id ?>">
        <input type="number" name="numero" min="1" value="<?= count($temporadas) + 1 ?>" placeholder="N.º" required aria-label="Número">
        <input type="number" name="ano" min="1900" value="<?= date('Y') ?>" placeholder="Ano" required aria-label="Ano">
        <input type="number" name="episodios" min="1" placeholder="Episódios" required aria-label="Episódios">
        <button class="btn ghost sm">Adicionar / atualizar</button></form>
      <small class="muted">Para alterar uma temporada, escreve o mesmo número com os novos valores.</small>
    </div>
  <?php endif; ?>
</div></div>
<?php require 'rodape.php'; ?>
