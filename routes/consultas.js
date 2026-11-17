// =====================================================================
//  TavDex – consultas usadas em várias partes do site
//  (cartões de filmes/séries, cartões de projetos e recomendações)
// =====================================================================
const { linhas } = require('../db');

// Títulos com a média, o número de avaliações (vista vw_titulos_avaliacao)
// e o primeiro género (para o cartaz desenhado quando não há imagem).
const SQL_TITULOS = `SELECT v.*,
    (SELECT g.nome FROM generos g JOIN titulo_generos tg ON tg.genero_id = g.id
      WHERE tg.titulo_id = v.id ORDER BY g.nome LIMIT 1) AS genero1
  FROM vw_titulos_avaliacao v`;

// Projetos com o número de membros da equipa e o @nome do criador
const SQL_PROJETOS = `SELECT p.id, p.titulo, p.sinopse, p.tipo, p.genero, p.estado, p.criado_em, p.dono_id,
    (SELECT COUNT(*) FROM projeto_equipa e WHERE e.projeto_id = p.id) AS membros,
    (SELECT d.nome FROM utilizadores d WHERE d.id = p.dono_id) AS dono_nome
  FROM projetos p`;

// Títulos de uma lista pessoal ('favorito', 'ver' ou 'visto')
function listaDe(utilizadorId, tipo) {
  return linhas(`${SQL_TITULOS} JOIN listas l ON l.titulo_id = v.id
    WHERE l.utilizador_id = ? AND l.tipo = ? ORDER BY l.criado_em DESC`, [utilizadorId, tipo]);
}

// ---------------------------------------------------------------------
// Recomendações personalizadas (Fase 6)
//  1. Géneros que o utilizador avaliou com 4 ou 5 estrelas;
//  2. títulos desses géneros que ainda não avaliou nem marcou como vistos;
//  3. ordenados pelo número de géneros em comum e depois pela média.
//  Se não houver dados suficientes, completa com os mais bem avaliados.
// ---------------------------------------------------------------------
async function recomendacoes(uid, quantos = 12) {
  const n = Math.min(Math.max(1, Math.floor(quantos)), 50);   // número seguro para o LIMIT
  const excluir = `v.id NOT IN (SELECT titulo_id FROM avaliacoes WHERE utilizador_id = ?)
               AND v.id NOT IN (SELECT titulo_id FROM listas WHERE utilizador_id = ? AND tipo = 'visto')`;

  const sugeridos = await linhas(`SELECT * FROM (
      SELECT v.*,
        (SELECT g.nome FROM generos g JOIN titulo_generos tg ON tg.genero_id = g.id
          WHERE tg.titulo_id = v.id ORDER BY g.nome LIMIT 1) AS genero1,
        -- quantos géneros deste título o utilizador avaliou com 4 ou 5 estrelas
        -- ou escolheu como favoritos nas Definições (assim quem ainda tem poucas
        -- avaliações já recebe recomendações à sua medida)
        (SELECT COUNT(*) FROM titulo_generos tg
          WHERE tg.titulo_id = v.id
            AND (tg.genero_id IN (SELECT tg2.genero_id FROM avaliacoes a
                                  JOIN titulo_generos tg2 ON tg2.titulo_id = a.titulo_id
                                  WHERE a.utilizador_id = ? AND a.nota >= 4)
                 OR tg.genero_id IN (SELECT ug.genero_id FROM utilizador_generos ug WHERE ug.utilizador_id = ?))) AS em_comum
      FROM vw_titulos_avaliacao v
      WHERE ${excluir}
    ) x
    WHERE em_comum > 0
    ORDER BY em_comum DESC, media DESC
    LIMIT ${n}`, [uid, uid, uid, uid]);

  if (sugeridos.length >= n) return sugeridos;

  // Completar com os mais bem avaliados que ainda não viu
  const jaTem = sugeridos.map(t => t.id);
  const extra = await linhas(`${SQL_TITULOS} WHERE ${excluir} AND v.media IS NOT NULL
    ORDER BY v.media DESC, v.total_avaliacoes DESC LIMIT ${n + jaTem.length}`, [uid, uid]);
  return sugeridos.concat(extra.filter(t => !jaTem.includes(t.id))).slice(0, n);
}

module.exports = { SQL_TITULOS, SQL_PROJETOS, listaDe, recomendacoes };
