// =====================================================================
//  TavDex – utilizadores (Passos 9 e 10)               Base: /api/utilizadores
//  Junta as três partes. A ORDEM CONTA: o perfil público fica no fim, porque
//  GET /:nome apanharia endereços como /disponivel se viesse antes.
//    definicoes.js       a própria conta (Definições, email, palavra-passe, apagar)
//    fotos-e-sessoes.js  foto, imagem do banner e sessões ativas
//    perfil-publico.js   perfil público, pesquisa de utilizadores e seguir
// =====================================================================
const express = require('express');
const perfilPublico = require('./perfil-publico');

const router = express.Router();
router.use(require('./definicoes'));
router.use(require('./fotos-e-sessoes'));
router.use(perfilPublico);

// Usados no server.js: POST /api/seguir/:id e o redirecionamento de /perfil/<@nome antigo>
module.exports = router;
module.exports.seguir = perfilPublico.seguir;
module.exports.nomeNovo = perfilPublico.nomeNovo;
