// =====================================================================
//  TavDex – catálogo de filmes e séries (Fase 5)       Base: /api/titulos
//  Junta as duas partes: primeiro a pública, depois a gestão pelo admin.
//    publico.js  catálogo, página inicial, pesquisa e página de um título
//    gestao.js   criar, editar e apagar títulos, géneros, pessoas, plataformas,
//                temporadas e episódios (só administradores)
// =====================================================================
const express = require('express');

const router = express.Router();
router.use(require('./publico'));
router.use(require('./gestao'));

module.exports = router;
