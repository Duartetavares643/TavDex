<?php
// Passo 12 – Página de edição de um projeto (dados, equipa e vagas)
// Passo 13 – Apagar um projeto
// Só o dono do projeto ou um administrador podem usar esta página.
require 'lib.php';
require 'projeto_form.php';
$u = exigir_login();

$id = (int)($_GET['id'] ?? $_POST['id'] ?? 0);
$p = linha('SELECT * FROM projetos WHERE id = ?', [$id]);
if (!$p || ((int)$p['dono_id'] !== (int)$u['id'] && !e_admin())) {
    aviso('Só o dono do projeto pode editá-lo.', 'erro');
    ir('projetos.php');
}
$erros = [];
$dados = $p;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verificar_csrf();
    switch ($_POST['op'] ?? '') {
        case 'dados':
            $dados = validar_projeto($erros);
            if (!$erros) {
                sql('UPDATE projetos SET titulo = ?, sinopse = ?, tipo = ?, genero = ?, estado = ? WHERE id = ?',
                    [$dados['titulo'], $dados['sinopse'], $dados['tipo'], $dados['genero'], $dados['estado'], $id]);
                aviso('Projeto atualizado.');
                ir('projeto_editar.php?id=' . $id);
            }
            break;

        case 'add_membro':
            // Pode ser um utilizador do TavDex (pelo nome) ou só um nome escrito
            $funcao = mb_substr(campo('funcao'), 0, 60);
            $nome = mb_substr(campo('nome'), 0, 60);
            $membro = $nome !== '' ? linha('SELECT id, nome FROM utilizadores WHERE nome = ?', [$nome]) : null;
            if ($funcao === '' || $nome === '') {
                $erros[] = 'Indica a função e o nome do membro.';
            } else {
                sql('INSERT INTO projeto_equipa (projeto_id, funcao, utilizador_id, nome) VALUES (?, ?, ?, ?)',
                    [$id, $funcao, $membro['id'] ?? null, $membro ? '' : $nome]);
                if ($membro) notificar((int)$membro['id'], 'projeto', 'Foste adicionado à equipa de ' . $p['titulo'] . ' como ' . $funcao . '.', 'projeto.php?id=' . $id);
                aviso('Membro adicionado à equipa.');
                ir('projeto_editar.php?id=' . $id . '#equipa');
            }
            break;

        case 'rem_membro':
            sql('DELETE FROM projeto_equipa WHERE id = ? AND projeto_id = ?', [(int)$_POST['membro'], $id]);
            aviso('Membro removido.');
            ir('projeto_editar.php?id=' . $id . '#equipa');

        case 'add_vaga':
            $funcao = mb_substr(campo('funcao'), 0, 60);
            if ($funcao === '') {
                $erros[] = 'Indica a função da vaga.';
            } else {
                sql('INSERT INTO projeto_vagas (projeto_id, funcao, descricao) VALUES (?, ?, ?)', [$id, $funcao, mb_substr(campo('descricao'), 0, 200)]);
                aviso('Vaga criada.');
                ir('projeto_editar.php?id=' . $id . '#vagas');
            }
            break;

        case 'vaga_estado':
            sql('UPDATE projeto_vagas SET aberta = 1 - aberta WHERE id = ? AND projeto_id = ?', [(int)$_POST['vaga'], $id]);
            ir('projeto_editar.php?id=' . $id . '#vagas');

        case 'rem_vaga':
            sql('DELETE FROM projeto_vagas WHERE id = ? AND projeto_id = ?', [(int)$_POST['vaga'], $id]);
            aviso('Vaga removida.');
            ir('projeto_editar.php?id=' . $id . '#vagas');

        // Passo 13 – apagar o projeto (a base de dados apaga em cascata a equipa, vagas, candidaturas e avaliações)
        case 'apagar':
            if ((int)$p['dono_id'] !== (int)$u['id']) {
                notificar((int)$p['dono_id'], 'projeto', 'O teu projeto ' . $p['titulo'] . ' foi removido por um administrador.', 'projetos.php');
            }
            sql('DELETE FROM projetos WHERE id = ?', [$id]);
            aviso('Projeto apagado.');
            ir('projetos.php');
    }
}

$equipa = linhas('SELECT e.*, u.nome AS unome FROM projeto_equipa e LEFT JOIN utilizadores u ON u.id = e.utilizador_id WHERE e.projeto_id = ? ORDER BY e.id', [$id]);
$vagas = linhas('SELECT v.*, (SELECT COUNT(*) FROM candidaturas c WHERE c.vaga_id = v.id AND c.estado = ?) AS pendentes FROM projeto_vagas v WHERE v.projeto_id = ? ORDER BY v.id', ['pendente', $id]);

$titulo = 'Editar ' . $p['titulo'];
$ativo = 'Projetos';
require 'cabecalho.php';
?>
<div class="content"><div class="left narrow">
  <p><a class="lk" href="projeto.php?id=<?= $id ?>">← Voltar ao projeto</a></p>
  <h1 class="ph">Editar projeto</h1>
  <?php foreach ($erros as $er): ?><div class="flash erro"><?= e($er) ?></div><?php endforeach; ?>

  <form method="post" class="box form">
    <?= campo_csrf() ?><input type="hidden" name="op" value="dados"><input type="hidden" name="id" value="<?= $id ?>">
    <?php campos_projeto($dados); ?>
    <button class="btn primary">Guardar alterações</button>
  </form>

  <div class="box" id="equipa"><h3>Equipa</h3>
    <?php foreach ($equipa as $m): ?>
      <form method="post" class="rv li"><?= campo_csrf() ?><input type="hidden" name="op" value="rem_membro"><input type="hidden" name="id" value="<?= $id ?>"><input type="hidden" name="membro" value="<?= $m['id'] ?>">
        <div><b><?= e($m['unome'] ?? $m['nome']) ?></b> <small><?= e($m['funcao']) ?><?= $m['unome'] ? '' : ' · convidado' ?></small></div>
        <?php if ((int)$m['utilizador_id'] !== (int)$p['dono_id']): ?><button class="btn ghost sm">Remover</button><?php endif; ?></form>
    <?php endforeach; ?>
    <form method="post" class="inline-form"><?= campo_csrf() ?><input type="hidden" name="op" value="add_membro"><input type="hidden" name="id" value="<?= $id ?>">
      <input name="funcao" placeholder="Função (ex.: Ator)" required maxlength="60"><input name="nome" placeholder="Nome de utilizador ou nome" required maxlength="60">
      <button class="btn ghost sm">Adicionar</button></form>
    <small class="muted">Se o nome for de um utilizador do TavDex, o perfil fica ligado ao projeto.</small>
  </div>

  <div class="box" id="vagas"><h3>Vagas (funções que procuras)</h3>
    <?php if (!$vagas): ?><p class="empty">Sem vagas.</p><?php endif; ?>
    <?php foreach ($vagas as $v): ?>
      <div class="rv li"><div><b><?= e($v['funcao']) ?></b> <?= $v['aberta'] ? badge_estado('Recrutamento') : '<span class="badge" style="--c:215">Fechada</span>' ?>
        <?php if ($v['descricao']): ?><small><?= e($v['descricao']) ?></small><?php endif; ?></div>
        <span class="cact">
          <form method="post" class="inline"><?= campo_csrf() ?><input type="hidden" name="op" value="vaga_estado"><input type="hidden" name="id" value="<?= $id ?>"><input type="hidden" name="vaga" value="<?= $v['id'] ?>"><button class="btn ghost sm"><?= $v['aberta'] ? 'Fechar' : 'Reabrir' ?></button></form>
          <form method="post" class="inline" data-confirm="Remover esta vaga e as candidaturas a ela?"><?= campo_csrf() ?><input type="hidden" name="op" value="rem_vaga"><input type="hidden" name="id" value="<?= $id ?>"><input type="hidden" name="vaga" value="<?= $v['id'] ?>"><button class="btn ghost sm">Remover</button></form>
        </span></div>
    <?php endforeach; ?>
    <form method="post" class="inline-form"><?= campo_csrf() ?><input type="hidden" name="op" value="add_vaga"><input type="hidden" name="id" value="<?= $id ?>">
      <input name="funcao" placeholder="Função (ex.: Diretor de fotografia)" required maxlength="60"><input name="descricao" placeholder="Descrição (opcional)" maxlength="200">
      <button class="btn ghost sm">Criar vaga</button></form>
    <p><a class="lk" href="candidaturas.php?id=<?= $id ?>">Ver candidaturas →</a></p>
  </div>

  <form method="post" class="box form danger" data-confirm="Apagar o projeto <?= e($p['titulo']) ?>? A equipa, as vagas, as candidaturas e as avaliações também são apagadas.">
    <h3>Apagar projeto</h3><p class="muted">Esta ação não pode ser desfeita.</p>
    <?= campo_csrf() ?><input type="hidden" name="op" value="apagar"><input type="hidden" name="id" value="<?= $id ?>">
    <button class="btn ghost">🗑 Apagar projeto</button>
  </form>
</div></div>
<?php require 'rodape.php'; ?>
