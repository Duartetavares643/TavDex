// =====================================================================
//  TavDex – comunidade, chat, notificações e denúncias (Fase 4)
//  Endereço base: /api/comunidade
//  Feed:          GET /feed · POST /publicacoes · DELETE /publicacoes/:id
//                 POST /publicacoes/:id/gosto · POST /publicacoes/:id/comentarios
//                 DELETE /comentarios/:id
//  Chat:          GET /chat/conversas · GET /chat/:com · POST /chat/:com
//                 PUT /chat/mensagens/:id · DELETE /chat/mensagens/:id
//  Notificações:  GET /notificacoes · POST /notificacoes/lidas
//                 POST /notificacoes/:id/lida · PUT /notificacoes/silenciadas
//  Denúncias:     POST /denuncias
// =====================================================================
const express = require('express');
const { linha, linhas, executar } = require('../db');
const a = require('./ajudas');
const { exigirLogin } = require('./middleware');

const router = express.Router();
const MAX_ID = 2147483647;

// =====================================================================
// FEED
// =====================================================================
router.get('/feed', async (req, res) => {
  const uid = req.u ? req.u.id : 0;
  const filtros = [];
  const valores = [uid];
  // Separador "A seguir": só publicações de quem eu sigo (e as minhas)
  if (req.query.filtro === 'seguir' && req.u) {
    filtros.push('(p.utilizador_id = ? OR p.utilizador_id IN (SELECT seguido_id FROM seguidores WHERE seguidor_id = ?))');
    valores.push(uid, uid);
  }
  const onde = filtros.length ? ' WHERE ' + filtros.join(' AND ') : '';
  const pg = a.paginacao(req, 10);

  const total = await linha(`SELECT COUNT(*) AS n FROM publicacoes p${onde}`, valores.slice(1));
  const publicacoes = await linhas(`SELECT p.id, p.texto, p.spoiler, p.criado_em,
        u.id AS utilizador_id, u.nome, u.cor, u.papel,
        t.id AS titulo_id, t.nome AS titulo_nome,
        pr.id AS projeto_id, pr.titulo AS projeto_titulo,
        (SELECT COUNT(*) FROM gostos g WHERE g.publicacao_id = p.id) AS gostos,
        EXISTS (SELECT 1 FROM gostos g WHERE g.publicacao_id = p.id AND g.utilizador_id = ?) AS gostei
      FROM publicacoes p
      JOIN utilizadores u ON u.id = p.utilizador_id
      LEFT JOIN titulos t ON t.id = p.titulo_id
      LEFT JOIN projetos pr ON pr.id = p.projeto_id
      ${onde}
      ORDER BY p.criado_em DESC${pg.sql}`, valores);

  // Comentários das publicações desta página (todos de uma vez)
  const ids = publicacoes.map(p => p.id);
  const comentarios = ids.length ? await linhas(`SELECT c.id, c.publicacao_id, c.pai_id, c.texto, c.criado_em,
        u.id AS utilizador_id, u.nome, u.cor
      FROM comentarios c JOIN utilizadores u ON u.id = c.utilizador_id
      WHERE c.publicacao_id IN (${a.marcadores(ids)}) ORDER BY c.criado_em`, ids) : [];
  publicacoes.forEach(p => { p.comentarios = comentarios.filter(c => c.publicacao_id === p.id); });

  res.json({ publicacoes, total: total.n, pagina: pg.pagina, porPagina: pg.porPagina });
});

router.post('/publicacoes', exigirLogin, async (req, res) => {
  const texto = a.texto(req.body.texto, 'Publicação', 1, 1000);
  const tituloId = a.inteiroOuNulo(req.body.titulo_id, 'Filme/série', 1, MAX_ID);
  const projetoId = a.inteiroOuNulo(req.body.projeto_id, 'Projeto', 1, MAX_ID);
  if (tituloId && !(await linha('SELECT id FROM titulos WHERE id = ?', [tituloId]))) a.falha(400, 'Filme/série não encontrado.');
  if (projetoId && !(await linha('SELECT id FROM projetos WHERE id = ?', [projetoId]))) a.falha(400, 'Projeto não encontrado.');
  await a.verificarSpam(req.u, 'publicacoes', 'utilizador_id', 3, 300, texto);
  // Não deixa publicar o mesmo texto duas vezes seguidas
  const ultima = await linha('SELECT texto FROM publicacoes WHERE utilizador_id = ? ORDER BY id DESC LIMIT 1', [req.u.id]);
  if (ultima && ultima.texto === texto) a.falha(400, 'Já publicaste exatamente isso.');

  await executar('INSERT INTO publicacoes (utilizador_id, texto, projeto_id, titulo_id, spoiler) VALUES (?, ?, ?, ?, ?)',
    [req.u.id, texto, projetoId, tituloId, a.booleano(req.body.spoiler) ? 1 : 0]);
  res.status(201).json({ ok: true });
});

router.delete('/publicacoes/:id', exigirLogin, async (req, res) => {
  const id = a.inteiro(req.params.id, 'Publicação', 1, MAX_ID);
  const p = await linha('SELECT utilizador_id FROM publicacoes WHERE id = ?', [id]);
  if (!p) a.falha(404, 'Publicação não encontrada.');
  if (p.utilizador_id !== req.u.id && req.u.papel !== 'admin') a.falha(403, 'Não podes apagar esta publicação.');
  await executar('DELETE FROM publicacoes WHERE id = ?', [id]);
  res.json({ ok: true });
});

router.post('/publicacoes/:id/gosto', exigirLogin, async (req, res) => {
  const id = a.inteiro(req.params.id, 'Publicação', 1, MAX_ID);
  const p = await linha('SELECT id, utilizador_id FROM publicacoes WHERE id = ?', [id]);
  if (!p) a.falha(404, 'Publicação não encontrada.');
  const ja = await linha('SELECT 1 FROM gostos WHERE utilizador_id = ? AND publicacao_id = ?', [req.u.id, id]);
  if (ja) {
    await executar('DELETE FROM gostos WHERE utilizador_id = ? AND publicacao_id = ?', [req.u.id, id]);
  } else {
    await executar('INSERT INTO gostos (utilizador_id, publicacao_id) VALUES (?, ?)', [req.u.id, id]);
    await a.notificar(p.utilizador_id, 'gosto', `${req.u.nome} gostou da tua publicação.`, `comunidade.html#pub${id}`, req.u.id);
  }
  const n = await linha('SELECT COUNT(*) AS n FROM gostos WHERE publicacao_id = ?', [id]);
  res.json({ gostei: !ja, gostos: n.n });
});

router.post('/publicacoes/:id/comentarios', exigirLogin, async (req, res) => {
  const id = a.inteiro(req.params.id, 'Publicação', 1, MAX_ID);
  const p = await linha('SELECT id, utilizador_id FROM publicacoes WHERE id = ?', [id]);
  if (!p) a.falha(404, 'Publicação não encontrada.');
  const texto = a.texto(req.body.texto, 'Comentário', 1, 1000);
  const paiId = a.inteiroOuNulo(req.body.pai_id, 'Resposta', 1, MAX_ID);
  let pai = null;
  if (paiId) {
    pai = await linha('SELECT id, utilizador_id FROM comentarios WHERE id = ? AND publicacao_id = ?', [paiId, id]);
    if (!pai) a.falha(400, 'O comentário a que respondes já não existe.');
  }
  await a.verificarSpam(req.u, 'comentarios', 'utilizador_id', 5, 60, texto);

  await executar('INSERT INTO comentarios (publicacao_id, utilizador_id, pai_id, texto) VALUES (?, ?, ?, ?)', [id, req.u.id, paiId, texto]);
  const link = `comunidade.html#pub${id}`;
  if (pai) await a.notificar(pai.utilizador_id, 'comentario', `${req.u.nome} respondeu ao teu comentário.`, link, req.u.id);
  if (!pai || pai.utilizador_id !== p.utilizador_id) {
    await a.notificar(p.utilizador_id, 'comentario', `${req.u.nome} comentou a tua publicação.`, link, req.u.id);
  }
  res.status(201).json({ ok: true });
});

router.delete('/comentarios/:id', exigirLogin, async (req, res) => {
  const id = a.inteiro(req.params.id, 'Comentário', 1, MAX_ID);
  const c = await linha('SELECT utilizador_id FROM comentarios WHERE id = ?', [id]);
  if (!c) a.falha(404, 'Comentário não encontrado.');
  if (c.utilizador_id !== req.u.id && req.u.papel !== 'admin') a.falha(403, 'Não podes apagar este comentário.');
  await executar('DELETE FROM comentarios WHERE id = ?', [id]);   // as respostas apagam-se em cascata
  res.json({ ok: true });
});

// =====================================================================
// CHAT  ("com" = 'geral' para a sala geral, ou o id do outro utilizador)
// =====================================================================

// Lista de conversas privadas (com a última mensagem de cada uma)
router.get('/chat/conversas', exigirLogin, async (req, res) => {
  const uid = req.u.id;
  const conversas = await linhas(`SELECT u.id, u.nome, u.cor,
        (SELECT m.texto FROM mensagens m
          WHERE (m.de_id = ? AND m.para_id = u.id) OR (m.de_id = u.id AND m.para_id = ?)
          ORDER BY m.id DESC LIMIT 1) AS ultima,
        (SELECT MAX(m.id) FROM mensagens m
          WHERE (m.de_id = ? AND m.para_id = u.id) OR (m.de_id = u.id AND m.para_id = ?)) AS ultima_id
      FROM utilizadores u
      WHERE u.id IN (SELECT para_id FROM mensagens WHERE de_id = ? AND para_id IS NOT NULL
                     UNION SELECT de_id FROM mensagens WHERE para_id = ?)
      ORDER BY ultima_id DESC`, [uid, uid, uid, uid, uid, uid]);
  res.json({ conversas });
});

// Lê o parâmetro "com" e devolve null (sala geral) ou o outro utilizador
async function conversa(req) {
  if (req.params.com === 'geral') return null;
  const id = a.inteiro(req.params.com, 'Conversa', 1, MAX_ID);
  if (id === req.u.id) a.falha(400, 'Não podes falar contigo próprio.');
  const outro = await linha('SELECT id, nome, cor FROM utilizadores WHERE id = ?', [id]);
  if (!outro) a.falha(404, 'Utilizador não encontrado.');
  return outro;
}

// Mensagens de uma conversa (as últimas 100). ?depois=ID devolve só as mais novas.
router.get('/chat/:com', exigirLogin, async (req, res) => {
  const outro = await conversa(req);
  const uid = req.u.id;
  const onde = outro
    ? '((m.de_id = ? AND m.para_id = ?) OR (m.de_id = ? AND m.para_id = ?))'
    : 'm.para_id IS NULL';
  const valores = outro ? [uid, outro.id, outro.id, uid] : [];
  const mensagens = await linhas(`SELECT * FROM (
      SELECT m.id, m.texto, m.editada, m.data_edicao, m.criado_em, u.id AS de_id, u.nome, u.cor
      FROM mensagens m JOIN utilizadores u ON u.id = m.de_id
      WHERE ${onde} ORDER BY m.id DESC LIMIT 100) x ORDER BY id`, valores);
  mensagens.forEach(m => { m.minha = m.de_id === uid; });

  // Abrir a conversa marca como lidas as notificações de mensagens desta pessoa
  if (outro) await executar("UPDATE notificacoes SET lida = 1 WHERE utilizador_id = ? AND tipo = 'mensagem' AND link = ?", [uid, `chat.html?com=${outro.id}`]);
  res.json({ com: outro, mensagens });
});

router.post('/chat/:com', exigirLogin, async (req, res) => {
  const outro = await conversa(req);
  const texto = a.texto(req.body.texto, 'Mensagem', 1, 1000);
  // Anti-spam: no máximo 8 mensagens em 20 segundos e sem repetir a última
  await a.verificarSpam(req.u, 'mensagens', 'de_id', 8, 20, texto);
  const ultima = await linha('SELECT texto FROM mensagens WHERE de_id = ? ORDER BY id DESC LIMIT 1', [req.u.id]);
  if (ultima && ultima.texto === texto && req.u.papel !== 'admin') a.falha(400, 'Não repitas a mesma mensagem.');

  await executar('INSERT INTO mensagens (de_id, para_id, texto) VALUES (?, ?, ?)', [req.u.id, outro ? outro.id : null, texto]);
  if (outro) {
    // Só cria notificação se ainda não houver uma por ler desta conversa
    const link = `chat.html?com=${req.u.id}`;
    const jaAvisado = await linha("SELECT 1 FROM notificacoes WHERE utilizador_id = ? AND tipo = 'mensagem' AND link = ? AND lida = 0", [outro.id, link]);
    if (!jaAvisado) await a.notificar(outro.id, 'mensagem', `${req.u.nome} enviou-te uma mensagem.`, link, req.u.id);
  }
  res.status(201).json({ ok: true });
});

// Só o autor edita; o autor ou um admin apagam
async function obterMensagem(id) {
  const m = await linha('SELECT * FROM mensagens WHERE id = ?', [a.inteiro(id, 'Mensagem', 1, MAX_ID)]);
  if (!m) a.falha(404, 'Mensagem não encontrada.');
  return m;
}

router.put('/chat/mensagens/:id', exigirLogin, async (req, res) => {
  const m = await obterMensagem(req.params.id);
  if (m.de_id !== req.u.id) a.falha(403, 'Só podes editar as tuas mensagens.');
  const texto = a.texto(req.body.texto, 'Mensagem', 1, 1000);
  if (a.nLinks(texto) > 2 && req.u.papel !== 'admin') a.falha(400, 'O texto tem demasiados links (máximo 2).');
  await executar('UPDATE mensagens SET texto = ?, editada = 1, data_edicao = NOW() WHERE id = ?', [texto, m.id]);
  res.json({ ok: true });
});

router.delete('/chat/mensagens/:id', exigirLogin, async (req, res) => {
  const m = await obterMensagem(req.params.id);
  if (m.de_id !== req.u.id && req.u.papel !== 'admin') a.falha(403, 'Só podes apagar as tuas mensagens.');
  await executar('DELETE FROM mensagens WHERE id = ?', [m.id]);
  res.json({ ok: true });
});

// =====================================================================
// NOTIFICAÇÕES
// =====================================================================
const TIPOS_NOTIF = ['seguidor', 'comentario', 'gosto', 'candidatura', 'mensagem', 'projeto', 'sistema'];

router.get('/notificacoes', exigirLogin, async (req, res) => {
  const pg = a.paginacao(req, 20);
  const filtro = TIPOS_NOTIF.includes(req.query.tipo) ? ' AND tipo = ?' : '';
  const valores = filtro ? [req.u.id, req.query.tipo] : [req.u.id];
  const total = await linha(`SELECT COUNT(*) AS n FROM notificacoes WHERE utilizador_id = ?${filtro}`, valores);
  const lista = await linhas(`SELECT id, tipo, texto, link, lida, criado_em FROM notificacoes
    WHERE utilizador_id = ?${filtro} ORDER BY criado_em DESC, id DESC${pg.sql}`, valores);
  const silenciadas = (await linhas('SELECT tipo FROM notif_silenciadas WHERE utilizador_id = ?', [req.u.id])).map(r => r.tipo);
  res.json({ notificacoes: lista, total: total.n, pagina: pg.pagina, porPagina: pg.porPagina, silenciadas, tipos: TIPOS_NOTIF });
});

router.post('/notificacoes/lidas', exigirLogin, async (req, res) => {
  await executar('UPDATE notificacoes SET lida = 1 WHERE utilizador_id = ?', [req.u.id]);
  res.json({ ok: true });
});

router.post('/notificacoes/:id/lida', exigirLogin, async (req, res) => {
  const id = a.inteiro(req.params.id, 'Notificação', 1, MAX_ID);
  await executar('UPDATE notificacoes SET lida = 1 WHERE id = ? AND utilizador_id = ?', [id, req.u.id]);
  res.json({ ok: true });
});

// Guarda os tipos silenciados (substitui a lista toda)
router.put('/notificacoes/silenciadas', exigirLogin, async (req, res) => {
  const tipos = Array.isArray(req.body.tipos) ? req.body.tipos.filter(t => TIPOS_NOTIF.includes(t)) : [];
  await executar('DELETE FROM notif_silenciadas WHERE utilizador_id = ?', [req.u.id]);
  for (const t of new Set(tipos)) await executar('INSERT INTO notif_silenciadas (utilizador_id, tipo) VALUES (?, ?)', [req.u.id, t]);
  res.json({ ok: true, silenciadas: [...new Set(tipos)] });
});

// =====================================================================
// DENÚNCIAS
// =====================================================================
// Tabela de cada tipo de conteúdo que se pode denunciar (nomes fixos, não vêm do utilizador)
const ALVOS = { publicacao: 'publicacoes', comentario: 'comentarios', review: 'avaliacoes', mensagem: 'mensagens' };
const MOTIVOS = ['Spam', 'Ofensivo', 'Spoilers', 'Assédio', 'Conteúdo impróprio', 'Outro'];

router.post('/denuncias', exigirLogin, async (req, res) => {
  const tipo = a.escolha(req.body.tipo, Object.keys(ALVOS), 'Tipo');
  const alvoId = a.inteiro(req.body.alvo_id, 'Conteúdo', 1, MAX_ID);
  const motivo = a.escolha(req.body.motivo, MOTIVOS, 'Motivo');
  if (!(await linha(`SELECT id FROM ${ALVOS[tipo]} WHERE id = ?`, [alvoId]))) a.falha(404, 'Esse conteúdo já não existe.');
  const ja = await linha("SELECT id FROM denuncias WHERE utilizador_id = ? AND tipo = ? AND alvo_id = ? AND estado = 'pendente'", [req.u.id, tipo, alvoId]);
  if (ja) a.falha(400, 'Já denunciaste este conteúdo. Um administrador vai analisá-lo.');
  await a.verificarSpam(req.u, 'denuncias', 'utilizador_id', 10, 3600);

  await executar('INSERT INTO denuncias (utilizador_id, tipo, alvo_id, motivo) VALUES (?, ?, ?, ?)', [req.u.id, tipo, alvoId, motivo]);
  res.status(201).json({ ok: true, mensagem: 'Obrigado. Um administrador vai analisar a denúncia.' });
});

module.exports = router;
module.exports.ALVOS = ALVOS;
module.exports.MOTIVOS = MOTIVOS;
