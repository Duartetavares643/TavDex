<?php
// =====================================================================
//  Ações pequenas feitas por formulários POST em várias páginas
//  (seguir, listas, denúncias). Depois de cada ação volta à página anterior.
// =====================================================================
require 'lib.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') ir('index.php');
verificar_csrf();
$u = exigir_login();

switch ($_POST['acao'] ?? '') {

    // Seguir / deixar de seguir um utilizador
    case 'seguir':
        $id = (int)$_POST['id'];
        if ($id === (int)$u['id'] || !valor('SELECT COUNT(*) FROM utilizadores WHERE id = ?', [$id])) break;
        if (valor('SELECT COUNT(*) FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?', [$u['id'], $id])) {
            sql('DELETE FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?', [$u['id'], $id]);
        } else {
            sql('INSERT INTO seguidores (seguidor_id, seguido_id, criado_em) VALUES (?, ?, ?)', [$u['id'], $id, agora()]);
            notificar($id, 'seguidor', $u['nome'] . ' começou a seguir-te.', 'perfil.php?u=' . urlencode($u['nome']));
        }
        break;

    // Passos 39–42 e 44 – Adicionar ou remover um título de uma lista (favoritos, para ver, vistos)
    case 'lista':
        $titulo = (int)$_POST['titulo'];
        $tipo = $_POST['tipo'] ?? '';
        if (!in_array($tipo, ['favorito', 'ver', 'visto'], true) || !valor('SELECT COUNT(*) FROM titulos WHERE id = ?', [$titulo])) break;
        $nomes = ['favorito' => 'Favoritos', 'ver' => 'Para ver', 'visto' => 'Vistos'];
        $existe = valor('SELECT COUNT(*) FROM listas WHERE utilizador_id = ? AND titulo_id = ? AND tipo = ?', [$u['id'], $titulo, $tipo]);
        $remover = ($_POST['modo'] ?? '') === 'remover' || ($existe && ($_POST['modo'] ?? '') !== 'adicionar');
        if ($remover) {
            sql('DELETE FROM listas WHERE utilizador_id = ? AND titulo_id = ? AND tipo = ?', [$u['id'], $titulo, $tipo]);
            aviso('Removido de ' . $nomes[$tipo] . '.');
        } elseif (!$existe) {
            sql('INSERT INTO listas (utilizador_id, titulo_id, tipo, criado_em) VALUES (?, ?, ?, ?)', [$u['id'], $titulo, $tipo, agora()]);
            // Quem marca como visto deixa de o ter em "para ver"
            if ($tipo === 'visto') sql("DELETE FROM listas WHERE utilizador_id = ? AND titulo_id = ? AND tipo = 'ver'", [$u['id'], $titulo]);
            aviso('Adicionado a ' . $nomes[$tipo] . '.');
        }
        break;

    // Denunciar um conteúdo para os administradores analisarem
    case 'denunciar':
        $tipo = $_POST['tipo'] ?? '';
        $alvo = (int)$_POST['alvo'];
        $motivo = in_array($_POST['motivo'] ?? '', ['Spam', 'Ofensivo', 'Spoilers', 'Outro'], true) ? $_POST['motivo'] : 'Outro';
        if (!in_array($tipo, ['publicacao', 'comentario', 'review', 'mensagem'], true)) break;
        if (demasiado('denuncias', 'utilizador_id', (int)$u['id'], 10, 3600)) { aviso('Já enviaste muitas denúncias na última hora. Tenta mais tarde.', 'erro'); break; }
        if (!valor("SELECT COUNT(*) FROM denuncias WHERE utilizador_id = ? AND tipo = ? AND alvo_id = ? AND estado = 'pendente'", [$u['id'], $tipo, $alvo])) {
            sql('INSERT INTO denuncias (utilizador_id, tipo, alvo_id, motivo, criado_em) VALUES (?, ?, ?, ?, ?)', [$u['id'], $tipo, $alvo, $motivo, agora()]);
        }
        aviso('Denúncia enviada. Obrigado por ajudares a manter o TavDex seguro.');
        break;
}

voltar();
