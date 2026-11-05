<?php
// Cabeçalho comum: <head>, barra de navegação e avisos.
// Antes de incluir, cada página pode definir $titulo e $ativo.
$u = eu();
$ativo = $ativo ?? '';
$por_ler = $u ? (int)valor('SELECT COUNT(*) FROM notificacoes WHERE utilizador_id = ? AND lida = 0', [$u['id']]) : 0;
$menu = ['index.php' => 'Início', 'catalogo.php?tipo=filme' => 'Filmes', 'catalogo.php?tipo=serie' => 'Séries', 'projetos.php' => 'Projetos', 'comunidade.php' => 'Comunidade'];
?><!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title><?= e(($titulo ?? '') ? $titulo . ' – TavDex' : 'TavDex') ?></title>
<link rel="icon" href="logo.png">
<meta name="theme-color" content="#08070b">
<script>
  // Aplica o tema guardado antes de desenhar a página (evita um "piscar" de cores)
  try { var t = localStorage.getItem('tema'); if (t) document.documentElement.dataset.tema = t; } catch (e) {}
</script>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="style.css">
</head>
<body class="<?= e_admin() ? 'is-admin' : '' ?>">
<header class="nav">
  <a href="index.php" class="bl"><img src="logo.png" alt=""><span>Tav<em>Dex</em></span></a>
  <nav>
    <?php foreach ($menu as $url => $nome): ?>
      <a href="<?= $url ?>" class="<?= $ativo === $nome ? 'active' : '' ?>"><?= $nome ?></a>
    <?php endforeach; ?>
  </nav>
  <form class="search" action="pesquisa.php" method="get" role="search">
    <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
    <input type="search" name="q" value="<?= e($_GET['q'] ?? '') ?>" placeholder="Pesquisar filmes, séries, pessoas, projetos...">
  </form>
  <button class="icone-btn tema" type="button" data-tema aria-label="Mudar entre modo escuro e claro" title="Modo escuro / claro">
    <svg class="lua" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>
    <svg class="sol" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
  </button>
  <?php if ($u): ?>
    <a class="bell" href="notificacoes.php" aria-label="Notificações"><svg viewBox="0 0 24 24"><path d="M6 17V11a6 6 0 0112 0v6l2 2H4zM10 21h4"/></svg><?php if ($por_ler): ?><i><?= $por_ler ?></i><?php endif; ?></a>
    <div class="um">
      <button class="ub" type="button"><?= avatar($u) ?><span class="nome"><?= e($u['nome']) ?></span> ▾</button>
      <div class="dd">
        <a href="perfil.php?u=<?= urlencode($u['nome']) ?>">Perfil</a>
        <a href="listas.php">As minhas listas</a>
        <a href="chat.php">Chat</a>
        <a href="notificacoes.php">Notificações</a>
        <?php if (e_admin()): ?><a href="admin.php">Painel de administração</a><?php endif; ?>
        <a href="editar_perfil.php">Definições</a>
        <form method="post" action="logout.php"><?= campo_csrf() ?><button class="rtog">Terminar sessão</button></form>
      </div>
    </div>
  <?php else: ?>
    <a class="btn ghost sm nav-btn" href="login.php?voltar=<?= urlencode($_SERVER['REQUEST_URI'] ?? 'index.php') ?>">Entrar</a>
    <a class="btn primary sm nav-btn" href="registar.php">Registar</a>
  <?php endif; ?>
</header>
<main>
<?= mostrar_avisos() ?>
