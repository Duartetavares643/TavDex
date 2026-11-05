<?php
// Lista de projetos cinematográficos, com pesquisa e filtros
require 'lib.php';
$ativo = 'Projetos';

$q = trim($_GET['q'] ?? '');
$estado = $_GET['estado'] ?? '';
$tipo = $_GET['tipo'] ?? '';
$so_vagas = !empty($_GET['vagas']);

$where = [];
$param = [];
if ($q !== '') { $where[] = '(p.titulo LIKE ? OR p.sinopse LIKE ?)'; $param[] = "%$q%"; $param[] = "%$q%"; }
if ($estado !== '') { $where[] = 'p.estado = ?'; $param[] = $estado; }
if ($tipo !== '') { $where[] = 'p.tipo = ?'; $param[] = $tipo; }
if ($so_vagas) $where[] = 'EXISTS (SELECT 1 FROM projeto_vagas v WHERE v.projeto_id = p.id AND v.aberta = 1)';
$projetos = linhas(SQL_PROJETOS . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY p.criado_em DESC', $param);

$estados = ['Ideia', 'Recrutamento', 'Pré-produção', 'Em produção', 'Concluído'];
$tipos = ['Filme', 'Série', 'Curta-metragem', 'Documentário', 'Videoclipe'];
$titulo = 'Projetos';
require 'cabecalho.php';
?>
<div class="content"><div class="left">
  <div class="ah"><div><h1 class="ph">Projetos audiovisuais</h1><small>Ideias de filmes e séries criadas pela comunidade</small></div>
    <a class="btn primary sm" href="projeto_novo.php">+ Criar projeto</a></div>
  <form class="cf" method="get">
    <input name="q" value="<?= e($q) ?>" placeholder="Pesquisar projetos...">
    <select name="estado"><option value="">Todos os estados</option><?php foreach ($estados as $s): ?><option <?= $s === $estado ? 'selected' : '' ?>><?= $s ?></option><?php endforeach; ?></select>
    <select name="tipo"><option value="">Todos os tipos</option><?php foreach ($tipos as $s): ?><option <?= $s === $tipo ? 'selected' : '' ?>><?= $s ?></option><?php endforeach; ?></select>
    <label class="chk"><input type="checkbox" name="vagas" value="1" <?= $so_vagas ? 'checked' : '' ?>> Com vagas abertas</label>
    <button class="btn ghost sm">Filtrar</button>
  </form>
  <p class="cr"><?= count($projetos) ?> projeto<?= count($projetos) === 1 ? '' : 's' ?></p>
  <?php if (!$projetos): ?><p class="empty">Nenhum projeto encontrado.</p><?php endif; ?>
  <div class="pjc"><?php foreach ($projetos as $p) echo cartao_projeto($p); ?></div>
</div></div>
<?php require 'rodape.php'; ?>
