<?php
// =====================================================================
//  TavDex – Atualizar a base de dados (sem phpMyAdmin)
//  Acrescenta à base de dados que já existe as colunas e tabelas novas
//  (perfil com banner e foto, confirmação do email, Google, "Manter sessão
//  iniciada", privacidade e géneros favoritos). Não apaga nenhum dado.
//  Cada passo só corre se ainda faltar, por isso pode abrir-se mais do que uma vez.
//  Só abre em modo de desenvolvimento (MODO_DEV) ou para administradores.
//  As mesmas instruções estão em atualizar_contas.sql, para quem preferir o phpMyAdmin.
// =====================================================================
require_once __DIR__ . '/config.php';
session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax']);
session_start();

// Ligação própria (o lib.php normal já usa as colunas novas e falharia antes da atualização)
$dsn = getenv('TAVDEX_DSN') ?: 'mysql:host=' . BD_HOST . ';dbname=' . BD_NOME . ';charset=utf8mb4';
try {
    $pdo = new PDO($dsn, BD_UTILIZADOR, BD_PASSWORD, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
} catch (PDOException $e) {
    exit('<p style="font-family:sans-serif">Não foi possível ligar à base de dados. Abre <a href="teste.php">teste.php</a> para ver o que falta.</p>');
}
$mysql = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';

/** Escapa texto para HTML. */
function h($t): string { return htmlspecialchars((string)$t, ENT_QUOTES, 'UTF-8'); }

// Só abre em desenvolvimento ou para um administrador com sessão iniciada
$admin = false;
if (!empty($_SESSION['uid'])) {
    $st = $pdo->prepare("SELECT papel FROM utilizadores WHERE id = ?");
    $st->execute([$_SESSION['uid']]);
    $admin = $st->fetchColumn() === 'admin';
}
if (!MODO_DEV && !$admin) {
    http_response_code(403);
    exit('<p style="font-family:sans-serif">Esta página só abre em modo de desenvolvimento ou para administradores.</p>');
}

/** A tabela (e, se indicada, a coluna) já existe? */
function existe(PDO $pdo, string $tabela, string $coluna = '*'): bool
{
    try {
        $pdo->query("SELECT $coluna FROM $tabela LIMIT 0");
        return true;
    } catch (PDOException $e) {
        return false;
    }
}

/** Tipo de uma coluna no MySQL (ex.: "enum('colina',...)"), ou null se não existir. */
function tipo_coluna(PDO $pdo, string $tabela, string $coluna): ?array
{
    $st = $pdo->prepare('SELECT COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?');
    $st->execute([$tabela, $coluna]);
    return $st->fetch(PDO::FETCH_ASSOC) ?: null;
}

/** Passo que acrescenta uma coluna à tabela utilizadores (só se ainda não existir). */
function coluna(PDO $pdo, string $nome, string $descricao, string $definicao, array $depois = []): array
{
    return [$descricao, fn() => existe($pdo, 'utilizadores', $nome), array_merge(["ALTER TABLE utilizadores ADD COLUMN $nome $definicao"], $depois)];
}

// ---------------------------------------------------------------------
// Os passos: [descrição, já está feito?, instruções SQL]
// Cada coluna é um passo, porque uma base de dados vinda da versão Node.js
// pode já ter algumas (ex.: a foto) e outras não.
// ---------------------------------------------------------------------
$temas = "'colina','pipocas','claquete','pelicula','marquise'";
$passos = [
    coluna($pdo, 'nome_exibicao', 'Nome de exibição (ex.: "Duarte Tavares")', 'VARCHAR(50) NULL AFTER nome'),
    coluna($pdo, 'email_verificado', 'Confirmação do email (as contas que já existem ficam confirmadas)', 'BOOLEAN NOT NULL DEFAULT 0 AFTER email',
        ['UPDATE utilizadores SET email_verificado = 1 WHERE id > 0']),
    coluna($pdo, 'email_pendente', 'Email novo à espera de confirmação', 'VARCHAR(120) NULL AFTER email_verificado'),
    ['Contas sem palavra-passe (só com o Google)',
        fn() => !$GLOBALS['mysql'] || (tipo_coluna($pdo, 'utilizadores', 'password_hash')['IS_NULLABLE'] ?? 'YES') === 'YES',
        ['ALTER TABLE utilizadores MODIFY password_hash VARCHAR(255) NULL']],
    coluna($pdo, 'google_id', 'Login com o Google', 'VARCHAR(50) NULL UNIQUE AFTER password_hash'),
    coluna($pdo, 'google_email', 'Email da conta Google ligada', 'VARCHAR(120) NULL AFTER google_id'),
    coluna($pdo, 'foto', 'Foto de perfil', 'MEDIUMBLOB NULL AFTER cor'),
    coluna($pdo, 'foto_versao', 'Versão da foto de perfil', 'INT NOT NULL DEFAULT 0 AFTER foto'),
    coluna($pdo, 'tema_banner', 'Cenário do banner do perfil', "ENUM($temas) NOT NULL DEFAULT 'colina' AFTER foto_versao"),
    // Bases de dados da versão Node.js podem ter os cenários antigos: passam para o novo mais parecido
    ['Os 5 cenários novos do banner',
        fn() => !$GLOBALS['mysql'] || !existe($pdo, 'utilizadores', 'tema_banner') || str_contains(tipo_coluna($pdo, 'utilizadores', 'tema_banner')['COLUMN_TYPE'] ?? '', "'marquise'"),
        ["ALTER TABLE utilizadores MODIFY tema_banner VARCHAR(20) NOT NULL DEFAULT 'colina'",
         "UPDATE utilizadores SET tema_banner = CASE tema_banner WHEN 'fachada' THEN 'colina' WHEN 'estreia' THEN 'pipocas' WHEN 'noir' THEN 'marquise'
            WHEN 'cartaz' THEN 'claquete' WHEN 'chuva' THEN 'pipocas' WHEN 'beco' THEN 'marquise' WHEN 'synthwave' THEN 'claquete' WHEN 'montanhas' THEN 'colina' ELSE tema_banner END WHERE id > 0",
         "UPDATE utilizadores SET tema_banner = 'colina' WHERE tema_banner NOT IN ($temas) AND id > 0",
         "ALTER TABLE utilizadores MODIFY tema_banner ENUM($temas) NOT NULL DEFAULT 'colina'"]],
    coluna($pdo, 'banner', 'Imagem própria do banner', 'MEDIUMBLOB NULL AFTER tema_banner'),
    coluna($pdo, 'banner_versao', 'Versão da imagem do banner', 'INT NOT NULL DEFAULT 0 AFTER banner'),
    coluna($pdo, 'mostrar_listas', 'Privacidade: mostrar as listas', 'BOOLEAN NOT NULL DEFAULT 1 AFTER banner_versao'),
    coluna($pdo, 'mostrar_seguidores', 'Privacidade: mostrar os seguidores', 'BOOLEAN NOT NULL DEFAULT 1 AFTER mostrar_listas'),
    coluna($pdo, 'ultimo_login', 'Data do último login', 'DATETIME NULL AFTER notif_email'),
    ['Tabela dos links de confirmação do email',
        fn() => existe($pdo, 'verificacao_email', 'token_hash'),
        ['DROP TABLE IF EXISTS verificacao_email',   // a da versão Node.js tinha outras colunas (só guarda links temporários)
         'CREATE TABLE verificacao_email (id INT AUTO_INCREMENT PRIMARY KEY, utilizador_id INT NOT NULL, email VARCHAR(120) NOT NULL,
          token_hash CHAR(64) NOT NULL UNIQUE, expira_em DATETIME NOT NULL, usado BOOLEAN NOT NULL DEFAULT 0, criado_em DATETIME NOT NULL,
          FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE)']],
    // Contas que já existiam antes da confirmação do email (ex.: vindas da versão Node.js, que as
    // deixava "por confirmar"): ficam confirmadas para poderem entrar. As contas novas têm sempre
    // um link em verificacao_email, por isso não são apanhadas.
    ['Contas antigas com o email confirmado (para poderem entrar)',
        fn() => !existe($pdo, 'verificacao_email', 'token_hash') || !existe($pdo, 'utilizadores', 'email_verificado')
            || (int)$pdo->query('SELECT COUNT(*) FROM utilizadores u WHERE email_verificado = 0 AND NOT EXISTS (SELECT 1 FROM verificacao_email v WHERE v.utilizador_id = u.id)')->fetchColumn() === 0,
        ['UPDATE utilizadores u SET email_verificado = 1 WHERE email_verificado = 0 AND id > 0 AND NOT EXISTS (SELECT 1 FROM verificacao_email v WHERE v.utilizador_id = u.id)']],
    ['Tabela de "Manter sessão iniciada"',
        fn() => existe($pdo, 'sessoes_lembradas'),
        ["CREATE TABLE sessoes_lembradas (id INT AUTO_INCREMENT PRIMARY KEY, utilizador_id INT NOT NULL, seletor CHAR(24) NOT NULL UNIQUE,
          token_hash CHAR(64) NOT NULL, dispositivo VARCHAR(120) NOT NULL DEFAULT '', expira_em DATETIME NOT NULL, criado_em DATETIME NOT NULL,
          FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE)"]],
    ['Tabela dos géneros favoritos',
        fn() => existe($pdo, 'utilizador_generos'),
        ['CREATE TABLE utilizador_generos (utilizador_id INT NOT NULL, genero_id INT NOT NULL, PRIMARY KEY (utilizador_id, genero_id),
          FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE, FOREIGN KEY (genero_id) REFERENCES generos(id) ON DELETE CASCADE)']],
];

// ---------------------------------------------------------------------
// Executar (POST com o token da sessão)
// ---------------------------------------------------------------------
if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
$resultado = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($_SESSION['csrf'], $_POST['csrf'] ?? '')) exit('Pedido inválido. Volta atrás e atualiza a página.');
    if (!$mysql) exit('Esta página só atualiza bases de dados MySQL.');
    foreach ($passos as [$nome, $feito, $instrucoes]) {
        if ($feito()) continue;
        try {
            foreach ($instrucoes as $q) $pdo->exec($q);
            $resultado[] = ['ok', $nome];
        } catch (PDOException $e) {
            $resultado[] = ['erro', $nome . ' – ' . $e->getMessage()];
            break;   // os passos seguintes podem depender deste
        }
    }
}
$em_falta = array_filter($passos, fn($p) => !$p[1]());
?><!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Atualizar a base de dados – TavDex</title>
<link rel="icon" href="logo.png">
<style>
  body { margin: 0; background: #08070b; color: #f4f0f7; font: 15px/1.6 Inter, system-ui, sans-serif; }
  main { max-width: 720px; margin: 40px auto; padding: 0 20px; }
  h1 { font-size: 26px; margin: 0 0 6px; }
  .box { background: #141119; border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 18px 20px; margin: 16px 0; }
  li { margin: 4px 0; }
  .ok { color: #3dd68c; } .erro { color: #ff5c7a; } .muted { color: #a79fb2; }
  button, a.btn { display: inline-block; background: linear-gradient(90deg, #ff2d55, #c42bd8); color: #fff; border: 0; border-radius: 10px;
    padding: 11px 18px; font: 600 15px Inter, sans-serif; cursor: pointer; text-decoration: none; }
</style>
</head>
<body><main>
  <h1>Atualizar a base de dados</h1>
  <p class="muted">Acrescenta as colunas e tabelas novas sem apagar dados.</p>

  <?php if ($resultado): ?>
    <div class="box"><b>Resultado</b><ul>
      <?php foreach ($resultado as [$tipo, $texto]): ?><li class="<?= $tipo ?>"><?= $tipo === 'ok' ? '✓' : '✗' ?> <?= h($texto) ?></li><?php endforeach; ?>
    </ul></div>
  <?php endif; ?>

  <div class="box">
    <?php if (!$em_falta): ?>
      <p class="ok"><b>✓ A base de dados está atualizada.</b></p>
      <a class="btn" href="index.php">Abrir o site</a> <a class="btn" href="teste.php">Repetir o teste</a>
    <?php else: ?>
      <p><b>Falta<?= count($em_falta) > 1 ? 'm' : '' ?> <?= count($em_falta) ?> passo<?= count($em_falta) > 1 ? 's' : '' ?>:</b></p>
      <ul><?php foreach ($em_falta as $p): ?><li><?= h($p[0]) ?></li><?php endforeach; ?></ul>
      <?php if ($mysql): ?>
        <form method="post"><input type="hidden" name="csrf" value="<?= h($_SESSION['csrf']) ?>"><button>Atualizar a base de dados</button></form>
      <?php else: ?>
        <p class="muted">Esta base de dados não é MySQL: importa de novo base_dados.sql e dados.sql.</p>
      <?php endif; ?>
    <?php endif; ?>
  </div>
</main></body>
</html>
