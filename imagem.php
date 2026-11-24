<?php
// =====================================================================
//  TavDex – Foto de perfil e imagem do banner (guardadas na base de dados)
//  imagem.php?u=ID&t=foto|banner&v=VERSAO
//  O ?v= muda sempre que a imagem muda: por isso o browser pode guardar a
//  imagem em cache durante um ano sem nunca mostrar uma antiga.
// =====================================================================
require 'lib.php';

$id = (int)($_GET['u'] ?? 0);
$tipo = ($_GET['t'] ?? '') === 'banner' ? 'banner' : 'foto';   // só estas duas colunas (nunca texto do utilizador no SQL)
$r = linha("SELECT $tipo AS img, {$tipo}_versao AS versao FROM utilizadores WHERE id = ? AND bloqueado = 0", [$id]);

if (!$r || !$r['img']) {
    http_response_code(404);
    exit;
}
header_remove('Pragma');    // a sessão (lib.php) pede "sem cache"; para as imagens não é preciso
header_remove('Expires');
header('Content-Type: image/jpeg');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: ' . ((int)($_GET['v'] ?? 0) === (int)$r['versao'] ? 'public, max-age=31536000, immutable' : 'no-cache'));
echo $r['img'];
