<?php
// Página de erro 404 (configurada no ficheiro .htaccess)
require_once __DIR__ . '/lib.php';
http_response_code(404);
$titulo = 'Página não encontrada';
require __DIR__ . '/cabecalho.php';
?>
<div class="content"><div class="left nf"><h1>404</h1><h2>Página não encontrada</h2><p>A página que procuras não existe ou foi movida.</p><a href="index.php" class="btn primary">Voltar à página inicial</a></div></div>
<?php require __DIR__ . '/rodape.php'; ?>
