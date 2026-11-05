<?php
// =====================================================================
//  TavDex – Funções partilhadas por todas as páginas
//  (ligação à base de dados, sessão, segurança e pequenas ajudas)
// =====================================================================

require_once __DIR__ . '/config.php';

// Sessão segura: o cookie não pode ser lido por JavaScript
session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax']);
session_start();

// ---------------------------------------------------------------------
// Base de dados
// ---------------------------------------------------------------------

/** Devolve a ligação PDO à base de dados (criada só uma vez). */
function bd(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        // TAVDEX_DSN só é usado para testes automáticos; normalmente fica vazio
        $dsn = getenv('TAVDEX_DSN') ?: 'mysql:host=' . BD_HOST . ';dbname=' . BD_NOME . ';charset=utf8mb4';
        try {
            $pdo = new PDO($dsn, BD_UTILIZADOR, BD_PASSWORD, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            if (str_starts_with($dsn, 'sqlite')) {   // só nos testes automáticos (imita o MySQL)
                $pdo->exec('PRAGMA foreign_keys = ON');
                $pdo->setAttribute(PDO::ATTR_STRINGIFY_FETCHES, true);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            exit('<p style="font-family:sans-serif">Não foi possível ligar à base de dados. Confirma que o MySQL está ligado (no XAMPP ou nos Serviços do Windows), que a password em <b>config.php</b> está certa e que importaste <b>base_dados.sql</b> e <b>dados.sql</b>.</p>');
        }
    }
    return $pdo;
}

/** Executa uma consulta preparada e devolve o PDOStatement. */
function sql(string $consulta, array $param = []): PDOStatement
{
    $st = bd()->prepare($consulta);
    $st->execute($param);
    return $st;
}

/** Devolve todas as linhas de uma consulta. */
function linhas(string $consulta, array $param = []): array
{
    return sql($consulta, $param)->fetchAll();
}

/** Devolve a primeira linha (ou null). */
function linha(string $consulta, array $param = []): ?array
{
    $r = sql($consulta, $param)->fetch();
    return $r ?: null;
}

/** Devolve o primeiro valor da primeira linha. */
function valor(string $consulta, array $param = [])
{
    return sql($consulta, $param)->fetchColumn();
}

/** Data e hora atuais no formato da base de dados. */
function agora(): string
{
    return date('Y-m-d H:i:s');
}

// ---------------------------------------------------------------------
// Utilizador com sessão iniciada
// ---------------------------------------------------------------------

/** Devolve o utilizador com sessão iniciada ou null. */
function eu(): ?array
{
    static $u = false;
    if ($u === false) {
        $u = null;
        if (!empty($_SESSION['uid'])) {
            $u = linha('SELECT * FROM utilizadores WHERE id = ?', [$_SESSION['uid']]);
            // Contas bloqueadas ou apagadas perdem a sessão
            if (!$u || $u['bloqueado']) {
                $u = null;
                unset($_SESSION['uid']);
            }
        }
    }
    return $u;
}

function e_admin(): bool
{
    return eu() && eu()['papel'] === 'admin';
}

/** Obriga a ter sessão iniciada; caso contrário vai para o login. */
function exigir_login(): array
{
    if (!eu()) {
        aviso('Inicia sessão para continuar.', 'erro');
        ir('login.php?voltar=' . urlencode($_SERVER['REQUEST_URI'] ?? 'index.php'));
    }
    return eu();
}

function exigir_admin(): void
{
    exigir_login();
    if (!e_admin()) {
        http_response_code(403);
        $titulo = 'Acesso restrito';
        require 'cabecalho.php';
        echo '<div class="content"><div class="left"><h1 class="ph">Acesso restrito</h1><p class="muted">Esta área é só para administradores.</p></div></div>';
        require 'rodape.php';
        exit;
    }
}

// ---------------------------------------------------------------------
// Segurança
// ---------------------------------------------------------------------

/** Escapa texto para HTML (evita ataques XSS). */
function e($texto): string
{
    return htmlspecialchars((string)$texto, ENT_QUOTES, 'UTF-8');
}

/** Token anti-CSRF guardado na sessão. */
function token_csrf(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

/** Campo escondido com o token, para pôr dentro de cada formulário POST. */
function campo_csrf(): string
{
    return '<input type="hidden" name="csrf" value="' . token_csrf() . '">';
}

/** Verifica o token em todos os pedidos POST. */
function verificar_csrf(): void
{
    if (!hash_equals(token_csrf(), $_POST['csrf'] ?? '')) {
        http_response_code(400);
        exit('Pedido inválido. Volta atrás e atualiza a página.');
    }
}

// ---------------------------------------------------------------------
// Navegação e mensagens
// ---------------------------------------------------------------------

function ir(string $url): void
{
    header('Location: ' . $url);
    exit;
}

/** Guarda uma mensagem para mostrar na próxima página. */
function aviso(string $texto, string $tipo = 'ok'): void
{
    $_SESSION['avisos'][] = [$tipo, $texto];
}

function mostrar_avisos(): string
{
    $html = '';
    foreach ($_SESSION['avisos'] ?? [] as [$tipo, $texto]) {
        $html .= '<div class="flash ' . e($tipo) . '">' . e($texto) . '</div>';
    }
    unset($_SESSION['avisos']);
    return $html;
}

/** Lê um campo de formulário (POST) já sem espaços nas pontas. */
function campo(string $nome, string $omissao = ''): string
{
    return trim((string)($_POST[$nome] ?? $omissao));
}

/** Volta à página anterior (ou à indicada). */
function voltar(string $alternativa = 'index.php'): void
{
    $ref = $_POST['voltar'] ?? $_SERVER['HTTP_REFERER'] ?? $alternativa;
    // Só permite voltar para páginas do próprio site
    if (preg_match('#^https?://#', $ref) && parse_url($ref, PHP_URL_HOST) !== ($_SERVER['HTTP_HOST'] ?? '')) {
        $ref = $alternativa;
    }
    ir($ref);
}

// ---------------------------------------------------------------------
// Apresentação
// ---------------------------------------------------------------------

/** "há 5 min", "ontem", ... */
function tempo(?string $data): string
{
    if (!$data) return '';
    $s = time() - strtotime($data);
    if ($s < 60) return 'agora';
    if ($s < 3600) return 'há ' . floor($s / 60) . ' min';
    if ($s < 86400) return 'há ' . floor($s / 3600) . ' h';
    if ($s < 172800) return 'ontem';
    if ($s < 2592000) return 'há ' . floor($s / 86400) . ' dias';
    return date('d/m/Y', strtotime($data));
}

/** Avatar redondo com a inicial e a cor do utilizador. */
function avatar(array $u, string $tamanho = 's'): string
{
    $letra = mb_strtoupper(mb_substr($u['nome'], 0, 1));
    return '<span class="av ' . $tamanho . '" style="--h:' . (int)$u['cor'] . '">' . e($letra) . '</span>';
}

/** Link para o perfil de um utilizador. */
function link_perfil(array $u): string
{
    return '<a class="lk-u" href="perfil.php?u=' . urlencode($u['nome']) . '">' . e($u['nome']) . '</a>';
}

/** Estrelas de 1 a 5. */
function estrelas($nota): string
{
    $n = (int)round((float)$nota);
    return '<span class="sst" title="' . e(number_format((float)$nota, 1)) . ' de 5">' . str_repeat('★', $n) . str_repeat('☆', 5 - $n) . '</span>';
}

/** Cor (0–359) calculada a partir de um texto, para os cartazes sem imagem. */
function cor_de(string $texto): int
{
    $s = 0;
    foreach (mb_str_split($texto) as $c) $s += mb_ord($c) * 7;
    return $s % 360;
}

/**
 * Endereço de uma imagem guardada na base de dados, ou null.
 * Aceita ficheiros carregados no site (cartaz-… / fundo-…) e imagens do TMDB.
 */
function url_imagem(?string $valor): ?string
{
    if (!$valor) return null;
    if (str_starts_with($valor, TMDB_IMG)) return $valor;
    if (preg_match('/^(cartaz|fundo)-[\w.-]+$/', $valor) && is_file(__DIR__ . '/' . $valor)) return $valor;
    return null;
}

/** Imagem larga de um título (para os destaques), ou null. */
function fundo(array $t): ?string
{
    return url_imagem($t['fundo'] ?? null);
}

/**
 * Cartaz de um título: a imagem, se existir; senão um cartaz desenhado
 * com a cor do título, o ano, o nome e o género.
 */
function cartaz(array $t, string $classe = 'poster'): string
{
    $img = url_imagem($t['cartaz'] ?? null);
    if ($img) {
        return '<div class="' . $classe . ' has-img" style="--img:url(\'' . e($img) . '\')" role="img" aria-label="Cartaz de ' . e($t['nome']) . '"></div>';
    }
    return '<div class="' . $classe . ' art" style="--h:' . cor_de($t['nome']) . '" role="img" aria-label="' . e($t['nome']) . '">' .
        '<span class="p-ano">' . (int)($t['ano'] ?? 0) . '</span><b>' . e(mb_strtoupper($t['nome'])) . '</b>' .
        '<span class="p-gen">' . e($t['genero1'] ?? '') . '</span></div>';
}

/** Cartão de um título para as grelhas (catálogo, listas, perfil). */
function cartao_titulo(array $t): string
{
    $media = isset($t['media']) && $t['media'] !== null ? number_format((float)$t['media'], 1) : '–';
    return '<a class="card" href="titulo.php?id=' . (int)$t['id'] . '"><div class="cw">' . cartaz($t) .
        '<span class="nota"><i class="st">★</i> ' . $media . '</span></div>' .
        '<h3>' . e($t['nome']) . '</h3><small>' . (int)$t['ano'] . ' · ' . ($t['tipo'] === 'filme' ? 'Filme' : 'Série') . '</small></a>';
}

/** Cartão horizontal (filas da página inicial). */
function cartao_fila(array $t): string
{
    $media = isset($t['media']) && $t['media'] !== null ? number_format((float)$t['media'], 1) : '–';
    $img = fundo($t);   // nas filas largas usa a imagem horizontal, se existir
    $capa = $img ? '<div class="poster has-img" style="--img:url(\'' . e($img) . '\')" role="img" aria-label="' . e($t['nome']) . '"></div>' : cartaz($t);
    return '<a class="rc" href="titulo.php?id=' . (int)$t['id'] . '">' . $capa .
        '<div class="rt"><h3>' . e($t['nome']) . '</h3><small>' . (int)$t['ano'] . ' <span><i class="st">★</i> ' . $media . '</span></small></div></a>';
}

/** Cartão de um projeto: capa com o título e, por baixo, a sinopse e a equipa. */
function cartao_projeto(array $p): string
{
    return '<a class="pjv" href="projeto.php?id=' . (int)$p['id'] . '">' .
        '<div class="pjv-capa" style="--h:' . cor_de($p['titulo']) . '"><span class="pk">' . e($p['tipo']) . '</span><h3>' . e($p['titulo']) . '</h3></div>' .
        '<div class="pjv-txt"><p>' . e(mb_strimwidth($p['sinopse'], 0, 110, '…')) . '</p>' .
        '<div class="pjv-pe"><span class="mb">👤 ' . (int)($p['membros'] ?? 0) . ' membros</span>' . badge_estado($p['estado']) . '</div></div></a>';
}

/** Fila de cartazes com número grande, ao estilo "Top 10". */
function top10(array $titulos): string
{
    $html = '<div class="hrow top10">';
    foreach ($titulos as $i => $t) {
        $html .= '<a class="t10" href="titulo.php?id=' . (int)$t['id'] . '" title="' . e($t['nome']) . '"><span class="t10-n">' . ($i + 1) . '</span>' .
            cartaz($t) . '<span class="sr">' . e($t['nome']) . '</span></a>';
    }
    return $html . '</div>';
}

// ---------------------------------------------------------------------
// TMDB – imagens reais dos filmes e séries (opcional, precisa de chave)
// ---------------------------------------------------------------------

/** Faz um pedido à API do TMDB e devolve a resposta (array) ou null. */
function tmdb_pedido(string $caminho, array $param = []): ?array
{
    if (TMDB_CHAVE === '') return null;
    $url = rtrim(TMDB_API, '/') . $caminho . '?' . http_build_query($param + ['api_key' => TMDB_CHAVE, 'language' => 'pt-PT']);
    if (function_exists('curl_init')) {
        $c = curl_init($url);
        curl_setopt_array($c, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_FOLLOWLOCATION => true]);
        $resposta = curl_exec($c);
        $codigo = curl_getinfo($c, CURLINFO_HTTP_CODE);
        curl_close($c);
        if ($resposta === false || $codigo !== 200) return null;
    } else {
        $resposta = @file_get_contents($url, false, stream_context_create(['http' => ['timeout' => 10]]));
        if ($resposta === false) return null;
    }
    $dados = json_decode($resposta, true);
    return is_array($dados) ? $dados : null;
}

/**
 * Procura o título no TMDB (pelo número, se o tiver, ou pelo nome e ano)
 * e devolve ['id', 'cartaz', 'fundo'] com os endereços das imagens, ou null.
 */
function tmdb_imagens(array $t): ?array
{
    $tipo = $t['tipo'] === 'filme' ? 'movie' : 'tv';
    if (!empty($t['tmdb_id'])) {
        $r = tmdb_pedido('/' . $tipo . '/' . (int)$t['tmdb_id']);
    } else {
        $campo_ano = $tipo === 'movie' ? 'year' : 'first_air_date_year';
        $res = tmdb_pedido('/search/' . $tipo, ['query' => $t['nome'], $campo_ano => (int)$t['ano']]);
        if (empty($res['results'])) $res = tmdb_pedido('/search/' . $tipo, ['query' => $t['nome']]);
        $r = $res['results'][0] ?? null;
    }
    if (empty($r['id'])) return null;
    return [
        'id' => (int)$r['id'],
        'cartaz' => !empty($r['poster_path']) ? TMDB_IMG . 'w500' . $r['poster_path'] : null,
        'fundo' => !empty($r['backdrop_path']) ? TMDB_IMG . 'w1280' . $r['backdrop_path'] : null,
    ];
}

/** Vai buscar as imagens de um título ao TMDB e guarda-as. Devolve true se encontrou. */
function tmdb_atualizar(array $t): bool
{
    $img = tmdb_imagens($t);
    if (!$img) return false;
    // Não substitui um cartaz carregado à mão
    $cartaz = url_imagem($t['cartaz'] ?? null) && !str_starts_with($t['cartaz'], TMDB_IMG) ? $t['cartaz'] : ($img['cartaz'] ?? $t['cartaz']);
    $fundo = url_imagem($t['fundo'] ?? null) && !str_starts_with($t['fundo'], TMDB_IMG) ? $t['fundo'] : ($img['fundo'] ?? $t['fundo']);
    sql('UPDATE titulos SET tmdb_id = ?, cartaz = ?, fundo = ? WHERE id = ?', [$img['id'], $cartaz, $fundo, $t['id']]);
    tmdb_plataformas($t['tipo'], $img['id'], (int)$t['id']);
    return true;
}

/**
 * "Onde ver": pede ao TMDB as plataformas de subscrição em Portugal (dados da JustWatch)
 * e guarda-as no título. Plataformas que ainda não existam são criadas.
 */
function tmdb_plataformas(string $tipo, int $tmdb_id, int $titulo_id): void
{
    $r = tmdb_pedido('/' . ($tipo === 'filme' ? 'movie' : 'tv') . '/' . $tmdb_id . '/watch/providers');
    if (!isset($r['results'])) return;
    $nomes = array_column($r['results']['PT']['flatrate'] ?? [], 'provider_name');
    if (!$nomes) return;
    sql('DELETE FROM titulo_plataformas WHERE titulo_id = ?', [$titulo_id]);
    foreach (array_unique($nomes) as $nome) {
        $nome = mb_substr($nome, 0, 40);
        $pid = valor('SELECT id FROM plataformas WHERE nome = ?', [$nome]);
        if (!$pid) {
            sql('INSERT INTO plataformas (nome) VALUES (?)', [$nome]);
            $pid = bd()->lastInsertId();
        }
        sql('INSERT INTO titulo_plataformas (titulo_id, plataforma_id) VALUES (?, ?)', [$titulo_id, $pid]);
    }
}

function badge_estado(string $estado): string
{
    $cores = ['Ideia' => 270, 'Recrutamento' => 330, 'Pré-produção' => 35, 'Em produção' => 150, 'Concluído' => 215,
              'pendente' => 35, 'aceite' => 150, 'rejeitada' => 0, 'resolvida' => 150, 'ignorada' => 215];
    return '<span class="badge" style="--c:' . ($cores[$estado] ?? 330) . '">' . e(ucfirst($estado)) . '</span>';
}

/** Consulta base para obter títulos com a média e o número de avaliações. */
const SQL_TITULOS = 'SELECT t.*, (SELECT AVG(a.nota) FROM avaliacoes a WHERE a.titulo_id = t.id) AS media,
                            (SELECT COUNT(*) FROM avaliacoes a WHERE a.titulo_id = t.id) AS n_aval,
                            (SELECT g.nome FROM generos g JOIN titulo_generos tg ON tg.genero_id = g.id WHERE tg.titulo_id = t.id ORDER BY g.nome LIMIT 1) AS genero1
                     FROM titulos t';

/** Consulta base para obter projetos com o número de membros da equipa. */
const SQL_PROJETOS = 'SELECT p.*, (SELECT COUNT(*) FROM projeto_equipa e WHERE e.projeto_id = p.id) AS membros FROM projetos p';

/** Lista de géneros de um título, ex.: "Drama · Crime". */
/** Plataformas onde o título está disponível ("Onde ver"). */
function plataformas_titulo(int $id): array
{
    return linhas('SELECT p.* FROM plataformas p JOIN titulo_plataformas tp ON tp.plataforma_id = p.id WHERE tp.titulo_id = ? ORDER BY p.nome', [$id]);
}

/** Etiqueta de uma plataforma, com a sua cor e link para o site dela. */
function etiqueta_plataforma(array $p): string
{
    $cor = preg_match('/^#[0-9A-Fa-f]{6}$/', $p['cor'] ?? '') ? $p['cor'] : '#888888';
    $txt = e($p['nome']);
    $inicial = '<i style="background:' . $cor . '">' . e(mb_strtoupper(mb_substr($p['nome'], 0, 1))) . '</i>';
    return $p['url'] && preg_match('#^https://#', $p['url'])
        ? '<a class="plat" href="' . e($p['url']) . '" target="_blank" rel="noopener">' . $inicial . $txt . '</a>'
        : '<span class="plat">' . $inicial . $txt . '</span>';
}

function generos_titulo(int $id): string
{
    $g = linhas('SELECT g.nome FROM generos g JOIN titulo_generos tg ON tg.genero_id = g.id WHERE tg.titulo_id = ? ORDER BY g.nome', [$id]);
    return implode(' · ', array_column($g, 'nome'));
}

/** Botões de paginação. */
function paginacao(int $total, int $pagina, int $por_pagina, array $parametros): string
{
    $paginas = (int)ceil($total / $por_pagina);
    if ($paginas <= 1) return '';
    $html = '<nav class="pg">';
    for ($i = 1; $i <= $paginas; $i++) {
        $parametros['p'] = $i;
        $html .= '<a class="' . ($i === $pagina ? 'on' : '') . '" href="?' . e(http_build_query($parametros)) . '">' . $i . '</a>';
    }
    return $html . '</nav>';
}

// ---------------------------------------------------------------------
// Notificações
// ---------------------------------------------------------------------

/** Cria uma notificação (se o utilizador não silenciou esse tipo) e envia email se pedido. */
function notificar(int $para, string $tipo, string $texto, string $link = ''): void
{
    if (eu() && (int)eu()['id'] === $para) return;   // não se notifica a si próprio
    if (valor('SELECT COUNT(*) FROM notif_silenciadas WHERE utilizador_id = ? AND tipo = ?', [$para, $tipo])) return;
    sql('INSERT INTO notificacoes (utilizador_id, tipo, texto, link, criado_em) VALUES (?, ?, ?, ?, ?)', [$para, $tipo, $texto, $link, agora()]);

    $u = linha('SELECT email, notif_email FROM utilizadores WHERE id = ?', [$para]);
    if ($u && $u['notif_email'] && !MODO_DEV) {
        enviar_email($u['email'], 'TavDex – ' . $texto, $texto . "\n\n" . URL_SITE . '/' . $link);
    }
}

function enviar_email(string $para, string $assunto, string $texto): bool
{
    $cab = 'From: TavDex <' . EMAIL_SITE . ">\r\nContent-Type: text/plain; charset=UTF-8";
    return @mail($para, '=?UTF-8?B?' . base64_encode($assunto) . '?=', $texto, $cab);
}

// ---------------------------------------------------------------------
// Recomendações
// ---------------------------------------------------------------------

/**
 * Recomendações personalizadas: dá pontos aos géneros dos títulos que o
 * utilizador avaliou bem ou pôs nos favoritos e sugere títulos desses géneros
 * que ainda não viu nem avaliou, ordenados pelos pontos e pela média.
 */
function recomendacoes(int $uid, int $quantos = 10): array
{
    $pesos = [];
    $gostos = linhas('SELECT tg.genero_id, a.nota FROM avaliacoes a JOIN titulo_generos tg ON tg.titulo_id = a.titulo_id WHERE a.utilizador_id = ?', [$uid]);
    foreach ($gostos as $g) $pesos[$g['genero_id']] = ($pesos[$g['genero_id']] ?? 0) + ($g['nota'] - 2.5);
    $favs = linhas("SELECT tg.genero_id FROM listas l JOIN titulo_generos tg ON tg.titulo_id = l.titulo_id WHERE l.utilizador_id = ? AND l.tipo = 'favorito'", [$uid]);
    foreach ($favs as $g) $pesos[$g['genero_id']] = ($pesos[$g['genero_id']] ?? 0) + 2;

    $vistos = array_column(linhas("SELECT titulo_id FROM avaliacoes WHERE utilizador_id = ? UNION SELECT titulo_id FROM listas WHERE utilizador_id = ? AND tipo IN ('favorito','visto')", [$uid, $uid]), 'titulo_id');
    $todos = linhas(SQL_TITULOS);
    $gen = [];
    foreach (linhas('SELECT titulo_id, genero_id FROM titulo_generos') as $r) $gen[$r['titulo_id']][] = $r['genero_id'];

    $lista = [];
    foreach ($todos as $t) {
        if (in_array($t['id'], $vistos)) continue;
        $pontos = 0;
        foreach ($gen[$t['id']] ?? [] as $g) $pontos += $pesos[$g] ?? 0;
        $t['pontos'] = $pontos + (float)$t['media'] * 0.8;
        $lista[] = $t;
    }
    usort($lista, fn($a, $b) => $b['pontos'] <=> $a['pontos']);
    return array_slice($lista, 0, $quantos);
}

/** Campo para escolher de 1 a 5 estrelas (funciona só com HTML e CSS). */
function campo_estrelas(int $atual = 0): string
{
    static $n = 0;
    $n++;
    $html = '<div class="stars-in" role="radiogroup" aria-label="Classificação">';
    for ($i = 5; $i >= 1; $i--) {
        $html .= '<input type="radio" id="e' . $n . '_' . $i . '" name="nota" value="' . $i . '"' . ($atual === $i ? ' checked' : '') . ' required>' .
                 '<label for="e' . $n . '_' . $i . '" title="' . $i . ' estrela' . ($i > 1 ? 's' : '') . '">★</label>';
    }
    return $html . '</div>';
}

/**
 * Compatibilidade de gostos entre dois utilizadores.
 * Compara as notas dos títulos que ambos avaliaram: notas iguais = 100%,
 * 1★ contra 5★ = 0%. A percentagem é a média dessas semelhanças.
 * Devolve null se tiverem menos de 3 títulos avaliados em comum.
 */
function compatibilidade(int $a, int $b): ?array
{
    $comuns = linhas('SELECT t.id, t.nome, x.nota AS na, y.nota AS nb FROM avaliacoes x
                      JOIN avaliacoes y ON y.titulo_id = x.titulo_id AND y.utilizador_id = ?
                      JOIN titulos t ON t.id = x.titulo_id
                      WHERE x.utilizador_id = ? ORDER BY t.nome', [$b, $a]);
    $favs = linhas("SELECT t.id, t.nome FROM listas l1 JOIN listas l2 ON l2.titulo_id = l1.titulo_id AND l2.utilizador_id = ? AND l2.tipo = 'favorito'
                    JOIN titulos t ON t.id = l1.titulo_id WHERE l1.utilizador_id = ? AND l1.tipo = 'favorito' ORDER BY t.nome", [$b, $a]);
    if (count($comuns) < 3) return ['percent' => null, 'n' => count($comuns), 'favs' => $favs, 'concordam' => [], 'discordam' => []];

    $soma = 0;
    foreach ($comuns as &$c) {
        $c['dif'] = abs((int)$c['na'] - (int)$c['nb']);
        $soma += 1 - $c['dif'] / 4;
    }
    unset($c);
    // Onde concordam: notas iguais e altas primeiro; onde discordam: maior diferença
    $concordam = array_filter($comuns, fn($c) => $c['dif'] === 0);
    usort($concordam, fn($x, $y) => $y['na'] <=> $x['na']);
    $discordam = array_filter($comuns, fn($c) => $c['dif'] >= 2);
    usort($discordam, fn($x, $y) => $y['dif'] <=> $x['dif']);
    return [
        'percent' => (int)round($soma / count($comuns) * 100),
        'n' => count($comuns),
        'favs' => $favs,
        'concordam' => array_slice($concordam, 0, 3),
        'discordam' => array_slice($discordam, 0, 3),
    ];
}

// ---------------------------------------------------------------------
// Anti-spam
// ---------------------------------------------------------------------

/**
 * Verifica se o utilizador já fez demasiadas coisas do mesmo tipo em pouco tempo.
 * Exemplo: demasiado('mensagens', 'de_id', 7, 8, 20) = mais de 8 mensagens em 20 segundos?
 * Só aceita tabelas e colunas desta lista (nunca texto vindo do utilizador).
 */
function demasiado(string $tabela, string $coluna, int $uid, int $max, int $segundos): bool
{
    $permitidas = ['mensagens' => 'de_id', 'publicacoes' => 'utilizador_id', 'comentarios' => 'utilizador_id',
                   'projetos' => 'dono_id', 'candidaturas' => 'utilizador_id', 'denuncias' => 'utilizador_id'];
    if (($permitidas[$tabela] ?? '') !== $coluna) return false;
    $desde = date('Y-m-d H:i:s', time() - $segundos);
    return (int)valor("SELECT COUNT(*) FROM $tabela WHERE $coluna = ? AND criado_em >= ?", [$uid, $desde]) >= $max;
}

/** Conta os links num texto (para recusar publicações com links a mais). */
function n_links(string $texto): int
{
    return preg_match_all('#(https?://|www\.)\S+|\b[\w-]+\.(com|net|org|xyz|io|ru|top|info|biz|pt)\b#i', $texto);
}

/** Campo-armadilha: as pessoas não o veem; os robôs preenchem-no. */
function campo_armadilha(): string
{
    return '<div class="hp" aria-hidden="true"><label>Não preenchas este campo<input name="website" tabindex="-1" autocomplete="off"></label></div>';
}

function caiu_na_armadilha(): bool
{
    return trim($_POST['website'] ?? '') !== '';
}

/**
 * Paginação feita na base de dados: conta o total e devolve só as linhas da página pedida (?p=N).
 * Exemplo: [$linhas, $total, $pag] = paginado('SELECT * FROM utilizadores', [], 'ORDER BY nome', 25);
 */
function paginado(string $consulta, array $param, string $ordem, int $por_pagina): array
{
    $total = (int)valor("SELECT COUNT(*) FROM ($consulta) x", $param);
    $paginas = max(1, (int)ceil($total / $por_pagina));
    $pagina = min(max(1, (int)($_GET['p'] ?? 1)), $paginas);
    $linhas = linhas("$consulta $ordem LIMIT $por_pagina OFFSET " . (($pagina - 1) * $por_pagina), $param);
    return [$linhas, $total, $pagina];
}
