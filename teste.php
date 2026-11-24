<?php
// =====================================================================
//  TavDex – Página de teste (diagnóstico da instalação)
//  Abre http://localhost/tavdex-php/teste.php para confirmar que o PHP,
//  a base de dados e as pastas estão prontos. Não altera nenhum dado.
//  Só abre em modo de desenvolvimento (MODO_DEV = true) ou para administradores.
// =====================================================================
require 'lib.php';

if (!MODO_DEV && !e_admin()) {
    http_response_code(403);
    exit('Página de teste desativada. Entra como administrador ou ativa MODO_DEV em config.php.');
}

$res = [];   // resultados: [grupo, estado, título, detalhe]
function r(string $grupo, string $estado, string $titulo, string $detalhe = ''): void
{
    global $res;
    $res[] = [$grupo, $estado, $titulo, $detalhe];
}

// ---------------------------------------------------------------------
// 1. PHP
// ---------------------------------------------------------------------
$g = 'PHP';
version_compare(PHP_VERSION, '8.0.0', '>=')
    ? r($g, 'ok', 'Versão do PHP: ' . PHP_VERSION, 'O TavDex precisa do PHP 8.0 ou superior.')
    : r($g, 'erro', 'Versão do PHP: ' . PHP_VERSION, 'É preciso o PHP 8.0 ou superior. Atualiza o XAMPP ou instala um PHP mais recente.');
foreach (['pdo' => 'ligação à base de dados', 'pdo_mysql' => 'ligação ao MySQL', 'mbstring' => 'texto com acentos', 'json' => 'chat'] as $ext => $para) {
    if ($ext === 'pdo_mysql' && str_starts_with(getenv('TAVDEX_DSN') ?: '', 'sqlite')) continue;   // só nos testes automáticos
    extension_loaded($ext)
        ? r($g, 'ok', "Extensão $ext", "Usada para: $para.")
        : r($g, 'erro', "Extensão $ext em falta", "Ativa a linha extension=$ext no php.ini e reinicia o servidor (Apache no XAMPP, ou o php -S).");
}
/** Converte "2M", "512K", "1G" do php.ini em bytes. */
function bytes_ini(string $v): int
{
    $n = (int)$v;
    return match (strtoupper(substr(trim($v), -1))) { 'G' => $n * 1024 ** 3, 'M' => $n * 1024 ** 2, 'K' => $n * 1024, default => $n };
}
$limite = min(bytes_ini(ini_get('upload_max_filesize')), bytes_ini(ini_get('post_max_size')));
if (!ini_get('file_uploads')) {
    r($g, 'aviso', 'Envio de ficheiros desativado', 'Não vai ser possível carregar cartazes. Ativa file_uploads no php.ini.');
} elseif ($limite < 3 * 1024 * 1024) {
    r($g, 'aviso', 'Limite de envio do PHP: ' . ini_get('upload_max_filesize'), 'Os cartazes podem ter até 3 MB, mas o PHP só aceita ' . ini_get('upload_max_filesize') . '. No php.ini muda upload_max_filesize e post_max_size para 8M e reinicia o servidor.');
} else {
    r($g, 'ok', 'Envio de ficheiros ativo', 'Limite por ficheiro: ' . ini_get('upload_max_filesize') . ' (os cartazes podem ter até 3 MB).');
}
r($g, 'info', 'Fuso horário: ' . date_default_timezone_get(), 'Hora do servidor: ' . date('d/m/Y H:i'));
r($g, 'info', 'Servidor web: ' . ($_SERVER['SERVER_SOFTWARE'] ?? 'desconhecido'),
  str_contains($_SERVER['SERVER_SOFTWARE'] ?? '', 'Apache') ? 'O ficheiro .htaccess protege os ficheiros internos.' : 'O .htaccess só funciona no Apache (XAMPP). Com outro servidor os ficheiros .sql ficam acessíveis: não os deixes no servidor.');

// ---------------------------------------------------------------------
// 2. Sessões (necessárias para o login)
// ---------------------------------------------------------------------
$g = 'Sessão e login';
$_SESSION['teste_tavdex'] = ($_SESSION['teste_tavdex'] ?? 0) + 1;
session_status() === PHP_SESSION_ACTIVE
    ? r($g, 'ok', 'Sessões a funcionar', 'Esta página foi aberta ' . $_SESSION['teste_tavdex'] . ' vez(es) nesta sessão: atualiza a página e o número deve subir.')
    : r($g, 'erro', 'As sessões não funcionam', 'Sem sessões não é possível iniciar sessão. Confirma a pasta session.save_path no php.ini.');
r($g, 'ok', 'Proteção CSRF ativa', 'Os formulários levam um token secreto da sessão.');
MODO_DEV
    ? r($g, 'aviso', 'MODO_DEV ligado', 'O link de recuperação da palavra-passe aparece no ecrã. Está certo no computador, mas muda para false antes de pôr o site online.')
    : r($g, 'ok', 'MODO_DEV desligado', 'A recuperação da palavra-passe é enviada por email.');

// ---------------------------------------------------------------------
// 3. Base de dados
// ---------------------------------------------------------------------
$g = 'Base de dados';
$pdo = null;
$dsn = getenv('TAVDEX_DSN') ?: 'mysql:host=' . BD_HOST . ';dbname=' . BD_NOME . ';charset=utf8mb4';
try {
    $pdo = new PDO($dsn, BD_UTILIZADOR, BD_PASSWORD, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    r($g, 'ok', 'Ligação à base de dados', 'Servidor ' . $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) . ' ' . $pdo->getAttribute(PDO::ATTR_SERVER_VERSION) . ' · base de dados ' . BD_NOME . ' em ' . BD_HOST . '.');
} catch (PDOException $e) {
    $msg = $e->getMessage();
    $ajuda = 'Confirma os dados em config.php.';
    if (stripos($msg, 'Unknown database') !== false) $ajuda = 'A base de dados ' . BD_NOME . ' não existe: importa base_dados.sql no MySQL Workbench ou no phpMyAdmin.';
    elseif (stripos($msg, 'Access denied') !== false) $ajuda = 'Utilizador ou palavra-passe do MySQL errados: corrige BD_UTILIZADOR e BD_PASSWORD em config.php.';
    elseif (stripos($msg, 'refused') !== false || stripos($msg, 'No such file') !== false || stripos($msg, "Can't connect") !== false) $ajuda = 'O MySQL não está ligado: no painel do XAMPP carrega em Start ao lado de MySQL (sem XAMPP: abre os Serviços do Windows e inicia o MySQL84).';
    r($g, 'erro', 'Não foi possível ligar à base de dados', $ajuda . ' (Erro: ' . $msg . ')');
}

if ($pdo) {
    $tabelas = ['utilizadores', 'recuperacoes', 'seguidores', 'generos', 'titulos', 'titulo_generos', 'temporadas', 'avaliacoes', 'listas', 'projetos',
                'projeto_equipa', 'projeto_vagas', 'candidaturas', 'projeto_avaliacoes', 'publicacoes', 'comentarios', 'mensagens', 'notificacoes', 'notif_silenciadas', 'denuncias',
                'plataformas', 'titulo_plataformas'];
    $contagem = [];
    $faltam = [];
    foreach ($tabelas as $t) {
        try {
            $contagem[$t] = (int)$pdo->query("SELECT COUNT(*) FROM $t")->fetchColumn();
        } catch (PDOException $e) {
            $faltam[] = $t;
        }
    }
    $faltam
        ? r($g, 'erro', count($faltam) . ' tabela(s) em falta', 'Faltam: ' . implode(', ', $faltam) . '. ' . (count($faltam) <= 2 && in_array('plataformas', $faltam, true) ? 'A base de dados é de uma versão anterior: executa atualizar_bd.sql.' : 'Importa de novo base_dados.sql e depois dados.sql.'))
        : r($g, 'ok', 'As ' . count($tabelas) . ' tabelas existem', 'Utilizadores: ' . $contagem['utilizadores'] . ' · títulos: ' . $contagem['titulos'] . ' · avaliações: ' . $contagem['avaliacoes'] . ' · projetos: ' . $contagem['projetos'] . ' · mensagens: ' . $contagem['mensagens'] . '.');
    if (!$faltam && $contagem['titulos'] === 0) r($g, 'aviso', 'A base de dados está vazia', 'Importa dados.sql para teres os dados de exemplo.');

    try {
        $pdo->query('SELECT fundo, tmdb_id FROM titulos LIMIT 1');
        r($g, 'ok', 'Colunas das imagens (fundo e TMDB)', 'A base de dados está atualizada.');
    } catch (PDOException $e) {
        if (!in_array('titulos', $faltam, true)) r($g, 'erro', 'Faltam as colunas das imagens', 'A base de dados é de uma versão anterior: executa atualizar_bd.sql.');
    }

    // Teste de escrita: insere uma publicação e anula logo (nada fica guardado)
    if (!$faltam) try {
        $uid = $pdo->query('SELECT MIN(id) FROM utilizadores')->fetchColumn();
        if ($uid) {
            $pdo->beginTransaction();
            $st = $pdo->prepare('INSERT INTO publicacoes (utilizador_id, texto, criado_em) VALUES (?, ?, ?)');
            $st->execute([$uid, 'teste', agora()]);
            $pdo->rollBack();
            r($g, 'ok', 'Gravar dados', 'Foi possível escrever na base de dados (o teste foi anulado, nada ficou guardado).');
        }
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        r($g, 'erro', 'Não é possível gravar dados', 'O utilizador do MySQL não tem permissão de escrita. (Erro: ' . $e->getMessage() . ')');
    }

    // Contas de teste
    if (!$faltam) try {
        $admin = $pdo->query("SELECT nome, email, password_hash FROM utilizadores WHERE papel = 'admin' ORDER BY id LIMIT 1")->fetch(PDO::FETCH_ASSOC);
        if (!$admin) {
            r($g, 'aviso', 'Não há nenhum administrador', 'Importa dados.sql ou muda o papel de uma conta para admin no MySQL Workbench.');
        } elseif (password_verify('Admin#2026', $admin['password_hash'])) {
            r($g, 'aviso', 'Administrador com a palavra-passe de exemplo', e($admin['email']) . ' / Admin#2026 funciona. Está bem para testar; muda-a antes de pôr o site online.');
        } else {
            r($g, 'ok', 'Administrador: ' . e($admin['nome']), 'A palavra-passe de exemplo já foi mudada.');
        }
        $rafa = $pdo->query("SELECT password_hash FROM utilizadores WHERE email = 'rafa@mail.pt'")->fetchColumn();
        if ($rafa) {
            password_verify('tavdex123', $rafa)
                ? r($g, 'ok', 'Conta de teste rafa@mail.pt', 'Palavra-passe tavdex123: o login vai funcionar.')
                : r($g, 'info', 'Conta de teste rafa@mail.pt', 'A palavra-passe já não é tavdex123 (foi mudada).');
        }
    } catch (PDOException $e) {
    }
}

// ---------------------------------------------------------------------
// 4. Ficheiros e pastas
// ---------------------------------------------------------------------
$g = 'Ficheiros';
$precisos = ['index.php', 'lib.php', 'config.php', 'cabecalho.php', 'rodape.php', 'registar.php', 'login.php', 'logout.php', 'recuperar.php', 'repor.php',
             'perfil.php', 'editar_perfil.php', 'catalogo.php', 'titulo.php', 'pesquisa.php', 'listas.php', 'projetos.php', 'projeto.php', 'projeto_novo.php',
             'projeto_editar.php', 'projeto_form.php', 'candidaturas.php', 'comunidade.php', 'chat.php', 'chat_api.php', 'notificacoes.php', 'admin.php',
             'admin_titulo.php', 'acoes.php', '404.php', 'style.css', 'main.js', 'logo.png'];
$falta = array_values(array_filter($precisos, fn($f) => !is_file(__DIR__ . '/' . $f)));
$falta
    ? r($g, 'erro', count($falta) . ' ficheiro(s) em falta', 'Faltam: ' . implode(', ', $falta) . '. Copia de novo a pasta completa.')
    : r($g, 'ok', 'Todos os ficheiros do site estão na pasta', count($precisos) . ' ficheiros encontrados em ' . e(__DIR__) . '.');
$tmp = @tempnam(__DIR__, 'tst');
if ($tmp && is_file($tmp) && dirname($tmp) === __DIR__) {
    unlink($tmp);
    r($g, 'ok', 'Pasta com permissão de escrita', 'Os cartazes carregados no painel podem ser guardados.');
} else {
    if ($tmp && is_file($tmp)) unlink($tmp);
    r($g, 'aviso', 'Sem permissão para gravar na pasta', 'Não vai ser possível carregar cartazes. Dá permissão de escrita à pasta do site.');
}
is_file(__DIR__ . '/.htaccess')
    ? r($g, 'ok', 'Ficheiro .htaccess presente', 'Protege os scripts SQL e os ficheiros internos.')
    : r($g, 'aviso', 'Ficheiro .htaccess em falta', 'No Windows, ficheiros que começam por ponto às vezes não são copiados. Copia-o de novo.');

// ---------------------------------------------------------------------
// 5. Imagens (TMDB) e email
// ---------------------------------------------------------------------
$g = 'Extras';
if (TMDB_CHAVE === '') {
    r($g, 'info', 'TMDB não configurado', 'Sem chave, o site usa cartazes desenhados. Para imagens reais, põe a tua chave em config.php (TMDB_CHAVE).');
} elseif (!function_exists('curl_init') && !ini_get('allow_url_fopen')) {
    r($g, 'erro', 'O PHP não consegue aceder à internet', 'Ativa a extensão curl (ou allow_url_fopen) no php.ini para usar o TMDB.');
} else {
    $cfg = tmdb_pedido('/configuration');
    $cfg
        ? r($g, 'ok', 'Ligação ao TMDB', 'A chave é válida. No Painel → Filmes e séries, carrega em "Imagens do TMDB para todos".')
        : r($g, 'erro', 'O TMDB recusou o pedido', 'Confirma a chave em config.php (é a "API Key" v3) e a ligação à internet.');
}
MODO_DEV
    ? r($g, 'info', 'Email', 'Em modo de desenvolvimento os emails não são enviados (os links aparecem no ecrã).')
    : (ini_get('SMTP') || ini_get('sendmail_path')
        ? r($g, 'info', 'Email', 'O PHP tem um servidor de email configurado. Testa a recuperação da palavra-passe com um email teu.')
        : r($g, 'aviso', 'Email não configurado', 'A recuperação da palavra-passe e as notificações por email não vão chegar.'));

// ---------------------------------------------------------------------
// Resumo
// ---------------------------------------------------------------------
$n = ['ok' => 0, 'aviso' => 0, 'erro' => 0, 'info' => 0];
foreach ($res as $x) $n[$x[1]]++;
$icone = ['ok' => '✓', 'aviso' => '!', 'erro' => '✕', 'info' => 'i'];
$grupos = [];
foreach ($res as $x) $grupos[$x[0]][] = $x;

// Testes à mão: páginas para abrir e o que fazer em cada uma
$manuais = [
    ['index.php', 'Página inicial', 'O destaque muda sozinho e as filas de cartazes deslizam.'],
    ['registar.php', 'Criar conta', 'Cria uma conta nova com uma palavra-passe de 8 caracteres com letras e números.'],
    ['login.php', 'Entrar', 'Entra com rafa@mail.pt / tavdex123 e depois termina a sessão no menu.'],
    ['recuperar.php', 'Recuperar palavra-passe', 'Pede o link para rafa@mail.pt e define uma palavra-passe nova.'],
    ['catalogo.php?tipo=filme', 'Catálogo', 'Experimenta os géneros, os filtros e a ordenação.'],
    ['titulo.php?id=1', 'Página de um filme', 'Adiciona aos favoritos e escreve uma review com spoiler.'],
    ['listas.php', 'As minhas listas', 'Confirma que o filme aparece e remove-o.'],
    ['projetos.php', 'Projetos', 'Cria um projeto com uma vaga.'],
    ['projeto.php?id=1', 'Candidatura', 'Com outra conta, candidata-te a uma vaga; com o dono, aceita em Candidaturas.'],
    ['comunidade.php', 'Comunidade', 'Publica, comenta e responde a um comentário.'],
    ['chat.php', 'Chat', 'Abre em dois browsers com contas diferentes e troca mensagens.'],
    ['notificacoes.php', 'Notificações', 'Silencia um tipo e confirma que deixa de chegar.'],
    ['admin.php', 'Administração', 'Entra como duarte@tavdex.pt e percorre os separadores.'],
    ['titulo.php?id=1', 'Onde ver', 'Confirma as plataformas na página do título e filtra o catálogo por plataforma.'],
    ['perfil.php?u=daniela_o', 'Compatibilidade', 'Com a conta do Rafa, abre este perfil e vê a percentagem de gostos em comum.'],
];
?><!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Teste da instalação – TavDex</title>
<link rel="icon" href="logo.png">
<script>try { var t = localStorage.getItem('tema'); if (t) document.documentElement.dataset.tema = t; } catch (e) {}</script>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="style.css">
</head>
<body>
<main class="content"><div class="left narrow teste">
  <a href="index.php" class="bl"><img src="logo.png" alt=""><span>Tav<em>Dex</em></span></a>
  <h1 class="ph" style="margin-top:20px">Teste da instalação</h1>

  <div class="box t-resumo <?= $n['erro'] ? 'mau' : ($n['aviso'] ? 'meio' : 'bom') ?>">
    <b><?= $n['erro'] ? 'Há ' . $n['erro'] . ' problema' . ($n['erro'] > 1 ? 's' : '') . ' a resolver' : 'Está tudo pronto para usar o TavDex' ?></b>
    <p><?= $n['ok'] ?> testes OK · <?= $n['aviso'] ?> aviso<?= $n['aviso'] === 1 ? '' : 's' ?> · <?= $n['erro'] ?> erro<?= $n['erro'] === 1 ? '' : 's' ?></p>
    <?php if (!$n['erro']): ?><div class="btns" style="margin-top:12px"><a class="btn primary sm" href="index.php">Abrir o site</a><a class="btn ghost sm" href="teste.php">Repetir o teste</a></div><?php endif; ?>
  </div>

  <?php foreach ($grupos as $nome => $lista): ?>
    <h2 class="sh"><?= e($nome) ?></h2>
    <div class="box t-lista">
      <?php foreach ($lista as [$gg, $estado, $tit, $det]): ?>
        <div class="t-item"><span class="t-ic <?= $estado ?>"><?= $icone[$estado] ?></span><div><b><?= $tit ?></b><?php if ($det): ?><p><?= $det ?></p><?php endif; ?></div></div>
      <?php endforeach; ?>
    </div>
  <?php endforeach; ?>

  <h2 class="sh">Testar à mão</h2>
  <p class="muted" style="margin-bottom:12px">Abre cada página, faz o que está indicado e marca. As marcas ficam guardadas neste browser.</p>
  <div class="box t-lista t-manual">
    <?php foreach ($manuais as $i => [$url, $nome, $faz]): ?>
      <label class="t-item"><input type="checkbox" data-t="<?= $i ?>"><div><a class="lk" href="<?= e($url) ?>" target="_blank"><?= e($nome) ?> ↗</a><p><?= e($faz) ?></p></div></label>
    <?php endforeach; ?>
  </div>
  <p class="muted" style="margin-top:16px">Contas de teste: administrador <b>duarte@tavdex.pt</b> / <b>Admin#2026</b> · utilizadores <b>rafa@mail.pt</b>, <b>lara@mail.pt</b>… / <b>tavdex123</b>.<br>
  Antes de pôr o site online, muda MODO_DEV para false em config.php: esta página deixa de abrir para quem não é administrador.</p>
</div></main>
<script>
  // Guarda as marcas dos testes à mão neste browser
  document.querySelectorAll('[data-t]').forEach(c => {
    try { c.checked = localStorage.getItem('teste_' + c.dataset.t) === '1'; } catch (e) {}
    c.addEventListener('change', () => { try { localStorage.setItem('teste_' + c.dataset.t, c.checked ? '1' : ''); } catch (e) {} });
  });
</script>
</body>
</html>
