<?php
// Passo 11 – Página de inserção de um novo projeto
require 'lib.php';
require 'projeto_form.php';
$u = exigir_login();
$erros = [];
$dados = ['estado' => 'Ideia', 'funcao' => 'Realizador'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verificar_csrf();
    $dados = validar_projeto($erros);
    $dados['funcao'] = mb_substr(campo('funcao'), 0, 60) ?: 'Criador';
    $vagas = array_filter(array_map('trim', explode(',', campo('vagas'))));
    // Anti-spam: no máximo 3 projetos novos por hora
    if (!$erros && demasiado('projetos', 'dono_id', (int)$u['id'], 3, 3600)) $erros[] = 'Já criaste 3 projetos na última hora. Tenta mais tarde.';
    if (!$erros) {
        sql('INSERT INTO projetos (dono_id, titulo, sinopse, tipo, genero, estado, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [$u['id'], $dados['titulo'], $dados['sinopse'], $dados['tipo'], $dados['genero'], $dados['estado'], agora()]);
        $id = (int)bd()->lastInsertId();
        // O criador entra logo na equipa com a função que escolheu
        sql('INSERT INTO projeto_equipa (projeto_id, funcao, utilizador_id) VALUES (?, ?, ?)', [$id, $dados['funcao'], $u['id']]);
        foreach (array_slice($vagas, 0, 10) as $v) {
            sql('INSERT INTO projeto_vagas (projeto_id, funcao) VALUES (?, ?)', [$id, mb_substr($v, 0, 60)]);
        }
        aviso('Projeto criado! Podes agora completar a equipa e as vagas.');
        ir('projeto.php?id=' . $id);
    }
}

$titulo = 'Novo projeto';
$ativo = 'Projetos';
require 'cabecalho.php';
?>
<div class="content"><div class="left narrow">
  <h1 class="ph">Criar projeto</h1>
  <?php foreach ($erros as $er): ?><div class="flash erro"><?= e($er) ?></div><?php endforeach; ?>
  <form method="post" class="box form">
    <?= campo_csrf() ?>
    <?php campos_projeto($dados); ?>
    <label>A tua função no projeto<input name="funcao" value="<?= e($dados['funcao']) ?>" maxlength="60" placeholder="Ex.: Realizador, Produtor, Argumentista"></label>
    <label>Funções que procuras <small class="muted">(separadas por vírgulas)</small><input name="vagas" value="<?= e($_POST['vagas'] ?? '') ?>" placeholder="Ex.: Diretor de fotografia, Ator, Editor de vídeo"></label>
    <div class="btns"><button class="btn primary">Criar projeto</button><a class="btn ghost" href="projetos.php">Cancelar</a></div>
  </form>
</div></div>
<?php require 'rodape.php'; ?>
