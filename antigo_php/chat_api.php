<?php
// Passo 20 – Chat: pedidos feitos pelo JavaScript (devolve JSON)
//   GET  chat_api.php?com=ID&depois=ID   -> mensagens da conversa
//   POST op=enviar | editar | apagar     -> altera e devolve {ok:true}
require 'lib.php';
header('Content-Type: application/json; charset=utf-8');

$u = eu();
if (!$u) { http_response_code(401); exit(json_encode(['erro' => 'Sessão terminada.'])); }
$uid = (int)$u['id'];

/** Condição SQL para as mensagens de uma conversa (0 = sala geral). */
function conversa(int $com, int $uid): array
{
    if ($com === 0) return ['m.para_id IS NULL', []];
    return ['((m.de_id = ? AND m.para_id = ?) OR (m.de_id = ? AND m.para_id = ?))', [$uid, $com, $com, $uid]];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verificar_csrf();
    $op = $_POST['op'] ?? '';

    if ($op === 'enviar') {
        $texto = mb_substr(trim($_POST['texto'] ?? ''), 0, 1000);
        $com = (int)($_POST['com'] ?? 0);
        if ($texto === '') exit(json_encode(['erro' => 'Mensagem vazia.']));
        if ($com && !valor('SELECT COUNT(*) FROM utilizadores WHERE id = ?', [$com])) exit(json_encode(['erro' => 'Utilizador não existe.']));
        // Anti-spam: no máximo 8 mensagens em 20 segundos e nada de repetir a mesma mensagem
        if (demasiado('mensagens', 'de_id', $uid, 8, 20)) exit(json_encode(['erro' => 'Estás a enviar mensagens depressa demais. Espera um pouco.']));
        $ultima = linha('SELECT texto, criado_em FROM mensagens WHERE de_id = ? ORDER BY id DESC LIMIT 1', [$uid]);
        if ($ultima && $ultima['texto'] === $texto && strtotime($ultima['criado_em']) > time() - 60) exit(json_encode(['erro' => 'Já enviaste esta mensagem.']));
        if (!e_admin() && n_links($texto) > 2) exit(json_encode(['erro' => 'A mensagem tem links a mais.']));
        sql('INSERT INTO mensagens (de_id, para_id, texto, criado_em) VALUES (?, ?, ?, ?)', [$uid, $com ?: null, $texto, agora()]);
        if ($com) {
            // Só cria nova notificação se a anterior desta conversa já tiver sido lida
            $link = 'chat.php?com=' . $uid;
            if (!valor('SELECT COUNT(*) FROM notificacoes WHERE utilizador_id = ? AND link = ? AND lida = 0', [$com, $link])) {
                notificar($com, 'mensagem', $u['nome'] . ' enviou-te uma mensagem.', $link);
            }
        }
        exit(json_encode(['ok' => true]));
    }

    // Editar e apagar: só o autor (o administrador também pode apagar)
    $m = linha('SELECT * FROM mensagens WHERE id = ?', [(int)($_POST['id'] ?? 0)]);
    if (!$m) exit(json_encode(['erro' => 'Mensagem não encontrada.']));
    $autor = (int)$m['de_id'] === $uid;

    if ($op === 'editar' && $autor) {
        $texto = mb_substr(trim($_POST['texto'] ?? ''), 0, 1000);
        if ($texto === '') exit(json_encode(['erro' => 'Mensagem vazia.']));
        sql('UPDATE mensagens SET texto = ?, editada = 1 WHERE id = ?', [$texto, $m['id']]);
        exit(json_encode(['ok' => true]));
    }
    if ($op === 'apagar' && ($autor || e_admin())) {
        sql('DELETE FROM mensagens WHERE id = ?', [$m['id']]);
        exit(json_encode(['ok' => true]));
    }
    http_response_code(403);
    exit(json_encode(['erro' => 'Sem permissão.']));
}

// GET: últimas 100 mensagens da conversa
$com = (int)($_GET['com'] ?? 0);
[$cond, $param] = conversa($com, $uid);
$lista = linhas("SELECT m.id, m.de_id, m.texto, m.editada, m.criado_em, u.nome, u.cor FROM mensagens m JOIN utilizadores u ON u.id = m.de_id
                 WHERE $cond ORDER BY m.id DESC LIMIT 100", $param);
$lista = array_reverse($lista);
foreach ($lista as &$m) {
    $m['hora'] = date('d/m H:i', strtotime($m['criado_em']));
    $m['meu'] = (int)$m['de_id'] === $uid;
    unset($m['criado_em']);
}
echo json_encode(['mensagens' => $lista]);
