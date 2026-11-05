<?php
// Comunidade: feed de atividade, publicações, comentários e respostas, seguir utilizadores
require 'lib.php';
$u = eu();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verificar_csrf();
    $u = exigir_login();
    $ancora = '';
    switch ($_POST['op'] ?? '') {
        case 'publicar':
            $texto = mb_substr(campo('texto'), 0, 1000);
            $projeto = (int)($_POST['projeto'] ?? 0);
            // Só se pode ligar a publicação a um projeto próprio
            if ($projeto && !valor('SELECT COUNT(*) FROM projetos WHERE id = ? AND dono_id = ?', [$projeto, $u['id']])) $projeto = 0;
            // Anti-spam: armadilha para robôs, no máximo 3 publicações em 5 minutos e 2 links por publicação
            if (caiu_na_armadilha()) break;
            if ($texto !== '' && demasiado('publicacoes', 'utilizador_id', (int)$u['id'], 3, 300)) {
                aviso('Já publicaste várias vezes nos últimos minutos. Espera um pouco antes de publicar outra vez.', 'erro');
            } elseif ($texto !== '' && !e_admin() && n_links($texto) > 2) {
                aviso('A publicação tem links a mais (máximo 2).', 'erro');
            } elseif ($texto !== '') {
                sql('INSERT INTO publicacoes (utilizador_id, texto, projeto_id, criado_em) VALUES (?, ?, ?, ?)', [$u['id'], $texto, $projeto ?: null, agora()]);
                aviso('Publicado!');
            }
            break;

        case 'comentar':
            $pub = linha('SELECT * FROM publicacoes WHERE id = ?', [(int)$_POST['publicacao']]);
            $texto = mb_substr(campo('texto'), 0, 1000);
            $pai = (int)($_POST['pai'] ?? 0);
            if ($pai && !valor('SELECT COUNT(*) FROM comentarios WHERE id = ? AND publicacao_id = ?', [$pai, $pub['id'] ?? 0])) $pai = 0;
            // Anti-spam: no máximo 10 comentários em 5 minutos e 2 links por comentário
            if (demasiado('comentarios', 'utilizador_id', (int)$u['id'], 10, 300)) { aviso('Estás a comentar depressa demais. Espera um pouco.', 'erro'); break; }
            if (!e_admin() && n_links($texto) > 2) { aviso('O comentário tem links a mais (máximo 2).', 'erro'); break; }
            if ($pub && $texto !== '') {
                sql('INSERT INTO comentarios (publicacao_id, utilizador_id, pai_id, texto, criado_em) VALUES (?, ?, ?, ?, ?)', [$pub['id'], $u['id'], $pai ?: null, $texto, agora()]);
                $link = 'comunidade.php#pub' . $pub['id'];
                if ($pai) {
                    $autor_pai = (int)valor('SELECT utilizador_id FROM comentarios WHERE id = ?', [$pai]);
                    notificar($autor_pai, 'comentario', $u['nome'] . ' respondeu ao teu comentário.', $link);
                }
                notificar((int)$pub['utilizador_id'], 'comentario', $u['nome'] . ' comentou a tua publicação.', $link);
                $ancora = '#pub' . $pub['id'];
            }
            break;

        // Apagar: o autor apaga o que é seu; o administrador pode apagar tudo
        case 'apagar_pub':
            $pub = linha('SELECT * FROM publicacoes WHERE id = ?', [(int)$_POST['id']]);
            if ($pub && ((int)$pub['utilizador_id'] === (int)$u['id'] || e_admin())) {
                sql('DELETE FROM publicacoes WHERE id = ?', [$pub['id']]);
                aviso('Publicação apagada.');
            }
            break;
        case 'apagar_com':
            $c = linha('SELECT * FROM comentarios WHERE id = ?', [(int)$_POST['id']]);
            if ($c && ((int)$c['utilizador_id'] === (int)$u['id'] || e_admin())) {
                sql('DELETE FROM comentarios WHERE id = ?', [$c['id']]);
                aviso('Comentário apagado.');
                $ancora = '#pub' . $c['publicacao_id'];
            }
            break;
    }
    ir('comunidade.php' . (isset($_POST['feed']) ? '?feed=' . urlencode($_POST['feed']) : '') . $ancora);
}

// Feed: todas as publicações ou só de quem eu sigo
$feed = $u && ($_GET['feed'] ?? '') === 'seguir' ? 'seguir' : 'todos';
$where = $feed === 'seguir' ? 'WHERE p.utilizador_id IN (SELECT seguido_id FROM seguidores WHERE seguidor_id = ?) OR p.utilizador_id = ?' : '';
// 10 publicações por página (?p=2, ?p=3, ...)
[$publicacoes, $total_pub, $pag] = paginado("SELECT p.*, u.nome, u.cor, pr.titulo AS projeto_titulo FROM publicacoes p JOIN utilizadores u ON u.id = p.utilizador_id
                       LEFT JOIN projetos pr ON pr.id = p.projeto_id $where", $feed === 'seguir' ? [$u['id'], $u['id']] : [], 'ORDER BY criado_em DESC, id DESC', 10);
$comentarios = [];
if ($publicacoes) {
    $ids = implode(',', array_map('intval', array_column($publicacoes, 'id')));
    foreach (linhas("SELECT c.*, u.nome, u.cor FROM comentarios c JOIN utilizadores u ON u.id = c.utilizador_id WHERE c.publicacao_id IN ($ids) ORDER BY c.criado_em, c.id") as $c) {
        $comentarios[$c['publicacao_id']][] = $c;
    }
}
// Atividade recente: avaliações e projetos novos
$atividade = linhas("SELECT u.nome, u.cor, t.nome AS alvo, t.id AS tid, a.nota, a.criado_em FROM avaliacoes a JOIN utilizadores u ON u.id = a.utilizador_id JOIN titulos t ON t.id = a.titulo_id ORDER BY a.criado_em DESC LIMIT 6");
$destaque = linhas('SELECT u.*, (SELECT COUNT(*) FROM seguidores s WHERE s.seguido_id = u.id) AS n FROM utilizadores u WHERE u.id <> ? ORDER BY n DESC, u.nome LIMIT 5', [$u['id'] ?? 0]);
$sigo = $u ? array_column(linhas('SELECT seguido_id FROM seguidores WHERE seguidor_id = ?', [$u['id']]), 'seguido_id') : [];
$meus_projetos = $u ? linhas('SELECT id, titulo FROM projetos WHERE dono_id = ? ORDER BY titulo', [$u['id']]) : [];

/** Formulário de denúncia (abre ao clicar). */
function denunciar(string $tipo, int $id): string
{
    if (!eu()) return '';
    return '<details class="rep-d"><summary>⚑</summary><form method="post" action="acoes.php">' . campo_csrf() .
        '<input type="hidden" name="acao" value="denunciar"><input type="hidden" name="tipo" value="' . $tipo . '"><input type="hidden" name="alvo" value="' . $id . '">' .
        '<select name="motivo"><option>Spam</option><option>Ofensivo</option><option>Spoilers</option><option>Outro</option></select><button class="btn ghost sm">Denunciar</button></form></details>';
}

/** Botão de apagar, só para o autor ou administrador. */
function apagar_btn(string $op, array $item): string
{
    if (!eu() || ((int)$item['utilizador_id'] !== (int)eu()['id'] && !e_admin())) return '';
    return '<form method="post" class="inline" data-confirm="Apagar?">' . campo_csrf() . '<input type="hidden" name="op" value="' . $op . '"><input type="hidden" name="id" value="' . (int)$item['id'] . '"><button class="del-btn" title="Apagar">🗑</button></form>';
}

/** Mostra um comentário e, por baixo, as respostas a ele. */
function mostrar_comentario(array $c, array $todos, int $pub): void
{ ?>
  <div class="cm" id="c<?= $c['id'] ?>"><?= avatar($c) ?><div class="cmb">
    <b><?= link_perfil($c) ?></b> <small><?= tempo($c['criado_em']) ?></small><p><?= nl2br(e($c['texto'])) ?></p>
    <?php if (eu()): ?><details class="reply"><summary>Responder</summary>
      <form method="post" class="inline-form"><?= campo_csrf() ?><input type="hidden" name="op" value="comentar"><input type="hidden" name="publicacao" value="<?= $pub ?>"><input type="hidden" name="pai" value="<?= $c['id'] ?>">
        <input name="texto" maxlength="1000" placeholder="Responder a <?= e($c['nome']) ?>..." required><button class="btn primary sm">Enviar</button></form></details><?php endif; ?>
    <?php foreach ($todos as $r) if ((int)$r['pai_id'] === (int)$c['id']) mostrar_comentario($r, $todos, $pub); ?>
  </div><span class="acts"><?= denunciar('comentario', (int)$c['id']) ?><?= apagar_btn('apagar_com', $c) ?></span></div>
<?php }

$titulo = 'Comunidade';
$ativo = 'Comunidade';
require 'cabecalho.php';
?>
<div class="content"><div class="left">
  <div class="ah"><h1 class="ph">Comunidade</h1><?php if ($u): ?><a class="btn ghost sm" href="chat.php">💬 Abrir chat</a><?php endif; ?></div>
  <div class="dcols"><div>
    <?php if ($u): ?>
      <form method="post" class="box form"><?= campo_csrf() ?><input type="hidden" name="op" value="publicar">
        <textarea name="texto" maxlength="1000" rows="3" placeholder="Partilha algo com a comunidade..." required></textarea>
        <?= campo_armadilha() ?>
        <div class="row2">
          <?php if ($meus_projetos): ?><select name="projeto"><option value="0">Sem projeto associado</option><?php foreach ($meus_projetos as $mp): ?><option value="<?= $mp['id'] ?>"><?= e($mp['titulo']) ?></option><?php endforeach; ?></select><?php endif; ?>
          <button class="btn primary sm">Publicar</button></div>
      </form>
      <div class="tabs links"><a class="<?= $feed === 'todos' ? 'on' : '' ?>" href="?feed=todos">Tudo</a><a class="<?= $feed === 'seguir' ? 'on' : '' ?>" href="?feed=seguir">Quem eu sigo</a></div>
    <?php else: ?>
      <div class="box cta"><div><b>Participa na conversa</b><p>Inicia sessão para publicar, comentar e seguir outros utilizadores.</p></div><a class="btn primary sm" href="login.php?voltar=comunidade.php">Entrar</a></div>
    <?php endif; ?>

    <?php if (!$publicacoes): ?><p class="empty">Ainda não há publicações aqui.</p><?php endif; ?>
    <?php foreach ($publicacoes as $p): ?>
      <article class="box post" id="pub<?= $p['id'] ?>">
        <div class="rv"><?= avatar($p) ?><div><b><?= link_perfil($p) ?></b> <small><?= tempo($p['criado_em']) ?></small>
          <?php if ($p['projeto_titulo']): ?><br><a class="tg" href="projeto.php?id=<?= $p['projeto_id'] ?>">🎬 <?= e($p['projeto_titulo']) ?></a><?php endif; ?>
          <p><?= nl2br(e($p['texto'])) ?></p></div>
          <span class="acts"><?= denunciar('publicacao', (int)$p['id']) ?><?= apagar_btn('apagar_pub', $p) ?></span></div>
        <div class="cms">
          <?php foreach ($comentarios[$p['id']] ?? [] as $c) if (!$c['pai_id']) mostrar_comentario($c, $comentarios[$p['id']], (int)$p['id']); ?>
          <?php if ($u): ?><form method="post" class="inline-form"><?= campo_csrf() ?><input type="hidden" name="op" value="comentar"><input type="hidden" name="publicacao" value="<?= $p['id'] ?>"><input type="hidden" name="feed" value="<?= $feed ?>">
            <input name="texto" maxlength="1000" placeholder="Escreve um comentário..." required><button class="btn ghost sm">Comentar</button></form><?php endif; ?>
        </div>
      </article>
    <?php endforeach; ?>
    <?= paginacao($total_pub, $pag, 10, $feed === 'seguir' ? ['feed' => 'seguir'] : []) ?>
  </div><div>
    <div class="box"><h3>Utilizadores em destaque</h3>
      <?php foreach ($destaque as $d): ?>
        <div class="rv"><?= avatar($d) ?><div><b><?= link_perfil($d) ?></b><br><small><?= (int)$d['n'] ?> seguidores</small></div>
          <?php if ($u): ?><form method="post" action="acoes.php" class="inline"><?= campo_csrf() ?><input type="hidden" name="acao" value="seguir"><input type="hidden" name="id" value="<?= $d['id'] ?>">
            <button class="btn ghost sm"><?= in_array($d['id'], $sigo) ? 'A seguir ✓' : 'Seguir' ?></button></form><?php endif; ?></div>
      <?php endforeach; ?>
    </div>
    <div class="box"><h3>Atividade recente</h3><div class="tl">
      <?php foreach ($atividade as $a): ?><p><?= e($a['nome']) ?> avaliou <a class="lk" href="titulo.php?id=<?= $a['tid'] ?>"><?= e($a['alvo']) ?></a> com <?= (int)$a['nota'] ?>★<small><?= tempo($a['criado_em']) ?></small></p><?php endforeach; ?>
    </div></div>
  </div></div>
</div></div>
<?php require 'rodape.php'; ?>
