// =====================================================================
//  TavDex – painel de administração (Fase 4)        Base: /api/admin
//  Todas as rotas são só para administradores (exigirAdmin).
//  GET    /estatisticas
//  GET    /utilizadores?q=&p=
//  PUT    /utilizadores/:id          bloquear/desbloquear, mudar papel
//  GET    /denuncias?estado=
//  PUT    /denuncias/:id             resolver / ignorar
//  DELETE /denuncias/:id/conteudo    apagar o conteúdo denunciado
//  (A gestão de filmes e séries está em routes/titulos.js – Fase 5)
// =====================================================================
const express = require('express');
const { linha, linhas, executar } = require('../db');
const a = require('./ajudas');
const { exigirAdmin } = require('./middleware');
const { ALVOS } = require('./comunidade');

const router = express.Router();
router.use(exigirAdmin);   // protege todas as rotas deste ficheiro
const MAX_ID = 2147483647;

// ---------------------------------------------------------------------
// Estatísticas
// ---------------------------------------------------------------------
router.get('/estatisticas', async (req, res) => {
  const contar = async sql => (await linha(sql)).n;
  const [utilizadores, titulos, avaliacoes, projetos, publicacoes, mensagens, denuncias, bloqueados] = await Promise.all([
    contar('SELECT COUNT(*) AS n FROM utilizadores'),
    contar('SELECT COUNT(*) AS n FROM titulos'),
    contar('SELECT COUNT(*) AS n FROM avaliacoes'),
    contar('SELECT COUNT(*) AS n FROM projetos'),
    contar('SELECT COUNT(*) AS n FROM publicacoes'),
    contar('SELECT COUNT(*) AS n FROM mensagens'),
    contar("SELECT COUNT(*) AS n FROM denuncias WHERE estado = 'pendente'"),
    contar('SELECT COUNT(*) AS n FROM utilizadores WHERE bloqueado = 1'),
  ]);
  // Novos registos nos últimos 6 meses (para o gráfico de barras)
  const porMes = await linhas(`SELECT DATE_FORMAT(criado_em, '%Y-%m') AS mes, COUNT(*) AS n FROM utilizadores
    WHERE criado_em >= DATE_SUB(DATE_FORMAT(NOW(), '%Y-%m-01'), INTERVAL 5 MONTH)
    GROUP BY mes ORDER BY mes`);
  const topTitulos = await linhas(`SELECT id, nome, media, total_avaliacoes FROM vw_titulos_avaliacao
    WHERE total_avaliacoes > 0 ORDER BY total_avaliacoes DESC, media DESC LIMIT 5`);
  res.json({ utilizadores, titulos, avaliacoes, projetos, publicacoes, mensagens, denuncias, bloqueados, porMes, topTitulos });
});

// ---------------------------------------------------------------------
// Utilizadores
// ---------------------------------------------------------------------
router.get('/utilizadores', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 60);
  const onde = q ? ' WHERE nome LIKE ? OR email LIKE ?' : '';
  const valores = q ? [`%${q}%`, `%${q}%`] : [];
  const pg = a.paginacao(req, 25);
  const total = await linha(`SELECT COUNT(*) AS n FROM utilizadores${onde}`, valores);
  const lista = await linhas(`SELECT u.id, u.nome, u.email, u.cor, u.foto_versao, u.papel, u.bloqueado, u.criado_em,
      (SELECT COUNT(*) FROM avaliacoes a WHERE a.utilizador_id = u.id) AS n_avaliacoes
    FROM utilizadores u${onde} ORDER BY u.criado_em DESC${pg.sql}`, valores);
  res.json({ utilizadores: lista, total: total.n, pagina: pg.pagina, porPagina: pg.porPagina });
});

router.put('/utilizadores/:id', async (req, res) => {
  const id = a.inteiro(req.params.id, 'Utilizador', 1, MAX_ID);
  const alvo = await linha('SELECT id, nome, papel, bloqueado FROM utilizadores WHERE id = ?', [id]);
  if (!alvo) a.falha(404, 'Utilizador não encontrado.');
  if (id === req.u.id) a.falha(400, 'Não podes alterar a tua própria conta aqui.');

  if (req.body.bloqueado !== undefined) {
    const bloquear = a.booleano(req.body.bloqueado) ? 1 : 0;
    await executar('UPDATE utilizadores SET bloqueado = ? WHERE id = ?', [bloquear, id]);
    // Bloqueado = perde logo todas as sessões abertas
    if (bloquear) await executar('DELETE FROM sessoes WHERE utilizador_id = ?', [id]);
  }
  if (req.body.papel !== undefined) {
    const papel = a.escolha(req.body.papel, ['utilizador', 'admin'], 'Papel');
    await executar('UPDATE utilizadores SET papel = ? WHERE id = ?', [papel, id]);
    if (papel === 'admin' && alvo.papel !== 'admin') await a.notificar(id, 'sistema', 'Agora és administrador do TavDex.', 'admin.html');
  }
  res.json({ ok: true });
});

// ---------------------------------------------------------------------
// Denúncias
// ---------------------------------------------------------------------

// Texto e autor do conteúdo denunciado (para o admin decidir)
async function conteudoDe(tipo, alvoId) {
  const consultas = {
    publicacao: 'SELECT p.texto, u.nome AS autor, CONCAT(\'comunidade.html#pub\', p.id) AS link FROM publicacoes p JOIN utilizadores u ON u.id = p.utilizador_id WHERE p.id = ?',
    comentario: 'SELECT c.texto, u.nome AS autor, IF(c.projeto_id IS NULL, CONCAT(\'comunidade.html#pub\', c.publicacao_id), CONCAT(\'projeto.html?id=\', c.projeto_id)) AS link FROM comentarios c JOIN utilizadores u ON u.id = c.utilizador_id WHERE c.id = ?',
    review: 'SELECT a.review AS texto, u.nome AS autor, CONCAT(\'titulo.html?id=\', a.titulo_id) AS link FROM avaliacoes a JOIN utilizadores u ON u.id = a.utilizador_id WHERE a.id = ?',
    mensagem: 'SELECT m.texto, u.nome AS autor, \'\' AS link FROM mensagens m JOIN utilizadores u ON u.id = m.de_id WHERE m.id = ?',
  };
  return linha(consultas[tipo], [alvoId]);
}

router.get('/denuncias', async (req, res) => {
  const estado = ['pendente', 'resolvida', 'ignorada'].includes(req.query.estado) ? req.query.estado : 'pendente';
  const lista = await linhas(`SELECT d.id, d.tipo, d.alvo_id, d.motivo, d.estado, d.criado_em, u.nome AS denunciante
    FROM denuncias d JOIN utilizadores u ON u.id = d.utilizador_id
    WHERE d.estado = ? ORDER BY d.criado_em DESC LIMIT 100`, [estado]);
  for (const d of lista) d.conteudo = await conteudoDe(d.tipo, d.alvo_id);   // null = já foi apagado
  res.json({ denuncias: lista });
});

router.put('/denuncias/:id', async (req, res) => {
  const id = a.inteiro(req.params.id, 'Denúncia', 1, MAX_ID);
  const estado = a.escolha(req.body.estado, ['pendente', 'resolvida', 'ignorada'], 'Estado');
  await executar('UPDATE denuncias SET estado = ? WHERE id = ?', [estado, id]);
  res.json({ ok: true });
});

router.delete('/denuncias/:id/conteudo', async (req, res) => {
  const id = a.inteiro(req.params.id, 'Denúncia', 1, MAX_ID);
  const d = await linha('SELECT * FROM denuncias WHERE id = ?', [id]);
  if (!d) a.falha(404, 'Denúncia não encontrada.');
  // O nome da tabela vem da lista fixa ALVOS (nunca do utilizador)
  await executar(`DELETE FROM ${ALVOS[d.tipo]} WHERE id = ?`, [d.alvo_id]);
  // Todas as denúncias sobre o mesmo conteúdo ficam resolvidas
  await executar("UPDATE denuncias SET estado = 'resolvida' WHERE tipo = ? AND alvo_id = ?", [d.tipo, d.alvo_id]);
  res.json({ ok: true });
});

module.exports = router;
