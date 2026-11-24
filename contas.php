<?php
// =====================================================================
//  TavDex – Funções das contas (incluído pelo lib.php)
//   1. Sessão: iniciar sessão e "Manter sessão iniciada" (cookie seguro)
//   2. Palavras-passe: regras, lista das mais comuns e fugas de dados
//   3. Emails: formato, domínios descartáveis, DNS e confirmação por link
//   4. Imagens: foto de perfil e banner (recortadas e guardadas em JPEG)
//   5. Pedidos à internet (Google e Have I Been Pwned)
// =====================================================================

// ---------------------------------------------------------------------
// 1. SESSÃO
// ---------------------------------------------------------------------

const COOKIE_LEMBRAR = 'tavdex_lembrar';
const DIAS_LEMBRAR = 30;

/** Pasta do site no endereço (ex.: /tavdex/), para o cookie só valer neste site. */
function caminho_cookie(): string
{
    $pasta = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
    return $pasta . '/';
}

/** "Windows · Chrome" (para a lista de sessões e o registo de atividade). */
function dispositivo(): string
{
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $so = match (true) {
        str_contains($ua, 'Android') => 'Android',
        str_contains($ua, 'iPhone'), str_contains($ua, 'iPad') => 'iOS',
        str_contains($ua, 'Windows') => 'Windows',
        str_contains($ua, 'Mac OS') => 'macOS',
        str_contains($ua, 'Linux') => 'Linux',
        default => 'Outro sistema',
    };
    $browser = match (true) {
        str_contains($ua, 'Edg/') => 'Edge',
        str_contains($ua, 'OPR/') => 'Opera',
        str_contains($ua, 'Firefox/') => 'Firefox',
        str_contains($ua, 'Chrome/') => 'Chrome',
        str_contains($ua, 'Safari/') => 'Safari',
        default => 'browser',
    };
    return $so . ' · ' . $browser;
}

/**
 * Inicia a sessão de um utilizador (login, registo confirmado, Google).
 * session_regenerate_id muda o identificador da sessão (evita roubo de sessão).
 * Com $manter, fica também um cookie para entrar sozinho durante 30 dias.
 */
function iniciar_sessao(array $u, bool $manter = false): void
{
    session_regenerate_id(true);
    $_SESSION['uid'] = (int)$u['id'];
    unset($_SESSION['por_confirmar'], $_SESSION['login_falhas'], $_SESSION['login_espera']);
    sql('UPDATE utilizadores SET ultimo_login = ? WHERE id = ?', [agora(), $u['id']]);
    if ($manter) lembrar_sessao((int)$u['id']);
}

/**
 * "Manter sessão iniciada": cria um token para este dispositivo.
 * O cookie tem duas partes, "seletor:validador". Na base de dados fica o seletor
 * (para encontrar a linha) e SÓ o hash do validador: quem lesse a base de dados
 * não conseguia criar um cookie válido.
 */
function lembrar_sessao(int $uid): void
{
    $seletor = bin2hex(random_bytes(12));      // 24 caracteres
    $validador = bin2hex(random_bytes(32));
    $expira = time() + DIAS_LEMBRAR * 86400;
    sql('INSERT INTO sessoes_lembradas (utilizador_id, seletor, token_hash, dispositivo, expira_em, criado_em) VALUES (?, ?, ?, ?, ?, ?)',
        [$uid, $seletor, hash('sha256', $validador), mb_substr(dispositivo(), 0, 120), date('Y-m-d H:i:s', $expira), agora()]);
    setcookie(COOKIE_LEMBRAR, $seletor . ':' . $validador, [
        'expires' => $expira, 'path' => caminho_cookie(), 'httponly' => true, 'samesite' => 'Lax',
        'secure' => (($_SERVER['HTTPS'] ?? '') === 'on'),
    ]);
    $_SESSION['seletor'] = $seletor;
}

/** Apaga o cookie deste browser. */
function apagar_cookie_lembrar(): void
{
    setcookie(COOKIE_LEMBRAR, '', ['expires' => time() - 3600, 'path' => caminho_cookie(), 'httponly' => true, 'samesite' => 'Lax']);
    unset($_COOKIE[COOKIE_LEMBRAR]);
}

/**
 * Sem sessão, mas com o cookie "Manter sessão iniciada": confirma o token e entra.
 * O token é trocado por um novo de cada vez (um cookie roubado e já usado deixa de servir).
 */
function entrar_com_cookie(): void
{
    $cookie = $_COOKIE[COOKIE_LEMBRAR] ?? '';
    if (!preg_match('/^([a-f0-9]{24}):([a-f0-9]{64})$/', $cookie, $m)) return;
    $s = linha('SELECT s.*, u.bloqueado, u.email_verificado FROM sessoes_lembradas s JOIN utilizadores u ON u.id = s.utilizador_id WHERE s.seletor = ?', [$m[1]]);
    if (!$s || strtotime($s['expira_em']) < time()) {
        apagar_cookie_lembrar();
        return;
    }
    if (!hash_equals($s['token_hash'], hash('sha256', $m[2]))) {
        // O seletor existe mas o validador está errado: alguém pode ter copiado o cookie.
        // Por segurança, termina todas as sessões lembradas dessa conta.
        sql('DELETE FROM sessoes_lembradas WHERE utilizador_id = ?', [$s['utilizador_id']]);
        apagar_cookie_lembrar();
        return;
    }
    sql('DELETE FROM sessoes_lembradas WHERE id = ?', [$s['id']]);
    if ($s['bloqueado'] || !$s['email_verificado']) {
        apagar_cookie_lembrar();
        return;
    }
    session_regenerate_id(true);
    $_SESSION['uid'] = (int)$s['utilizador_id'];
    lembrar_sessao((int)$s['utilizador_id']);
}

/** Termina as sessões lembradas de uma conta (todas, ou todas menos a deste browser). */
function terminar_sessoes_lembradas(int $uid, bool $menos_esta = false): void
{
    if ($menos_esta && !empty($_SESSION['seletor'])) {
        sql('DELETE FROM sessoes_lembradas WHERE utilizador_id = ? AND seletor <> ?', [$uid, $_SESSION['seletor']]);
    } else {
        sql('DELETE FROM sessoes_lembradas WHERE utilizador_id = ?', [$uid]);
    }
}

// ---------------------------------------------------------------------
// 2. PALAVRAS-PASSE
// As mesmas regras estão em regras-palavra-passe.js (mostradas ao vivo no browser).
//  · 10 ou mais caracteres e no máximo 72 bytes (o bcrypt só usa os primeiros 72);
//  · maiúscula, minúscula, número e símbolo;
//  · sem 4 caracteres iguais seguidos nem sequências (1234, abcd, qwer);
//  · sem o @nome, o nome nem o início do email;
//  · fora da lista das 10 000 mais comuns e das fugas de dados conhecidas.
// As palavras-passe que já existem continuam a funcionar: as regras são para as novas.
// ---------------------------------------------------------------------

/** Minúsculas e sem acentos ("Ação" -> "acao"), para comparar. */
function simplificar(string $t): string
{
    $t = mb_strtolower($t);
    return strtr($t, ['á' => 'a', 'à' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a', 'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
        'í' => 'i', 'ì' => 'i', 'î' => 'i', 'ï' => 'i', 'ó' => 'o', 'ò' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o',
        'ú' => 'u', 'ù' => 'u', 'û' => 'u', 'ü' => 'u', 'ç' => 'c', 'ñ' => 'n']);
}

/** Dados pessoais de uma conta, no formato que as regras usam. */
function dados_pessoais(array $u): array
{
    return ['nome' => $u['nome'] ?? '', 'nome_exibicao' => $u['nome_exibicao'] ?? '', 'email' => $u['email'] ?? ''];
}

/** Partes pessoais que não podem aparecer na palavra-passe (só as que têm 3 ou mais letras). */
function partes_pessoais(array $dados): array
{
    $partes = [];
    $juntar = function (string $t) use (&$partes) {
        $t = trim(simplificar($t));
        if (strlen(preg_replace('/[^a-z]/', '', $t)) >= 3) $partes[$t] = true;
    };
    $juntar(ltrim($dados['nome'] ?? '', '@'));
    foreach (preg_split('/[^a-z0-9]+/', simplificar($dados['nome_exibicao'] ?? '')) as $p) $juntar($p);
    $antes = explode('@', $dados['email'] ?? '')[0];
    $juntar($antes);
    foreach (preg_split('/[^a-z]+/', simplificar($antes)) as $p) $juntar($p);
    return array_keys($partes);
}

/** Tem um pedaço de 4 de uma sequência óbvia (alfabeto, números, teclado), também ao contrário? */
function tem_sequencia(string $p): bool
{
    $t = simplificar($p);
    foreach (['abcdefghijklmnopqrstuvwxyz', '01234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', 'azertyuiop'] as $s) {
        foreach ([$s, strrev($s)] as $base) {
            for ($i = 0; $i + 4 <= strlen($base); $i++) {
                if (str_contains($t, substr($base, $i, 4))) return true;
            }
        }
    }
    return false;
}

/** A palavra-passe (ou a versão "limpa", ex.: "P@ssw0rd2026!" -> "password") está na lista das mais comuns? */
function palavra_passe_comum(string $p): bool
{
    static $comuns = null;
    if ($comuns === null) {
        $ficheiro = __DIR__ . '/dados/palavras-passe-comuns.txt';
        $comuns = is_file($ficheiro) ? array_flip(array_filter(array_map('trim', file($ficheiro)))) : [];
    }
    $t = simplificar($p);
    $trocas = ['@' => 'a', '4' => 'a', '3' => 'e', '1' => 'i', '!' => 'i', '0' => 'o', '$' => 's', '5' => 's', '7' => 't'];
    $limpa = fn($s) => preg_replace('/^[^a-z]+|[^a-z]+$/', '', $s);
    $sem_fim = preg_replace('/[^a-z]+$/', '', $t);
    foreach ([$t, $limpa($t), $limpa(strtr($sem_fim, $trocas)), $limpa(strtr($t, $trocas))] as $v) {
        if (strlen($v) >= 3 && isset($comuns[$v])) return true;
    }
    return false;
}

/**
 * A palavra-passe apareceu em fugas de dados? (API "Pwned Passwords")
 * Só se envia o INÍCIO do hash SHA-1 (5 caracteres): a palavra-passe nunca sai do servidor.
 * Se a internet falhar, não bloqueia.
 */
function apareceu_em_fugas(string $p): bool
{
    if (!VERIFICAR_FUGAS || getenv('TAVDEX_DSN')) return false;
    $sha1 = strtoupper(sha1($p));
    $resposta = pedido_http('https://api.pwnedpasswords.com/range/' . substr($sha1, 0, 5), null, ['Add-Padding: true'], 3);
    if ($resposta === null) return false;
    foreach (explode("\n", $resposta) as $l) {
        [$sufixo, $vezes] = array_pad(explode(':', trim($l)), 2, 0);
        if ($sufixo === substr($sha1, 5) && (int)$vezes > 0) return true;
    }
    return false;
}

/** Verifica uma palavra-passe NOVA. Devolve a primeira mensagem de erro, ou null se estiver boa. */
function erro_palavra_passe(string $p, array $dados = []): ?string
{
    if ($p === '') return 'Escreve uma palavra-passe.';
    if (mb_strlen($p) < 10) return 'A palavra-passe tem de ter pelo menos 10 caracteres.';
    if (strlen($p) > 72) return 'A palavra-passe é demasiado comprida (máximo 72 bytes; acentos e emojis contam mais).';
    if (!preg_match('/\p{Ll}/u', $p) || !preg_match('/\p{Lu}/u', $p)) return 'Usa pelo menos uma letra maiúscula e uma minúscula.';
    if (!preg_match('/\p{N}/u', $p)) return 'Usa pelo menos um número.';
    if (!preg_match('/[^\p{L}\p{N}\s]/u', $p)) return 'Usa pelo menos um símbolo (ex.: ! ? # @).';
    if (preg_match('/(.)\1{3,}/u', $p)) return 'Não uses mais de 3 caracteres iguais seguidos.';
    if (tem_sequencia($p)) return 'Evita sequências óbvias como 1234, abcd ou qwer.';
    foreach (partes_pessoais($dados) as $parte) {
        if (str_contains(simplificar($p), $parte)) return 'A palavra-passe não pode conter o teu nome nem o teu email.';
    }
    if (palavra_passe_comum($p)) return 'Essa palavra-passe é demasiado comum. Escolhe outra.';
    if (apareceu_em_fugas($p)) return 'Esta palavra-passe apareceu em fugas de dados. Escolhe outra.';
    return null;
}

/** Lista dos requisitos para mostrar no formulário (o regras-palavra-passe.js marca-os ao vivo). */
function lista_requisitos(): string
{
    $itens = ['tamanho' => '10 ou mais caracteres', 'letras' => 'Uma letra maiúscula e uma minúscula', 'numero' => 'Um número',
              'simbolo' => 'Um símbolo (ex.: ! ? # @)', 'pessoal' => 'Não contém o teu nome nem o teu email'];
    $html = '<ul class="requisitos" data-requisitos aria-live="polite">';
    foreach ($itens as $id => $texto) $html .= '<li data-req="' . $id . '"><span aria-hidden="true">○</span>' . $texto . '</li>';
    return $html . '</ul><div class="forca" data-forca data-n="0"><i></i><i></i><i></i><i></i><span></span></div>';
}

// ---------------------------------------------------------------------
// 3. EMAILS
// ---------------------------------------------------------------------

/** "duarte@gmail.com" -> "d•••••@gmail.com" (mostra o email sem o revelar todo). */
function esconder_email(string $email): string
{
    $i = strrpos($email, '@');
    if (!$i) return '•••';
    return mb_substr($email, 0, 1) . str_repeat('•', min(5, max(3, $i - 1))) . substr($email, $i);
}

/** Verifica um email. Devolve a mensagem de erro, ou null se estiver bom. */
function erro_email(string $email): ?string
{
    if ($email === '') return 'Escreve o teu email.';
    if (strlen($email) > 120 || !filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/@([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/', $email)) {
        return 'Escreve um email válido (ex.: nome@gmail.com).';
    }
    $dominio = substr($email, strrpos($email, '@') + 1);
    // Emails descartáveis (duram 10 minutos): não servem para recuperar a conta
    static $descartaveis = null;
    if ($descartaveis === null) {
        $ficheiro = __DIR__ . '/dados/dominios-descartaveis.txt';
        $descartaveis = is_file($ficheiro) ? array_flip(array_filter(array_map('trim', file($ficheiro)))) : [];
    }
    if (isset($descartaveis[$dominio])) return 'Não aceitamos emails temporários. Usa o teu email habitual.';
    // O domínio recebe emails? (só se o computador tiver internet: o gmail.com responde sempre)
    if (VERIFICAR_DNS && !getenv('TAVDEX_DSN') && function_exists('checkdnsrr') && @checkdnsrr('gmail.com', 'MX')) {
        if (!@checkdnsrr($dominio, 'MX') && !@checkdnsrr($dominio, 'A')) return 'O domínio ' . $dominio . ' não recebe emails. Confirma se está bem escrito.';
    }
    return null;
}

/** Pode enviar mais um link a esta conta? Máximo 5 por hora, com 60 segundos entre envios. */
function limite_envios(int $uid): array
{
    $desde = date('Y-m-d H:i:s', time() - 3600);
    $n = (int)valor('SELECT COUNT(*) FROM verificacao_email WHERE utilizador_id = ? AND criado_em >= ?', [$uid, $desde]);
    $ultimo = valor('SELECT MAX(criado_em) FROM verificacao_email WHERE utilizador_id = ?', [$uid]);
    if ($n >= 5) return ['pode' => false, 'espera' => 0, 'motivo' => 'Já pediste 5 emails na última hora. Tenta mais tarde.'];
    $passou = $ultimo ? time() - strtotime($ultimo) : 999;
    if ($passou < 60) return ['pode' => false, 'espera' => 60 - $passou, 'motivo' => 'Espera ' . (60 - $passou) . ' segundos antes de pedir outro email.'];
    return ['pode' => true, 'espera' => 0, 'motivo' => ''];
}

/**
 * Cria um link de confirmação (anula os anteriores) e envia-o por email.
 *  $tipo = 'registo' (confirmar a conta) ou 'mudanca' (confirmar o email novo)
 * O token tem 32 bytes aleatórios; na base de dados fica SÓ o hash. Vale 24 horas e uma vez.
 * Em MODO_DEV (sem servidor de email) o link fica na sessão para aparecer no ecrã.
 */
function enviar_confirmacao(array $u, string $email, string $tipo = 'registo'): void
{
    sql('UPDATE verificacao_email SET usado = 1 WHERE utilizador_id = ? AND usado = 0', [$u['id']]);
    $token = bin2hex(random_bytes(32));
    sql('INSERT INTO verificacao_email (utilizador_id, email, token_hash, expira_em, criado_em) VALUES (?, ?, ?, ?, ?)',
        [$u['id'], $email, hash('sha256', $token), date('Y-m-d H:i:s', time() + 86400), agora()]);
    $link = URL_SITE . '/confirmar_email.php?token=' . $token;
    if (MODO_DEV) {
        $_SESSION['link_dev'] = 'confirmar_email.php?token=' . $token;
        return;
    }
    $nome = nome_visivel($u);
    $texto = $tipo === 'registo'
        ? "Olá $nome,\n\nObrigado por te juntares ao TavDex! Para ativar a tua conta (@{$u['nome']}), confirma que este email é teu:\n$link\n\nO link é válido durante 24 horas e só pode ser usado uma vez.\nSe não criaste uma conta no TavDex, ignora este email."
        : "Olá $nome,\n\nPediste para mudar o email da tua conta TavDex (@{$u['nome']}) para este endereço. Confirma que é teu:\n$link\n\nO link é válido durante 24 horas.\nSe não pediste esta mudança, ignora este email: o email da conta continua igual.";
    enviar_email($email, $tipo === 'registo' ? 'TavDex – confirma o teu email' : 'TavDex – confirma o teu novo email', $texto);
}

/** Contas criadas com email e palavra-passe que nunca foram confirmadas em 7 dias são apagadas (libertam o email e o @nome). */
function limpar_contas_por_confirmar(): void
{
    sql('DELETE FROM utilizadores WHERE email_verificado = 0 AND google_id IS NULL AND criado_em < ?', [date('Y-m-d H:i:s', time() - 7 * 86400)]);
}

// ---------------------------------------------------------------------
// 4. IMAGENS (foto de perfil e banner)
// Guardadas na base de dados em JPEG (não se perdem ao mudar de alojamento).
// O browser já as recorta e reduz antes de enviar (main.js); aqui confirma-se
// que é mesmo uma imagem e volta-se a gravar com o GD (tira dados escondidos).
// ---------------------------------------------------------------------

/** Verifica o ficheiro enviado num campo. Devolve [conteúdo, erro]; [null, null] se não enviou nada. */
function ficheiro_imagem(string $campo, int $max_mb = 5): array
{
    $f = $_FILES[$campo] ?? null;
    if (!$f || $f['error'] === UPLOAD_ERR_NO_FILE) return [null, null];
    if (in_array($f['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) || $f['size'] > $max_mb * 1024 * 1024) {
        return [null, "A imagem tem de ter no máximo $max_mb MB."];
    }
    if ($f['error'] !== UPLOAD_ERR_OK) return [null, 'Não foi possível receber a imagem. Tenta outra vez.'];
    $info = @getimagesize($f['tmp_name']);
    if (!$info || !in_array($info['mime'], ['image/jpeg', 'image/png', 'image/webp'], true)) return [null, 'A imagem tem de ser JPG, PNG ou WebP.'];
    return [file_get_contents($f['tmp_name']), null];
}

/**
 * Recorta a imagem ao centro para a proporção pedida (como "object-fit: cover")
 * e devolve um JPEG com $larg × $alt píxeis, ou null se não for uma imagem.
 */
function recortar_imagem(string $dados, int $larg, int $alt): ?string
{
    if (!function_exists('imagecreatefromstring')) return null;
    $img = @imagecreatefromstring($dados);
    if (!$img) return null;
    $w = imagesx($img);
    $h = imagesy($img);
    $escala = max($larg / $w, $alt / $h);
    $cw = (int)round($larg / $escala);
    $ch = (int)round($alt / $escala);
    $novo = imagecreatetruecolor($larg, $alt);
    imagefill($novo, 0, 0, imagecolorallocate($novo, 11, 6, 24));   // fundo para as imagens com transparência
    imagecopyresampled($novo, $img, 0, 0, (int)(($w - $cw) / 2), (int)(($h - $ch) / 2), $larg, $alt, $cw, $ch);
    ob_start();
    imagejpeg($novo, null, 86);
    return ob_get_clean();
}

// ---------------------------------------------------------------------
// 5. PEDIDOS À INTERNET (cURL)
// ---------------------------------------------------------------------

/**
 * Pedido HTTP simples. $post = array (formulário) ou null (GET).
 * Devolve o corpo da resposta, ou null se falhar ou o código não for 2xx.
 */
function pedido_http(string $url, ?array $post = null, array $cabecalhos = [], int $segundos = 10): ?string
{
    if (!function_exists('curl_init')) return null;
    $c = curl_init($url);
    curl_setopt_array($c, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => $segundos,
        CURLOPT_HTTPHEADER => array_merge(['User-Agent: TavDex-PAP'], $cabecalhos),
    ]);
    if ($post !== null) {
        curl_setopt($c, CURLOPT_POST, true);
        curl_setopt($c, CURLOPT_POSTFIELDS, http_build_query($post));
    }
    $corpo = curl_exec($c);
    $codigo = (int)curl_getinfo($c, CURLINFO_HTTP_CODE);
    curl_close($c);
    return $corpo !== false && $codigo >= 200 && $codigo < 300 ? $corpo : null;
}

/** O login com o Google está configurado em config.php? */
function google_configurado(): bool
{
    return GOOGLE_CLIENT_ID !== '' && GOOGLE_CLIENT_SECRET !== '';
}

/** "G" colorido oficial (as regras de marca da Google pedem o logótipo oficial). */
function logo_google(): string
{
    return '<svg class="g-logo" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
}

/** Botão "Continuar com Google" (volta à página indicada depois do login). */
function botao_google(string $texto = 'Continuar com Google', string $voltar = 'index.php'): string
{
    return '<a class="btn google" href="google.php?voltar=' . urlencode($voltar) . '">' . logo_google() . '<span>' . e($texto) . '</span></a>';
}
