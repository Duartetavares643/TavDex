<?php
// Passo 23 – Página de administração
// Passo 29 – Gestão de séries (separador Séries)
// Passo 31 – Listagem de filmes e séries (separador Títulos)
// Passo 33 – Remoção de filmes e séries
require 'lib.php';
exigir_admin();
$eu = eu();
$sec = $_GET['s'] ?? 'resumo';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verificar_csrf();
    $id = (int)($_POST['id'] ?? 0);
    switch ($_POST['op'] ?? '') {
        case 'bloquear':
            if ($id !== (int)$eu['id']) {
                sql('UPDATE utilizadores SET bloqueado = 1 - bloqueado WHERE id = ?', [$id]);
                aviso(valor('SELECT bloqueado FROM utilizadores WHERE id = ?', [$id]) ? 'Utilizador bloqueado.' : 'Utilizador desbloqueado.');
            }
            break;
        case 'papel':
            if ($id !== (int)$eu['id']) {
                sql("UPDATE utilizadores SET papel = CASE WHEN papel = 'admin' THEN 'utilizador' ELSE 'admin' END WHERE id = ?", [$id]);
                aviso('Papel alterado.');
            }
            break;
        case 'apagar_utilizador':
            if ($id !== (int)$eu['id']) {
                sql('DELETE FROM utilizadores WHERE id = ?', [$id]);
                aviso('Utilizador apagado.');
            }
            break;
        case 'apagar_titulo':
            $cartaz = valor('SELECT cartaz FROM titulos WHERE id = ?', [$id]);
            if ($cartaz && is_file(__DIR__ . '/' . $cartaz)) unlink(__DIR__ . '/' . $cartaz);
            sql('DELETE FROM titulos WHERE id = ?', [$id]);
            aviso('Título removido.');
            break;
        // Procura no TMDB as imagens de todos os títulos que ainda não as têm
        case 'tmdb_todos':
            if (TMDB_CHAVE === '') { aviso('Para usar o TMDB, põe a tua chave em config.php (TMDB_CHAVE).', 'erro'); break; }
            set_time_limit(300);
            $ok = $falha = 0;
            foreach (linhas('SELECT * FROM titulos WHERE cartaz IS NULL OR fundo IS NULL') as $t) {
                tmdb_atualizar($t) ? $ok++ : $falha++;
            }
            aviso("Imagens do TMDB: $ok títulos atualizados" . ($falha ? ", $falha não encontrados (indica o N.º no TMDB na página de cada um)" : '') . '.');
            break;
        case 'apagar_projeto':
            $p = linha('SELECT dono_id, titulo FROM projetos WHERE id = ?', [$id]);
            if ($p) {
                notificar((int)$p['dono_id'], 'projeto', 'O teu projeto ' . $p['titulo'] . ' foi removido por um administrador.', 'projetos.php');
                sql('DELETE FROM projetos WHERE id = ?', [$id]);
                aviso('Projeto removido.');
            }
            break;
        // Denúncias: ignorar, apagar o conteúdo denunciado ou bloquear o autor
        case 'denuncia':
            $d = linha('SELECT * FROM denuncias WHERE id = ?', [$id]);
            if (!$d) break;
            $alvo = conteudo_denunciado($d);
            $acao = $_POST['acao'] ?? '';
            if ($acao === 'ignorar') {
                sql("UPDATE denuncias SET estado = 'ignorada' WHERE id = ?", [$id]);
            } elseif ($acao === 'apagar' && $alvo) {
                $tabela = ['publicacao' => 'publicacoes', 'comentario' => 'comentarios', 'review' => 'avaliacoes', 'mensagem' => 'mensagens'][$d['tipo']];
                if ($d['tipo'] === 'review') sql('UPDATE avaliacoes SET review = NULL, spoiler = 0 WHERE id = ?', [$d['alvo_id']]);
                else sql("DELETE FROM $tabela WHERE id = ?", [$d['alvo_id']]);
                notificar((int)$alvo['autor_id'], 'sistema', 'Um conteúdo teu foi removido por violar as regras (' . $d['motivo'] . ').', '');
                sql("UPDATE denuncias SET estado = 'resolvida' WHERE tipo = ? AND alvo_id = ?", [$d['tipo'], $d['alvo_id']]);
            } elseif ($acao === 'bloquear' && $alvo && (int)$alvo['autor_id'] !== (int)$eu['id']) {
                sql('UPDATE utilizadores SET bloqueado = 1 WHERE id = ?', [$alvo['autor_id']]);
                sql("UPDATE denuncias SET estado = 'resolvida' WHERE id = ?", [$id]);
            }
            aviso('Denúncia tratada.');
            break;
    }
    ir('admin.php?' . http_build_query(array_intersect_key($_GET, ['s' => 1, 'q' => 1])));
}

/** Devolve o texto e o autor do conteúdo de uma denúncia (ou null se já não existir). */
function conteudo_denunciado(array $d): ?array
{
    return match ($d['tipo']) {
        'publicacao' => linha('SELECT texto, utilizador_id AS autor_id FROM publicacoes WHERE id = ?', [$d['alvo_id']]),
        'comentario' => linha('SELECT texto, utilizador_id AS autor_id FROM comentarios WHERE id = ?', [$d['alvo_id']]),
        'review' => linha('SELECT review AS texto, utilizador_id AS autor_id FROM avaliacoes WHERE id = ? AND review IS NOT NULL', [$d['alvo_id']]),
        'mensagem' => linha('SELECT texto, de_id AS autor_id FROM mensagens WHERE id = ?', [$d['alvo_id']]),
        default => null,
    };
}

$q = trim($_GET['q'] ?? '');
$n_util = (int)valor('SELECT COUNT(*) FROM utilizadores');
$n_filmes = (int)valor("SELECT COUNT(*) FROM titulos WHERE tipo = 'filme'");
$n_series = (int)valor("SELECT COUNT(*) FROM titulos WHERE tipo = 'serie'");
$n_proj = (int)valor('SELECT COUNT(*) FROM projetos');
$n_den = (int)valor("SELECT COUNT(*) FROM denuncias WHERE estado = 'pendente'");
$n_aval = (int)valor('SELECT COUNT(*) FROM avaliacoes');
$novos_semana = (int)valor('SELECT COUNT(*) FROM utilizadores WHERE criado_em >= ?', [date('Y-m-d H:i:s', strtotime('-7 days'))]);

$titulo = 'Administração';
require 'cabecalho.php';
$abas = ['resumo' => 'Resumo', 'utilizadores' => 'Utilizadores', 'titulos' => 'Filmes e séries', 'series' => 'Séries e temporadas', 'projetos' => 'Projetos', 'denuncias' => 'Denúncias' . ($n_den ? " ($n_den)" : '')];
?>
<div class="content admc"><div class="left">
  <div class="ah"><div><h1 class="ph">Painel de administração</h1><small>Visão geral do TavDex</small></div>
    <a class="btn primary sm" href="admin_titulo.php">+ Adicionar filme ou série</a></div>
  <div class="sg">
    <div class="sc" style="--c:330"><span class="si">👥</span><div><b><?= $n_util ?></b><span>Utilizadores</span><small><?= $novos_semana ?> novos esta semana</small></div></div>
    <div class="sc" style="--c:215"><span class="si">🎬</span><div><b><?= $n_filmes + $n_series ?></b><span>Filmes e séries</span><small><?= $n_filmes ?> filmes · <?= $n_series ?> séries</small></div></div>
    <div class="sc" style="--c:150"><span class="si">🎞</span><div><b><?= $n_proj ?></b><span>Projetos</span><small><?= $n_aval ?> avaliações no site</small></div></div>
    <div class="sc" style="--c:35"><span class="si">⚑</span><div><b><?= $n_den ?></b><span>Denúncias pendentes</span><small><a class="lk" href="?s=denuncias">rever</a></small></div></div>
  </div>
  <div class="tabs links"><?php foreach ($abas as $k => $n): ?><a class="<?= $sec === $k ? 'on' : '' ?>" href="?s=<?= $k ?>"><?= $n ?></a><?php endforeach; ?></div>

<?php if ($sec === 'resumo'):
    // Registos por mês (últimos 6 meses)
    $meses = [];
    for ($i = 5; $i >= 0; $i--) $meses[date('Y-m', strtotime("first day of -$i month"))] = 0;
    foreach (linhas('SELECT criado_em FROM utilizadores') as $r) {
        $m = substr($r['criado_em'], 0, 7);
        if (isset($meses[$m])) $meses[$m]++;
    }
    $max = max(1, max($meses));
    $nomes_mes = ['01' => 'Jan', '02' => 'Fev', '03' => 'Mar', '04' => 'Abr', '05' => 'Mai', '06' => 'Jun', '07' => 'Jul', '08' => 'Ago', '09' => 'Set', '10' => 'Out', '11' => 'Nov', '12' => 'Dez'];
    $ultimos = linhas('SELECT * FROM utilizadores ORDER BY criado_em DESC LIMIT 5');
    $top = linhas(SQL_TITULOS . ' ORDER BY n_aval DESC LIMIT 5');
?>
  <div class="dcols"><div>
    <div class="box"><h3>Novos registos por mês</h3><div class="bars">
      <?php foreach ($meses as $m => $n): ?><div><i style="height:<?= round($n * 100 / $max) ?>%"></i><?= $n ?><br><?= $nomes_mes[substr($m, 5)] ?></div><?php endforeach; ?>
    </div></div>
    <div class="box"><h3>Títulos mais avaliados</h3>
      <?php foreach ($top as $t): ?><div class="rb"><span class="gname"><?= e($t['nome']) ?></span><div class="bar"><i style="width:<?= round($t['n_aval'] * 100 / max(1, $top[0]['n_aval'])) ?>%"></i></div><span><?= $t['n_aval'] ?></span></div><?php endforeach; ?>
    </div>
  </div><div>
    <div class="box"><h3>Últimos registos</h3>
      <?php foreach ($ultimos as $r): ?><div class="rv"><?= avatar($r) ?><div><b><?= link_perfil($r) ?></b><br><small><?= tempo($r['criado_em']) ?></small></div></div><?php endforeach; ?>
    </div>
  </div></div>

<?php elseif ($sec === 'utilizadores'):
    [$lista, $total, $pag] = paginado('SELECT u.*, (SELECT COUNT(*) FROM avaliacoes a WHERE a.utilizador_id = u.id) AS n_aval FROM utilizadores u' .
                    ($q !== '' ? ' WHERE u.nome LIKE ? OR u.email LIKE ?' : ''), $q !== '' ? ["%$q%", "%$q%"] : [], 'ORDER BY criado_em DESC, id DESC', 25);
?>
  <form class="cf" method="get"><input type="hidden" name="s" value="utilizadores"><input name="q" value="<?= e($q) ?>" placeholder="Pesquisar por nome ou email..."><button class="btn ghost sm">Pesquisar</button></form>
  <div class="tscroll"><table><thead><tr><th>Utilizador</th><th>Email</th><th>Papel</th><th>Registo</th><th>Avaliações</th><th>Estado</th><th></th></tr></thead><tbody>
  <?php foreach ($lista as $r): $sou = (int)$r['id'] === (int)$eu['id']; ?>
    <tr><td><div class="uc"><?= avatar($r) ?><?= link_perfil($r) ?></div></td><td><?= e($r['email']) ?></td>
      <td><?= $r['papel'] === 'admin' ? '<span class="badge" style="--c:330">Admin</span>' : 'Utilizador' ?></td>
      <td><?= date('d/m/Y', strtotime($r['criado_em'])) ?></td><td><?= (int)$r['n_aval'] ?></td>
      <td><?= $r['bloqueado'] ? '<span class="badge" style="--c:0">Bloqueado</span>' : '<span class="badge" style="--c:150">Ativo</span>' ?></td>
      <td class="ac"><?php if (!$sou): ?>
        <form method="post" class="inline"><?= campo_csrf() ?><input type="hidden" name="op" value="bloquear"><input type="hidden" name="id" value="<?= $r['id'] ?>"><button class="btn ghost sm"><?= $r['bloqueado'] ? 'Desbloquear' : 'Bloquear' ?></button></form>
        <form method="post" class="inline" data-confirm="Mudar o papel de <?= e($r['nome']) ?>?"><?= campo_csrf() ?><input type="hidden" name="op" value="papel"><input type="hidden" name="id" value="<?= $r['id'] ?>"><button class="btn ghost sm"><?= $r['papel'] === 'admin' ? 'Tirar admin' : 'Tornar admin' ?></button></form>
        <form method="post" class="inline" data-confirm="Apagar a conta de <?= e($r['nome']) ?> e todos os seus dados?"><?= campo_csrf() ?><input type="hidden" name="op" value="apagar_utilizador"><input type="hidden" name="id" value="<?= $r['id'] ?>"><button class="btn ghost sm">Apagar</button></form>
      <?php else: ?><small class="muted">(tu)</small><?php endif; ?></td></tr>
  <?php endforeach; ?>
  </tbody></table></div>
  <p class="cr" style="margin-top:12px"><?= $total ?> utilizador<?= $total === 1 ? '' : 'es' ?></p>
  <?= paginacao($total, $pag, 25, array_filter(['s' => 'utilizadores', 'q' => $q])) ?>

<?php elseif ($sec === 'titulos'):
    [$lista, $total, $pag] = paginado(SQL_TITULOS . ($q !== '' ? ' WHERE t.nome LIKE ?' : ''), $q !== '' ? ["%$q%"] : [], 'ORDER BY nome', 25);
?>
  <div class="cf"><form class="cf" method="get" style="flex:1;margin:0"><input type="hidden" name="s" value="titulos"><input name="q" value="<?= e($q) ?>" placeholder="Pesquisar título..."><button class="btn ghost sm">Pesquisar</button></form>
    <form method="post" class="inline"><?= campo_csrf() ?><input type="hidden" name="op" value="tmdb_todos"><button class="btn ghost sm" title="<?= TMDB_CHAVE === '' ? 'Precisa da chave do TMDB em config.php' : 'Procura cartazes e fundos para os títulos sem imagem' ?>">🎬 Imagens do TMDB para todos</button></form></div>
  <div class="tscroll"><table><thead><tr><th>Título</th><th>Tipo</th><th>Ano</th><th>Géneros</th><th>Nota</th><th>Cartaz</th><th></th></tr></thead><tbody>
  <?php foreach ($lista as $t): ?>
    <tr><td><a class="lk-u" href="titulo.php?id=<?= $t['id'] ?>"><?= e($t['nome']) ?></a></td><td><?= $t['tipo'] === 'filme' ? 'Filme' : 'Série' ?></td><td><?= (int)$t['ano'] ?></td>
      <td><small><?= e(generos_titulo($t['id'])) ?></small></td><td><?= $t['media'] ? number_format((float)$t['media'], 1) : '–' ?></td><td><?= url_imagem($t['cartaz']) ? '✓' : '—' ?></td>
      <td class="ac"><a class="btn ghost sm" href="admin_titulo.php?id=<?= $t['id'] ?>">Editar</a>
        <form method="post" class="inline" data-confirm="Remover <?= e($t['nome']) ?>? As avaliações e listas deste título também são apagadas."><?= campo_csrf() ?><input type="hidden" name="op" value="apagar_titulo"><input type="hidden" name="id" value="<?= $t['id'] ?>"><button class="btn ghost sm">Remover</button></form></td></tr>
  <?php endforeach; ?>
  </tbody></table></div>
  <p class="cr" style="margin-top:12px"><?= $total ?> título<?= $total === 1 ? '' : 's' ?></p>
  <?= paginacao($total, $pag, 25, array_filter(['s' => 'titulos', 'q' => $q])) ?>

<?php elseif ($sec === 'series'):
    $lista = linhas("SELECT t.*, (SELECT COUNT(*) FROM temporadas s WHERE s.titulo_id = t.id) AS n_temp, (SELECT SUM(episodios) FROM temporadas s WHERE s.titulo_id = t.id) AS n_ep
                     FROM titulos t WHERE t.tipo = 'serie' ORDER BY t.nome");
?>
  <div class="tscroll"><table><thead><tr><th>Série</th><th>Estreia</th><th>Temporadas</th><th>Episódios</th><th>Estado</th><th></th></tr></thead><tbody>
  <?php foreach ($lista as $t): ?>
    <tr><td><?= e($t['nome']) ?></td><td><?= (int)$t['ano'] ?></td><td><?= (int)$t['n_temp'] ?></td><td><?= (int)$t['n_ep'] ?></td>
      <td><?= $t['em_curso'] ? '<span class="badge" style="--c:150">Em curso</span>' : '<span class="badge" style="--c:215">Terminada</span>' ?></td>
      <td class="ac"><a class="btn ghost sm" href="admin_titulo.php?id=<?= $t['id'] ?>#temporadas">Gerir temporadas</a></td></tr>
  <?php endforeach; ?>
  </tbody></table></div>

<?php elseif ($sec === 'projetos'):
    [$lista, $total, $pag] = paginado('SELECT p.*, u.nome AS dono, (SELECT COUNT(*) FROM projeto_equipa e WHERE e.projeto_id = p.id) AS membros FROM projetos p JOIN utilizadores u ON u.id = p.dono_id', [], 'ORDER BY criado_em DESC, id DESC', 25);
?>
  <div class="tscroll"><table><thead><tr><th>Projeto</th><th>Dono</th><th>Tipo</th><th>Estado</th><th>Membros</th><th></th></tr></thead><tbody>
  <?php foreach ($lista as $p): ?>
    <tr><td><a class="lk-u" href="projeto.php?id=<?= $p['id'] ?>"><?= e($p['titulo']) ?></a></td><td><?= e($p['dono']) ?></td><td><?= e($p['tipo']) ?></td><td><?= badge_estado($p['estado']) ?></td><td><?= (int)$p['membros'] ?></td>
      <td class="ac"><a class="btn ghost sm" href="projeto_editar.php?id=<?= $p['id'] ?>">Editar</a>
        <form method="post" class="inline" data-confirm="Remover o projeto <?= e($p['titulo']) ?>?"><?= campo_csrf() ?><input type="hidden" name="op" value="apagar_projeto"><input type="hidden" name="id" value="<?= $p['id'] ?>"><button class="btn ghost sm">Remover</button></form></td></tr>
  <?php endforeach; ?>
  </tbody></table></div>
  <?= paginacao($total, $pag, 25, ['s' => 'projetos']) ?>

<?php elseif ($sec === 'denuncias'):
    [$lista, $total, $pag] = paginado("SELECT d.*, u.nome AS quem, CASE WHEN d.estado = 'pendente' THEN 0 ELSE 1 END AS ordem_estado FROM denuncias d JOIN utilizadores u ON u.id = d.utilizador_id", [], 'ORDER BY ordem_estado, criado_em DESC', 25);
    $tipos = ['publicacao' => 'Publicação', 'comentario' => 'Comentário', 'review' => 'Review', 'mensagem' => 'Mensagem'];
?>
  <?php if (!$lista): ?><p class="empty">Não há denúncias.</p><?php endif; ?>
  <div class="tscroll"><table><thead><tr><th>Tipo</th><th>Conteúdo</th><th>Autor</th><th>Denunciado por</th><th>Motivo</th><th>Estado</th><th></th></tr></thead><tbody>
  <?php foreach ($lista as $d): $alvo = conteudo_denunciado($d); $autor = $alvo ? linha('SELECT nome, bloqueado FROM utilizadores WHERE id = ?', [$alvo['autor_id']]) : null; ?>
    <tr><td><?= $tipos[$d['tipo']] ?></td><td class="txt"><?= $alvo ? e(mb_strimwidth($alvo['texto'], 0, 120, '…')) : '<i class="muted">(já removido)</i>' ?></td>
      <td><?= $autor ? e($autor['nome']) . ($autor['bloqueado'] ? ' 🚫' : '') : '—' ?></td><td><?= e($d['quem']) ?></td><td><?= e($d['motivo']) ?></td><td><?= badge_estado($d['estado']) ?></td>
      <td class="ac"><?php if ($d['estado'] === 'pendente'): ?>
        <form method="post" class="inline"><?= campo_csrf() ?><input type="hidden" name="op" value="denuncia"><input type="hidden" name="id" value="<?= $d['id'] ?>">
          <button class="btn ghost sm" name="acao" value="ignorar">Ignorar</button>
          <?php if ($alvo): ?><button class="btn ghost sm" name="acao" value="apagar">Apagar conteúdo</button>
          <?php if ($autor && !$autor['bloqueado']): ?><button class="btn ghost sm" name="acao" value="bloquear">Bloquear autor</button><?php endif; endif; ?>
        </form><?php endif; ?></td></tr>
  <?php endforeach; ?>
  </tbody></table></div>
  <?= paginacao($total, $pag, 25, ['s' => 'denuncias']) ?>
<?php endif; ?>
</div></div>
<?php require 'rodape.php'; ?>
