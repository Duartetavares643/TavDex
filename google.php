<?php
// =====================================================================
//  TavDex – Login com o Google (OAuth 2.0 "authorization code" com PKCE)
//   google.php?voltar=pagina.php       entrar ou criar conta com o Google
//   google.php?modo=ligar              ligar o Google à conta (Definições)
//   google.php?code=...&state=...      o Google volta aqui depois de escolher a conta
//
//  Como funciona:
//   1. Mandamos a pessoa para a página do Google com um "state" aleatório
//      (contra pedidos forjados) e um "code_challenge" (PKCE).
//   2. O Google devolve um "code". Só o servidor o troca por um token, enviando
//      o segredo e o "code_verifier" (o código não serve a mais ninguém).
//   3. Com o token pedimos os dados da conta: sub (id), email, nome e foto.
//  Sem bibliotecas do Google: são só pedidos HTTP com cURL (pedido_http em contas.php).
// =====================================================================
require 'lib.php';

const URL_AUTORIZAR = 'https://accounts.google.com/o/oauth2/v2/auth';
const URL_TOKEN = 'https://oauth2.googleapis.com/token';
const URL_DADOS = 'https://openidconnect.googleapis.com/v1/userinfo';

/** Endereço de volta: tem de ser EXATAMENTE igual ao registado na Google Cloud Console. */
function redirect_uri(): string
{
    return URL_SITE . '/google.php';
}

/** Base64 "seguro para URLs" (sem + / =), usado no PKCE. */
function base64url(string $bytes): string
{
    return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
}

/** Volta ao login (ou às Definições) com uma mensagem de erro. */
function voltar_com_erro(string $mensagem, bool $ligar, string $voltar = 'index.php'): void
{
    aviso($mensagem, 'erro');
    ir($ligar ? 'editar_perfil.php?tab=seguranca' : 'login.php?voltar=' . urlencode($voltar));
}

// ---------------------------------------------------------------------
// Passo 2: o Google volta com um código (ou com um erro)
// ---------------------------------------------------------------------
if (isset($_GET['code']) || isset($_GET['error'])) {
    $pedido = $_SESSION['google'] ?? null;
    unset($_SESSION['google']);   // o "state" só se usa uma vez
    $ligar = $pedido && $pedido['modo'] === 'ligar';
    $voltar = $pedido['voltar'] ?? 'index.php';

    if (($_GET['error'] ?? '') === 'access_denied') voltar_com_erro('Cancelaste o login com o Google. Podes tentar outra vez ou entrar com a palavra-passe.', $ligar, $voltar);
    if (isset($_GET['error'])) voltar_com_erro('O login com o Google falhou. Tenta outra vez.', $ligar, $voltar);
    // Confirma o state (comparação em tempo constante) e a validade (10 minutos)
    if (!$pedido || !hash_equals($pedido['state'], (string)($_GET['state'] ?? '')) || time() - $pedido['criado'] > 600) {
        voltar_com_erro('O pedido expirou. Tenta outra vez.', $ligar, $voltar);
    }

    // Troca o código pelo token (só no servidor, com o segredo e o code_verifier)
    $resposta = pedido_http(URL_TOKEN, [
        'code' => (string)$_GET['code'],
        'client_id' => GOOGLE_CLIENT_ID,
        'client_secret' => GOOGLE_CLIENT_SECRET,
        'redirect_uri' => redirect_uri(),
        'grant_type' => 'authorization_code',
        'code_verifier' => $pedido['verifier'],
    ]);
    $token = $resposta ? json_decode($resposta, true) : null;
    $dados = !empty($token['access_token']) ? json_decode((string)pedido_http(URL_DADOS, null, ['Authorization: Bearer ' . $token['access_token']]), true) : null;
    if (empty($dados['sub'])) voltar_com_erro('Não foi possível confirmar a conta Google. Tenta outra vez.', $ligar, $voltar);
    if (empty($dados['email_verified'])) voltar_com_erro('Essa conta Google não tem o email confirmado.', $ligar, $voltar);

    $google_id = mb_substr((string)$dados['sub'], 0, 50);
    $google_email = mb_strtolower(mb_substr((string)($dados['email'] ?? ''), 0, 120));

    // Modo "ligar" (vindo das Definições, com sessão iniciada)
    if ($ligar) {
        $eu = eu();
        if (!$eu || (int)$eu['id'] !== $pedido['uid']) ir('login.php');
        if (valor('SELECT COUNT(*) FROM utilizadores WHERE google_id = ? AND id <> ?', [$google_id, $eu['id']])) {
            voltar_com_erro('Essa conta Google já está ligada a outra conta TavDex.', true);
        }
        sql('UPDATE utilizadores SET google_id = ?, google_email = ? WHERE id = ?', [$google_id, $google_email, $eu['id']]);
        aviso('Conta Google ligada.');
        ir('editar_perfil.php?tab=seguranca');
    }

    // Modo "entrar": 3 casos
    $u = linha('SELECT * FROM utilizadores WHERE google_id = ?', [$google_id]);
    if ($u) {
        // 1) Esta conta Google já está ligada a uma conta TavDex
        $mensagem = 'Entraste com o Google como @' . $u['nome'] . '.';
    } elseif ($u = linha('SELECT * FROM utilizadores WHERE email = ?', [$google_email])) {
        // 2) Já existe uma conta com o mesmo email: liga as duas
        if ($u['bloqueado']) voltar_com_erro('Esta conta foi bloqueada por um administrador.', false, $voltar);
        if (!$u['email_verificado']) {
            // O email nunca tinha sido confirmado: alguém pode ter registado o email de outra pessoa.
            // Apaga a palavra-passe antiga: a partir de agora só o dono do Gmail entra.
            sql('UPDATE utilizadores SET password_hash = NULL WHERE id = ?', [$u['id']]);
            terminar_sessoes_lembradas((int)$u['id']);
        }
        sql('UPDATE utilizadores SET google_id = ?, google_email = ?, email_verificado = 1 WHERE id = ?', [$google_id, $google_email, $u['id']]);
        $u = linha('SELECT * FROM utilizadores WHERE id = ?', [$u['id']]);
        $mensagem = 'A tua conta Google foi ligada à conta @' . $u['nome'] . '.';
    } else {
        // 3) Não existe: cria a conta (sem palavra-passe), com o primeiro @nome livre
        $base = substr(preg_replace('/[^a-z0-9_.]/', '', strtolower(explode('@', $google_email)[0])), 0, 16);
        if (strlen($base) < 3) $base = substr('user' . $base, 0, 16);
        $nome = $base;
        for ($i = 2; valor('SELECT COUNT(*) FROM utilizadores WHERE nome = ?', [$nome]); $i++) $nome = $base . $i;
        $nome_exibicao = mb_substr(trim((string)($dados['name'] ?? '')), 0, 50) ?: null;
        // Foto do Google (se houver), recortada e guardada como as outras
        $foto = null;
        if (!empty($dados['picture']) && str_starts_with($dados['picture'], 'https://')) {
            $bytes = pedido_http($dados['picture'], null, [], 5);
            $foto = $bytes ? recortar_imagem($bytes, 512, 512) : null;
        }
        sql('INSERT INTO utilizadores (nome, nome_exibicao, email, email_verificado, google_id, google_email, cor, foto, foto_versao, criado_em) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)',
            [$nome, $nome_exibicao, $google_email, $google_id, $google_email, random_int(0, 359), $foto, $foto ? time() : 0, agora()]);
        $u = linha('SELECT * FROM utilizadores WHERE id = ?', [bd()->lastInsertId()]);
        $mensagem = 'Conta criada com o Google. Bem-vindo, ' . nome_visivel($u) . '! Podes mudar o teu @nome nas Definições.';
    }
    if ($u['bloqueado']) voltar_com_erro('Esta conta foi bloqueada por um administrador.', false, $voltar);
    iniciar_sessao($u, !empty($pedido['manter']));
    aviso($mensagem);
    ir($voltar);
}

// ---------------------------------------------------------------------
// Passo 1: mandar a pessoa para o Google
// ---------------------------------------------------------------------
$ligar = ($_GET['modo'] ?? '') === 'ligar';
$voltar = $_GET['voltar'] ?? 'index.php';
if (!preg_match('#^[\w./?=&%-]*$#', $voltar) || str_starts_with($voltar, '/')) $voltar = 'index.php';   // só páginas deste site

if (!google_configurado()) voltar_com_erro('O login com o Google ainda não foi configurado (ver o LEIA-ME.md).', $ligar, $voltar);
if ($ligar && !eu()) ir('login.php?voltar=' . urlencode('editar_perfil.php?tab=seguranca'));

$state = bin2hex(random_bytes(32));
$verifier = base64url(random_bytes(32));                          // PKCE: segredo deste pedido
$challenge = base64url(hash('sha256', $verifier, true));          // PKCE: o que o Google recebe
$_SESSION['google'] = [
    'state' => $state, 'verifier' => $verifier, 'modo' => $ligar ? 'ligar' : 'entrar', 'voltar' => $voltar,
    'uid' => $ligar ? (int)eu()['id'] : null, 'criado' => time(), 'manter' => !empty($_GET['manter']),
];
$parametros = [
    'client_id' => GOOGLE_CLIENT_ID,
    'redirect_uri' => redirect_uri(),
    'response_type' => 'code',
    'scope' => 'openid email profile',
    'state' => $state,
    'code_challenge' => $challenge,
    'code_challenge_method' => 'S256',
    'prompt' => 'select_account',   // mostra sempre a lista de contas Google
];
ir(URL_AUTORIZAR . '?' . http_build_query($parametros));
