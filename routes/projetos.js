// =====================================================================
//  TavDex – projetos cinematográficos (Fase 3)     Base: /api/projetos
//  GET    /                         lista (pesquisa, filtros, paginação)
//  POST   /                         criar projeto
//  GET    /:id                      página do projeto
//  PUT    /:id                      editar dados (dono ou admin)
//  DELETE /:id                      apagar (dono ou admin)
//  POST   /:id/equipa               juntar membro à equipa
//  DELETE /:id/equipa/:membro       tirar membro
//  POST   /:id/vagas                abrir vaga
//  PUT    /:id/vagas/:vaga          abrir/fechar vaga
//  DELETE /:id/vagas/:vaga          apagar vaga
//  POST   /vagas/:vaga/candidatura  candidatar-me
//  DELETE /vagas/:vaga/candidatura  retirar a candidatura (se pendente)
//  GET    /:id/candidaturas         ver candidaturas (dono ou admin)
//  PUT    /candidaturas/:id         aprovar / rejeitar (dono ou admin)
//  POST   /:id/acompanhar           acompanhar / deixar de acompanhar
//  POST   /:id/comentarios          comentar
//  DELETE /comentarios/:id          apagar comentário
//  PUT    /:id/avaliacao            avaliar (1–5 + texto)
//  DELETE /:id/avaliacao            apagar a minha avaliação
// =====================================================================
const express = require('express');
const { pool, linha, linhas, executar } = require('../db');
const a = require('./ajudas');
const { exigirLogin } = require('./middleware');
const { SQL_PROJETOS } = require('./consultas');

const router = express.Router();
const TIPOS = ['Filme', 'Série', 'Curta-metragem', 'Documentário', 'Videoclipe'];
const ESTADOS = ['Ideia', 'Recrutamento', 'Pré-produção', 'Em produção', 'Concluído'];
const MAX_ID = 2147483647;

// Vai buscar o projeto ou dá erro 404
async function obterProjeto(id) {
  const p = await linha('SELECT * FROM projetos WHERE id = ?', [a.inteiro(id, 'Projeto', 1, MAX_ID)]);
  if (!p) a.falha(404, 'Projeto não encontrado.');
  return p;
}

// Só o dono do projeto ou um administrador podem gerir o projeto
function podeGerir(u, p) {
  return !!u && (u.id === p.dono_id || u.papel === 'admin');
}
// Pára a rota com 403 se o utilizador não puder gerir o projeto
function exigirGerir(u, p) {
  if (!podeGerir(u, p)) a.falha(403, 'Só o dono do projeto pode fazer isto.');
}

// Avisa quem acompanha o projeto (exceto quem fez a ação)
async function avisarSeguidores(p, textoNotif, deId) {
  const seg = await linhas('SELECT utilizador_id FROM projeto_seguidores WHERE projeto_id = ?', [p.id]);
  for (const s of seg) await a.notificar(s.utilizador_id, 'projeto', textoNotif, `projeto.html?id=${p.id}`, deId);
}

// Lê e valida os dados principais do formulário de projeto
function dadosProjeto(body) {
  return {
    titulo: a.texto(body.titulo, 'Título', 2, 100),
    sinopse: a.texto(body.sinopse, 'Sinopse', 10, 2000),
    tipo: a.escolha(body.tipo, TIPOS, 'Tipo'),
    genero: a.texto(body.genero, 'Género', 0, 60),
    estado: a.escolha(body.estado || 'Ideia', ESTADOS, 'Estado'),
  };
}

// ---------------------------------------------------------------------
// Lista de projetos
// ---------------------------------------------------------------------
router.get('/', async (req, res) => {
  const filtros = [];
  const valores = [];
  const q = String(req.query.q || '').trim().slice(0, 60);
  if (q) { filtros.push('(p.titulo LIKE ? OR p.sinopse LIKE ? OR p.genero LIKE ?)'); valores.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (TIPOS.includes(req.query.tipo)) { filtros.push('p.tipo = ?'); valores.push(req.query.tipo); }
  if (ESTADOS.includes(req.query.estado)) { filtros.push('p.estado = ?'); valores.push(req.query.estado); }
  if (req.query.vagas === '1') filtros.push('EXISTS (SELECT 1 FROM projeto_vagas v WHERE v.projeto_id = p.id AND v.aberta = 1)');
  const onde = filtros.length ? ' WHERE ' + filtros.join(' AND ') : '';

  const pg = a.paginacao(req, 12);
  const total = await linha(`SELECT COUNT(*) AS n FROM projetos p${onde}`, valores);
  const projetos = await linhas(`${SQL_PROJETOS}${onde} ORDER BY p.criado_em DESC${pg.sql}`, valores);
  res.json({ projetos, total: total.n, pagina: pg.pagina, porPagina: pg.porPagina, tipos: TIPOS, estados: ESTADOS });
});

// ---------------------------------------------------------------------
// Criar projeto (a equipa e as vagas iniciais vêm no mesmo pedido)
// ---------------------------------------------------------------------
router.post('/', exigirLogin, async (req, res) => {
  const d = dadosProjeto(req.body);
  await a.verificarSpam(req.u, 'projetos', 'dono_id', 3, 3600, d.sinopse);
  const vagas = Array.isArray(req.body.vagas) ? req.body.vagas.slice(0, 20) : [];

  // Transação: ou fica tudo gravado, ou nada
  const ligacao = await pool.getConnection();
  try {
    await ligacao.beginTransaction();
    const [r] = await ligacao.execute('INSERT INTO projetos (dono_id, titulo, sinopse, tipo, genero, estado) VALUES (?, ?, ?, ?, ?, ?)',
      [req.u.id, d.titulo, d.sinopse, d.tipo, d.genero, d.estado]);
    const funcaoDono = a.texto(req.body.minha_funcao || 'Realizador', 'A tua função', 2, 60);
    await ligacao.execute('INSERT INTO projeto_equipa (projeto_id, funcao, utilizador_id) VALUES (?, ?, ?)', [r.insertId, funcaoDono, req.u.id]);
    for (const v of vagas) {
      await ligacao.execute('INSERT INTO projeto_vagas (projeto_id, funcao, descricao) VALUES (?, ?, ?)',
        [r.insertId, a.texto(v.funcao, 'Função da vaga', 2, 60), a.texto(v.descricao, 'Descrição da vaga', 0, 200)]);
    }
    await ligacao.commit();
    res.status(201).json({ id: r.insertId });
  } catch (erro) {
    await ligacao.rollback();
    throw erro;
  } finally {
    ligacao.release();
  }
});

// ---------------------------------------------------------------------
// Página do projeto
// ---------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  const p = await obterProjeto(req.params.id);
  const uid = req.u ? req.u.id : 0;

  const [dono, equipa, vagas, avaliacoes, comentarios, nSeg, acompanho] = await Promise.all([
    linha('SELECT id, nome, cor, papel FROM utilizadores WHERE id = ?', [p.dono_id]),
    linhas(`SELECT e.id, e.funcao, e.nome AS nome_externo, u.id AS utilizador_id, u.nome, u.cor, u.foto_versao
            FROM projeto_equipa e LEFT JOIN utilizadores u ON u.id = e.utilizador_id
            WHERE e.projeto_id = ? ORDER BY e.id`, [p.id]),
    linhas(`SELECT v.*, (SELECT COUNT(*) FROM candidaturas c WHERE c.vaga_id = v.id AND c.estado = 'pendente') AS pendentes,
              (SELECT c.estado FROM candidaturas c WHERE c.vaga_id = v.id AND c.utilizador_id = ?) AS minha_candidatura
            FROM projeto_vagas v WHERE v.projeto_id = ? ORDER BY v.aberta DESC, v.id`, [uid, p.id]),
    linhas(`SELECT pa.id, pa.nota, pa.review, pa.criado_em, u.id AS utilizador_id, u.nome, u.cor, u.foto_versao
            FROM projeto_avaliacoes pa JOIN utilizadores u ON u.id = pa.utilizador_id
            WHERE pa.projeto_id = ? ORDER BY pa.criado_em DESC`, [p.id]),
    linhas(`SELECT c.id, c.texto, c.criado_em, u.id AS utilizador_id, u.nome, u.cor, u.foto_versao
            FROM comentarios c JOIN utilizadores u ON u.id = c.utilizador_id
            WHERE c.projeto_id = ? ORDER BY c.criado_em`, [p.id]),
    linha('SELECT COUNT(*) AS n FROM projeto_seguidores WHERE projeto_id = ?', [p.id]),
    linha('SELECT 1 AS sim FROM projeto_seguidores WHERE projeto_id = ? AND utilizador_id = ?', [p.id, uid]),
  ]);

  const media = avaliacoes.length ? avaliacoes.reduce((s, x) => s + x.nota, 0) / avaliacoes.length : null;
  res.json({
    projeto: p, dono, equipa, vagas, avaliacoes, comentarios,
    media, seguidores: nSeg.n, acompanho: !!acompanho,
    pode_gerir: podeGerir(req.u, p),
    minha_avaliacao: avaliacoes.find(x => x.utilizador_id === uid) || null,
    tipos: TIPOS, estados: ESTADOS,
  });
});

// ---------------------------------------------------------------------
// Editar e apagar
// ---------------------------------------------------------------------
router.put('/:id', exigirLogin, async (req, res) => {
  const p = await obterProjeto(req.params.id);
  exigirGerir(req.u, p);
  const d = dadosProjeto(req.body);
  await executar('UPDATE projetos SET titulo = ?, sinopse = ?, tipo = ?, genero = ?, estado = ? WHERE id = ?',
    [d.titulo, d.sinopse, d.tipo, d.genero, d.estado, p.id]);
  if (d.estado !== p.estado) await avisarSeguidores(p, `O projeto ${d.titulo} passou a "${d.estado}".`, req.u.id);
  res.json({ ok: true });
});

// Apagar o projeto (só o dono ou um admin)
router.delete('/:id', exigirLogin, async (req, res) => {
  const p = await obterProjeto(req.params.id);
  exigirGerir(req.u, p);
  await executar('DELETE FROM projetos WHERE id = ?', [p.id]);   // equipa, vagas, ... apagam-se em cascata
  res.json({ ok: true });
});

// ---------------------------------------------------------------------
// Equipa: membros com conta (pelo @nome) ou só com o nome
// ---------------------------------------------------------------------
router.post('/:id/equipa', exigirLogin, async (req, res) => {
  const p = await obterProjeto(req.params.id);
  exigirGerir(req.u, p);
  const funcao = a.texto(req.body.funcao, 'Função', 2, 60);
  const nome = a.texto(req.body.nome, 'Nome', 2, 60);

  // "@ana_m" = utilizador do TavDex; sem @ = pessoa de fora
  let utilizadorId = null;
  let nomeExterno = nome;
  if (nome.startsWith('@')) {
    const membro = await linha('SELECT id, nome FROM utilizadores WHERE nome = ?', [nome.slice(1)]);
    if (!membro) a.falha(400, `Não existe nenhum utilizador ${nome}.`);
    utilizadorId = membro.id;
    nomeExterno = '';
    await a.notificar(membro.id, 'projeto', `${req.u.nome} juntou-te à equipa de ${p.titulo} (${funcao}).`, `projeto.html?id=${p.id}`, req.u.id);
  }
  await executar('INSERT INTO projeto_equipa (projeto_id, funcao, utilizador_id, nome) VALUES (?, ?, ?, ?)', [p.id, funcao, utilizadorId, nomeExterno]);
  res.status(201).json({ ok: true });
});

// Tirar alguém da equipa
router.delete('/:id/equipa/:membro', exigirLogin, async (req, res) => {
  const p = await obterProjeto(req.params.id);
  exigirGerir(req.u, p);
  const membro = a.inteiro(req.params.membro, 'Membro', 1, MAX_ID);
  await executar('DELETE FROM projeto_equipa WHERE id = ? AND projeto_id = ?', [membro, p.id]);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------
// Vagas
// ---------------------------------------------------------------------
router.post('/:id/vagas', exigirLogin, async (req, res) => {
  const p = await obterProjeto(req.params.id);
  exigirGerir(req.u, p);
  const funcao = a.texto(req.body.funcao, 'Função', 2, 60);
  const descricao = a.texto(req.body.descricao, 'Descrição', 0, 200);
  await executar('INSERT INTO projeto_vagas (projeto_id, funcao, descricao) VALUES (?, ?, ?)', [p.id, funcao, descricao]);
  await avisarSeguidores(p, `Nova vaga em ${p.titulo}: ${funcao}.`, req.u.id);
  res.status(201).json({ ok: true });
});

// Abrir ou fechar uma vaga
router.put('/:id/vagas/:vaga', exigirLogin, async (req, res) => {
  const p = await obterProjeto(req.params.id);
  exigirGerir(req.u, p);
  const vaga = a.inteiro(req.params.vaga, 'Vaga', 1, MAX_ID);
  await executar('UPDATE projeto_vagas SET aberta = ? WHERE id = ? AND projeto_id = ?', [a.booleano(req.body.aberta) ? 1 : 0, vaga, p.id]);
  res.json({ ok: true });
});

// Apagar uma vaga
router.delete('/:id/vagas/:vaga', exigirLogin, async (req, res) => {
  const p = await obterProjeto(req.params.id);
  exigirGerir(req.u, p);
  const vaga = a.inteiro(req.params.vaga, 'Vaga', 1, MAX_ID);
  await executar('DELETE FROM projeto_vagas WHERE id = ? AND projeto_id = ?', [vaga, p.id]);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------
// Candidaturas
// ---------------------------------------------------------------------
async function obterVaga(id) {
  const v = await linha(`SELECT v.*, p.titulo, p.dono_id FROM projeto_vagas v JOIN projetos p ON p.id = v.projeto_id
                         WHERE v.id = ?`, [a.inteiro(id, 'Vaga', 1, MAX_ID)]);
  if (!v) a.falha(404, 'Vaga não encontrada.');
  return v;
}

// Candidatar-me a uma vaga aberta (com uma mensagem para o dono)
router.post('/vagas/:vaga/candidatura', exigirLogin, async (req, res) => {
  const v = await obterVaga(req.params.vaga);
  if (!v.aberta) a.falha(400, 'Esta vaga já fechou.');
  if (v.dono_id === req.u.id) a.falha(400, 'Não te podes candidatar ao teu próprio projeto.');
  const mensagem = a.texto(req.body.mensagem, 'Mensagem', 10, 500);
  await a.verificarSpam(req.u, 'candidaturas', 'utilizador_id', 5, 600, mensagem);
  const ja = await linha('SELECT id FROM candidaturas WHERE vaga_id = ? AND utilizador_id = ?', [v.id, req.u.id]);
  if (ja) a.falha(400, 'Já te candidataste a esta vaga.');

  await executar('INSERT INTO candidaturas (vaga_id, utilizador_id, mensagem) VALUES (?, ?, ?)', [v.id, req.u.id, mensagem]);
  await a.notificar(v.dono_id, 'candidatura', `${req.u.nome} candidatou-se a ${v.funcao} em ${v.titulo}.`, `candidaturas.html?id=${v.projeto_id}`, req.u.id);
  res.status(201).json({ ok: true });
});

// Retirar a minha candidatura (só enquanto está pendente)
router.delete('/vagas/:vaga/candidatura', exigirLogin, async (req, res) => {
  const v = await obterVaga(req.params.vaga);
  const r = await executar("DELETE FROM candidaturas WHERE vaga_id = ? AND utilizador_id = ? AND estado = 'pendente'", [v.id, req.u.id]);
  if (!r.affectedRows) a.falha(400, 'Só podes retirar candidaturas que ainda estão pendentes.');
  await a.notificar(v.dono_id, 'candidatura', `${req.u.nome} retirou a candidatura a ${v.funcao} em ${v.titulo}.`, `candidaturas.html?id=${v.projeto_id}`, req.u.id);
  res.json({ ok: true });
});

// Candidaturas recebidas pelo projeto (só o dono vê)
router.get('/:id/candidaturas', exigirLogin, async (req, res) => {
  const p = await obterProjeto(req.params.id);
  exigirGerir(req.u, p);
  const candidaturas = await linhas(`SELECT c.id, c.mensagem, c.estado, c.criado_em, v.id AS vaga_id, v.funcao, v.aberta,
        u.id AS utilizador_id, u.nome, u.cor, u.foto_versao
      FROM candidaturas c JOIN projeto_vagas v ON v.id = c.vaga_id JOIN utilizadores u ON u.id = c.utilizador_id
      WHERE v.projeto_id = ? ORDER BY c.estado = 'pendente' DESC, c.criado_em DESC`, [p.id]);
  res.json({ projeto: { id: p.id, titulo: p.titulo }, candidaturas });
});

// Aceitar ou rejeitar uma candidatura (quem aceita entra na equipa)
router.put('/candidaturas/:id', exigirLogin, async (req, res) => {
  const id = a.inteiro(req.params.id, 'Candidatura', 1, MAX_ID);
  const estado = a.escolha(req.body.estado, ['aceite', 'rejeitada'], 'Decisão');
  const c = await linha(`SELECT c.*, v.funcao, v.projeto_id, p.titulo, p.dono_id
      FROM candidaturas c JOIN projeto_vagas v ON v.id = c.vaga_id JOIN projetos p ON p.id = v.projeto_id
      WHERE c.id = ?`, [id]);
  if (!c) a.falha(404, 'Candidatura não encontrada.');
  exigirGerir(req.u, { dono_id: c.dono_id });
  if (c.estado !== 'pendente') a.falha(400, 'Esta candidatura já foi decidida.');

  // Aprovar = mudar o estado E juntar à equipa. Numa transação, para não ficar a meio.
  const ligacao = await pool.getConnection();
  try {
    await ligacao.beginTransaction();
    await ligacao.execute('UPDATE candidaturas SET estado = ? WHERE id = ?', [estado, c.id]);
    if (estado === 'aceite') {
      await ligacao.execute('INSERT INTO projeto_equipa (projeto_id, funcao, utilizador_id) VALUES (?, ?, ?)', [c.projeto_id, c.funcao, c.utilizador_id]);
    }
    await ligacao.commit();
  } catch (erro) {
    await ligacao.rollback();
    throw erro;
  } finally {
    ligacao.release();
  }

  const frase = estado === 'aceite' ? `Foste aceite como ${c.funcao} em ${c.titulo}! 🎬` : `A tua candidatura a ${c.funcao} em ${c.titulo} não foi aceite.`;
  await a.notificar(c.utilizador_id, 'candidatura', frase, `projeto.html?id=${c.projeto_id}`, req.u.id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------
// Acompanhar, comentar e avaliar
// ---------------------------------------------------------------------
router.post('/:id/acompanhar', exigirLogin, async (req, res) => {
  const p = await obterProjeto(req.params.id);
  const ja = await linha('SELECT 1 FROM projeto_seguidores WHERE projeto_id = ? AND utilizador_id = ?', [p.id, req.u.id]);
  if (ja) await executar('DELETE FROM projeto_seguidores WHERE projeto_id = ? AND utilizador_id = ?', [p.id, req.u.id]);
  else await executar('INSERT INTO projeto_seguidores (projeto_id, utilizador_id) VALUES (?, ?)', [p.id, req.u.id]);
  res.json({ acompanho: !ja });
});

// Comentar o projeto
router.post('/:id/comentarios', exigirLogin, async (req, res) => {
  const p = await obterProjeto(req.params.id);
  const texto = a.texto(req.body.texto, 'Comentário', 1, 1000);
  await a.verificarSpam(req.u, 'comentarios', 'utilizador_id', 5, 60, texto);
  await executar('INSERT INTO comentarios (projeto_id, utilizador_id, texto) VALUES (?, ?, ?)', [p.id, req.u.id, texto]);
  await a.notificar(p.dono_id, 'comentario', `${req.u.nome} comentou o projeto ${p.titulo}.`, `projeto.html?id=${p.id}`, req.u.id);
  res.status(201).json({ ok: true });
});

// Apagar um comentário do projeto
router.delete('/comentarios/:id', exigirLogin, async (req, res) => {
  const id = a.inteiro(req.params.id, 'Comentário', 1, MAX_ID);
  const c = await linha(`SELECT c.utilizador_id, p.dono_id FROM comentarios c JOIN projetos p ON p.id = c.projeto_id WHERE c.id = ?`, [id]);
  if (!c) a.falha(404, 'Comentário não encontrado.');
  // Pode apagar: o autor, o dono do projeto ou um admin
  if (c.utilizador_id !== req.u.id && c.dono_id !== req.u.id && req.u.papel !== 'admin') a.falha(403, 'Não podes apagar este comentário.');
  await executar('DELETE FROM comentarios WHERE id = ?', [id]);
  res.json({ ok: true });
});

// Avaliar o projeto (1 a 5 estrelas; o dono não pode)
router.put('/:id/avaliacao', exigirLogin, async (req, res) => {
  const p = await obterProjeto(req.params.id);
  if (p.dono_id === req.u.id) a.falha(400, 'Não podes avaliar o teu próprio projeto.');
  const nota = a.inteiro(req.body.nota, 'Classificação', 1, 5);
  const review = a.texto(req.body.review, 'Texto', 0, 1000);
  // INSERT ... ON DUPLICATE KEY UPDATE: cria ou atualiza (só há uma por utilizador)
  await executar(`INSERT INTO projeto_avaliacoes (projeto_id, utilizador_id, nota, review) VALUES (?, ?, ?, ?)
                  ON DUPLICATE KEY UPDATE nota = VALUES(nota), review = VALUES(review)`, [p.id, req.u.id, nota, review]);
  await a.notificar(p.dono_id, 'projeto', `${req.u.nome} avaliou ${p.titulo} com ${nota}★.`, `projeto.html?id=${p.id}`, req.u.id);
  res.json({ ok: true });
});

// Apagar a minha avaliação do projeto
router.delete('/:id/avaliacao', exigirLogin, async (req, res) => {
  const p = await obterProjeto(req.params.id);
  await executar('DELETE FROM projeto_avaliacoes WHERE projeto_id = ? AND utilizador_id = ?', [p.id, req.u.id]);
  res.json({ ok: true });
});

module.exports = router;
